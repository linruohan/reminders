use chrono::{Local, NaiveDate, Datelike, Duration};
use gpui::*;
use gpui::prelude::{FluentBuilder, InteractiveElement};

pub struct CalendarView;

impl CalendarView {
    pub fn build(_app: &mut crate::app::App) -> impl IntoElement {
        let today = Local::now().date_naive();
        let year = today.year();
        let month = today.month();

        div()
            .flex()
            .flex_col()
            .w(px(800.0))
            .h(px(604.0))
            .bg(rgb(0xffffff))
            .child(Self::build_toolbar(year, month))
            .child(Self::build_calendar(year, month))
            .child(Self::build_timeline())
    }

    fn build_toolbar(year: i32, month: u32) -> impl IntoElement {
        div()
            .flex()
            .items_center()
            .justify_between()
            .w(px(800.0))
            .h(px(52.0))
            .px(px(16.0))
            .border_b(px(1.0))
            .border_color(rgba(0x0000000d))
            .child(
                div()
                    .flex()
                    .items_center()
                    .gap(px(8.0))
                    .child(Self::toolbar_button("◀", true))
                    .child(
                        div()
                            .text_size(px(18.0))
                            .font_weight(FontWeight(600.0))
                            .text_color(rgba(0x000000ee))
                            .child(format!("{}年{}月", year, month)),
                    )
                    .child(Self::toolbar_button("▶", true)),
            )
            .child(
                div()
                    .flex()
                    .items_center()
                    .gap(px(4.0))
                    .child(Self::view_toggle("日", true))
                    .child(Self::view_toggle("周", false))
                    .child(Self::view_toggle("月", false)),
            )
    }

    fn toolbar_button(label: &str, enabled: bool) -> impl IntoElement {
        let label_str = label.to_string();
        div()
            .flex()
            .items_center()
            .justify_center()
            .w(px(32.0))
            .h(px(32.0))
            .rounded(px(8.0))
            .cursor_pointer()
            .when(enabled, |this| {
                this.text_color(rgba(0x007AFFff))
                    .hover(|style| style.bg(rgba(0x007AFF11)))
            })
            .when(!enabled, |this| {
                this.text_color(rgba(0xc7c7ccff))
            })
            .child(
                div()
                    .text_size(px(20.0))
                    .child(label_str),
            )
    }

    fn view_toggle(label: &str, selected: bool) -> impl IntoElement {
        let label_str = label.to_string();
        div()
            .flex()
            .items_center()
            .justify_center()
            .w(px(40.0))
            .h(px(28.0))
            .rounded(px(6.0))
            .cursor_pointer()
            .when(selected, |this| {
                this.bg(rgba(0x007AFFff))
                    .text_color(rgba(0xffffffff))
            })
            .when(!selected, |this| {
                this.bg(rgba(0xf2f2f7ff))
                    .text_color(rgba(0x000000aa))
                    .hover(|style| style.bg(rgba(0xe5e5ea)))
            })
            .child(
                div()
                    .text_size(px(13.0))
                    .font_weight(FontWeight(600.0))
                    .child(label_str),
            )
    }

    fn build_calendar(year: i32, month: u32) -> impl IntoElement {
        let first_day = NaiveDate::from_ymd_opt(year, month, 1).unwrap();
        let next_month_first_day = if month == 12 {
            NaiveDate::from_ymd_opt(year + 1, 1, 1).unwrap()
        } else {
            NaiveDate::from_ymd_opt(year, month + 1, 1).unwrap()
        };
        let last_day = next_month_first_day - Duration::days(1);
        let start_weekday = first_day.weekday().num_days_from_monday() as usize;

        let mut days: Vec<Option<u32>> = vec![None; start_weekday];
        for day in 1..=last_day.day() {
            days.push(Some(day));
        }

        let weekdays = ["一", "二", "三", "四", "五", "六", "日"];

        div()
            .flex()
            .flex_col()
            .w(px(800.0))
            .h(px(280.0))
            .child(
                div()
                    .flex()
                    .w(px(800.0))
                    .h(px(40.0))
                    .children(weekdays.iter().map(|day| {
                        let day_str = day.to_string();
                        div()
                            .flex_1()
                            .flex()
                            .items_center()
                            .justify_center()
                            .text_size(px(12.0))
                            .font_weight(FontWeight(600.0))
                            .text_color(rgba(0x8e8e93ff))
                            .child(day_str)
                    })),
            )
            .child(
                div()
                    .flex()
                    .flex_wrap()
                    .w(px(800.0))
                    .h(px(240.0))
                    .children(days.iter().map(|day| {
                        Self::day_cell(day, year, month)
                    })),
            )
    }

    fn day_cell(day: &Option<u32>, year: i32, month: u32) -> impl IntoElement {
        let today = Local::now().date_naive();
        let is_today = day.map(|d| NaiveDate::from_ymd_opt(year, month, d).unwrap()) == Some(today);

        div()
            .w(px(800.0 / 7.0))
            .h(px(40.0))
            .flex()
            .items_center()
            .justify_center()
            .text_size(px(14.0))
            .text_color(match day {
                Some(_) if is_today => rgba(0x007AFFff),
                Some(_) => rgba(0x000000ee),
                None => rgba(0x00000000),
            })
            .when(is_today && day.is_some(), |this| {
                this.child(
                    div()
                        .w(px(28.0))
                        .h(px(28.0))
                        .rounded(px(14.0))
                        .bg(rgba(0x007AFFff))
                        .flex()
                        .items_center()
                        .justify_center()
                        .child(
                            div()
                                .text_size(px(14.0))
                                .font_weight(FontWeight(600.0))
                                .text_color(rgba(0xffffffff))
                                .child(day.unwrap().to_string()),
                        ),
                )
            })
            .when(!is_today && day.is_some(), |this| {
                this.child(
                    div()
                        .text_size(px(14.0))
                        .child(day.unwrap().to_string()),
                )
            })
    }

    fn build_timeline() -> impl IntoElement {
        div()
            .flex_1()
            .w(px(800.0))
            .bg(rgba(0xf9f9f9ff))
            .flex()
            .flex_col()
            .child(
                div()
                    .flex()
                    .items_center()
                    .p(px(12.0))
                    .text_size(px(14.0))
                    .font_weight(FontWeight(600.0))
                    .text_color(rgba(0x000000ee))
                    .child("日程"),
            )
            .child(
                div()
                    .flex_1()
                    .flex()
                    .flex_col()
                    .gap(px(8.0))
                    .p(px(12.0))
                    .child(
                        div()
                            .flex()
                            .items_center()
                            .gap(px(12.0))
                            .p(px(12.0))
                            .bg(rgba(0xffffff))
                            .rounded(px(8.0))
                            .border(px(1.0))
                            .border_color(rgba(0x0000000d))
                            .child(
                                div()
                                    .w(px(8.0))
                                    .h(px(8.0))
                                    .rounded(px(4.0))
                                    .bg(rgba(0x007AFFff)),
                            )
                            .child(
                                div()
                                    .flex_1()
                                    .text_size(px(14.0))
                                    .text_color(rgba(0x000000ee))
                                    .child("上午会议"),
                            )
                            .child(
                                div()
                                    .text_size(px(12.0))
                                    .text_color(rgba(0x8e8e93ff))
                                    .child("09:00 - 10:30"),
                            ),
                    )
                    .child(
                        div()
                            .flex()
                            .items_center()
                            .gap(px(12.0))
                            .p(px(12.0))
                            .bg(rgba(0xffffff))
                            .rounded(px(8.0))
                            .border(px(1.0))
                            .border_color(rgba(0x0000000d))
                            .child(
                                div()
                                    .w(px(8.0))
                                    .h(px(8.0))
                                    .rounded(px(4.0))
                                    .bg(rgba(0x4CD964ff)),
                            )
                            .child(
                                div()
                                    .flex_1()
                                    .text_size(px(14.0))
                                    .text_color(rgba(0x000000ee))
                                    .child("项目评审"),
                            )
                            .child(
                                div()
                                    .text_size(px(12.0))
                                    .text_color(rgba(0x8e8e93ff))
                                    .child("14:00 - 16:00"),
                            ),
                    ),
            )
    }
}