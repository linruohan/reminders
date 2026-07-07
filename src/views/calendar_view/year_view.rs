use crate::app::App;
use crate::state::CalendarViewMode;
use chrono::{Datelike, Local, NaiveDate};
use gpui::prelude::FluentBuilder;
use gpui::*;

pub struct YearView;

impl YearView {
    pub fn build(
        year: i32,
        months: Vec<String>,
        month_reminders: Vec<Vec<bool>>,
        app_entity: Entity<App>,
    ) -> impl IntoElement {
        let app_entity_clone = app_entity.clone();

        div()
            .flex()
            .flex_col()
            .w_full()
            .flex_1()
            .child(
                div()
                    .h(px(48.0))
                    .flex()
                    .items_center()
                    .justify_center()
                    .border_b(px(1.0))
                    .border_color(rgba(0x0000000d))
                    .child(
                        div()
                            .text_size(px(20.0))
                            .font_weight(FontWeight(600.0))
                            .text_color(rgba(0x000000ee))
                            .child(format!("{}年", year)),
                    ),
            )
            .child(
                div().flex().flex_wrap().w_full().flex_1().children(
                    months
                        .into_iter()
                        .enumerate()
                        .map(move |(idx, month_name)| {
                            let month_num = idx + 1;
                            let reminders = month_reminders[idx].clone();
                            Self::year_month_cell(
                                month_num,
                                month_name,
                                year,
                                reminders,
                                app_entity_clone.clone(),
                            )
                        }),
                ),
            )
    }

    fn year_month_cell(
        month_num: usize,
        month_name: String,
        year: i32,
        reminders: Vec<bool>,
        app_entity: Entity<App>,
    ) -> impl IntoElement {
        let month_u32 = month_num as u32;
        let is_current_month = year == Local::now().year() && month_u32 == Local::now().month();
        let year_clone = year;
        let month_clone = month_u32;

        div()
            .id(format!("year-month-cell-{}-{}", year, month_num))
            .w(px(150.0))
            .flex_1()
            .flex()
            .flex_col()
            .border(px(1.0))
            .border_color(rgba(0x0000000d))
            .cursor_pointer()
            .when(is_current_month, |this| this.bg(rgba(0x007AFF11)))
            .hover(|style| style.bg(rgba(0x00000008)))
            .on_mouse_down(MouseButton::Left, |_, window, cx| {
                window.prevent_default();
                cx.stop_propagation();
            })
            .on_click(move |_, _, cx| {
                app_entity.update(cx, |this, _| {
                    this.state.calendar_year = year_clone;
                    this.state.calendar_month = month_clone;
                    this.state.set_calendar_view_mode(CalendarViewMode::Month);
                });
            })
            .child(
                div()
                    .h(px(32.0))
                    .flex()
                    .items_center()
                    .justify_center()
                    .border_b(px(1.0))
                    .border_color(rgba(0x0000000d))
                    .child(
                        div()
                            .text_size(px(13.0))
                            .font_weight(FontWeight(600.0))
                            .text_color(rgba(0x000000ee))
                            .child(month_name),
                    ),
            )
            .child(
                div()
                    .flex()
                    .flex_wrap()
                    .flex_1()
                    .p(px(4.0))
                    .children((0..31).map(move |day_idx| {
                        let day = (day_idx + 1) as u32;
                        if let Some(date) = NaiveDate::from_ymd_opt(year, month_u32, day) {
                            let is_today = date == Local::now().date_naive();
                            let is_weekend = date.weekday() == chrono::Weekday::Sat
                                || date.weekday() == chrono::Weekday::Sun;
                            let has_reminder = reminders[day_idx];

                            div()
                                .w(px(20.0))
                                .h(px(20.0))
                                .flex()
                                .items_center()
                                .justify_center()
                                .rounded(px(10.0))
                                .when(is_today, |this| this.bg(rgba(0xff3b30ff)))
                                .child(
                                    div()
                                        .text_size(px(11.0))
                                        .text_color(if is_today {
                                            rgba(0xffffffff)
                                        } else if is_weekend {
                                            rgba(0xff3b30ff)
                                        } else {
                                            rgba(0x000000ee)
                                        })
                                        .child(day.to_string()),
                                )
                                .when(has_reminder && !is_today, |this| {
                                    this.child(
                                        div()
                                            .w(px(3.0))
                                            .h(px(3.0))
                                            .rounded(px(1.5))
                                            .bg(rgba(0x007AFFff))
                                            .absolute()
                                            .bottom(px(2.0))
                                            .right(px(2.0)),
                                    )
                                })
                        } else {
                            div().w(px(20.0)).h(px(20.0))
                        }
                    })),
            )
    }
}
