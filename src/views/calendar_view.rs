use chrono::{Local, NaiveDate, Datelike, Duration};
use gpui::*;
use gpui::prelude::{FluentBuilder, StatefulInteractiveElement};
use gpui_component::{Icon, IconName};
use crate::state::CalendarViewMode;

pub struct CalendarView;

impl CalendarView {
    pub fn build(app: &mut crate::app::App, cx: &mut Context<crate::app::App>) -> impl IntoElement {
        let app_entity = cx.entity().downgrade();

        div()
            .flex()
            .flex_col()
            .w_full()
            .h_full()
            .bg(rgb(0xffffff))
            .child(Self::build_toolbar(app, app_entity.clone()))
            .child(Self::build_calendar(app, app_entity.clone()))
            .child(Self::build_timeline(app))
    }

    fn build_toolbar(app: &mut crate::app::App, app_entity: WeakEntity<crate::app::App>) -> impl IntoElement {
        let year = app.state.calendar_year;
        let month = app.state.calendar_month;
        let prev_month_enabled = !(year == 1900 && month == 1);
        let next_month_enabled = !(year == 2100 && month == 12);
        
        let prev_app_entity = app_entity.clone();
        let next_app_entity = app_entity.clone();
        let today_app_entity = app_entity.clone();

        div()
            .flex()
            .items_center()
            .justify_between()
            .w_full()
            .h(px(52.0))
            .px(px(16.0))
            .border_b(px(1.0))
            .border_color(rgba(0x0000000d))
            .child(
                div()
                    .flex()
                    .items_center()
                    .gap(px(4.0))
                    .child(Self::view_toggle(app, CalendarViewMode::Day, "日", app_entity.clone()))
                    .child(Self::view_toggle(app, CalendarViewMode::Week, "周", app_entity.clone()))
                    .child(Self::view_toggle(app, CalendarViewMode::Month, "月", app_entity.clone())),
            )
            .child(
                div()
                    .flex()
                    .items_center()
                    .gap(px(8.0))
                    .child(
                        div()
                            .id("prev-month-btn")
                            .w(px(32.0))
                            .h(px(32.0))
                            .flex()
                            .items_center()
                            .justify_center()
                            .rounded(px(8.0))
                            .cursor_pointer()
                            .when(prev_month_enabled, |this| {
                                this.text_color(rgba(0x007AFFff))
                                    .hover(|style| style.bg(rgba(0x007AFF11)))
                                    .on_click(move |_, _, cx| {
                                        prev_app_entity.update(cx, |this, _| this.state.prev_month()).ok();
                                    })
                            })
                            .when(!prev_month_enabled, |this| {
                                this.text_color(rgba(0xc7c7ccff))
                            })
                            .child(
                                Icon::new(IconName::ChevronLeft)
                                    .text_color(if prev_month_enabled { rgba(0x007AFFff) } else { rgba(0xc7c7ccff) })
                                    .size(px(20.0)),
                            ),
                    )
                    .child(
                        div()
                            .text_size(px(18.0))
                            .font_weight(FontWeight(600.0))
                            .text_color(rgba(0x000000ee))
                            .child(format!("{}年{}月", year, month)),
                    )
                    .child(
                        div()
                            .id("next-month-btn")
                            .w(px(32.0))
                            .h(px(32.0))
                            .flex()
                            .items_center()
                            .justify_center()
                            .rounded(px(8.0))
                            .cursor_pointer()
                            .when(next_month_enabled, |this| {
                                this.text_color(rgba(0x007AFFff))
                                    .hover(|style| style.bg(rgba(0x007AFF11)))
                                    .on_click(move |_, _, cx| {
                                        next_app_entity.update(cx, |this, _| this.state.next_month()).ok();
                                    })
                            })
                            .when(!next_month_enabled, |this| {
                                this.text_color(rgba(0xc7c7ccff))
                            })
                            .child(
                                Icon::new(IconName::ChevronRight)
                                    .text_color(if next_month_enabled { rgba(0x007AFFff) } else { rgba(0xc7c7ccff) })
                                    .size(px(20.0)),
                            ),
                    )
                    .child(
                        div()
                            .id("today-btn")
                            .px(px(12.0))
                            .py(px(6.0))
                            .rounded(px(6.0))
                            .cursor_pointer()
                            .text_size(px(13.0))
                            .font_weight(FontWeight(500.0))
                            .text_color(rgba(0x007AFFff))
                            .hover(|style| style.bg(rgba(0x007AFF11)))
                            .on_click(move |_, _, cx| {
                                today_app_entity.update(cx, |this, _| this.state.go_to_today()).ok();
                            })
                            .child("今天"),
                    ),
            )
            .child(
                div()
                    .flex()
                    .items_center()
                    .w(px(140.0))
                    .h(px(32.0))
                    .bg(rgba(0xf2f2f7ff))
                    .rounded(px(8.0))
                    .border(px(1.0))
                    .border_color(rgba(0x0000000d))
                    .p(px(8.0))
                    .child(
                        Icon::new(IconName::Search)
                            .text_color(rgba(0x8e8e93ff))
                            .size(px(14.0)),
                    )
                    .child(
                        div()
                            .ml(px(6.0))
                            .text_size(px(13.0))
                            .text_color(rgba(0x8e8e93ff))
                            .child("搜索"),
                    ),
            )
    }

    fn view_toggle(app: &mut crate::app::App, mode: CalendarViewMode, label: &str, app_entity: WeakEntity<crate::app::App>) -> impl IntoElement {
        let is_selected = app.state.calendar_view_mode == mode;
        let label_str = label.to_string();

        div()
            .id(format!("view-toggle-{}", mode as u8))
            .flex()
            .items_center()
            .justify_center()
            .w(px(40.0))
            .h(px(28.0))
            .rounded(px(6.0))
            .cursor_pointer()
            .when(is_selected, |this| {
                this.bg(rgba(0x007AFFff))
                    .text_color(rgba(0xffffffff))
            })
            .when(!is_selected, |this| {
                this.bg(rgba(0xf2f2f7ff))
                    .text_color(rgba(0x000000aa))
                    .hover(|style| style.bg(rgba(0xe5e5ea)))
                    .on_click(move |_, _, cx| {
                        app_entity.update(cx, |this, _| this.state.set_calendar_view_mode(mode)).ok();
                    })
            })
            .child(
                div()
                    .text_size(px(13.0))
                    .font_weight(FontWeight(600.0))
                    .child(label_str),
            )
    }

    fn build_calendar(app: &mut crate::app::App, app_entity: WeakEntity<crate::app::App>) -> impl IntoElement {
        let year = app.state.calendar_year;
        let month = app.state.calendar_month;
        
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
            .w_full()
            .h(px(280.0))
            .child(
                div()
                    .flex()
                    .w_full()
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
                    .w_full()
                    .h(px(240.0))
                    .children(days.iter().enumerate().map(move |(index, day)| {
                        Self::day_cell(app, day, year, month, index, app_entity.clone())
                    })),
            )
    }

    fn day_cell(app: &mut crate::app::App, day: &Option<u32>, year: i32, month: u32, index: usize, app_entity: WeakEntity<crate::app::App>) -> impl IntoElement {
        let today = Local::now().date_naive();
        let cell_date = day.map(|d| NaiveDate::from_ymd_opt(year, month, d).unwrap());
        let is_today = cell_date == Some(today);
        let is_selected = cell_date == app.state.selected_date;
        
        let has_reminder = day.is_some() && app.state.has_reminder_on_date(cell_date.unwrap());
        let is_weekend = index % 7 == 5 || index % 7 == 6;

        div()
            .id(format!("day-cell-{}", index))
            .flex_1()
            .h(px(40.0))
            .flex()
            .flex_col()
            .items_center()
            .justify_center()
            .rounded(px(8.0))
            .cursor_pointer()
            .when(is_selected && day.is_some(), |this| {
                this.bg(rgba(0x007AFF11))
            })
            .when(!is_selected && day.is_some(), |this| {
                this.hover(|style| style.bg(rgba(0x00000008)))
                    .on_click(move |_, _, cx| {
                        app_entity.update(cx, |this, _| {
                            this.state.set_selected_date(cell_date);
                        }).ok();
                    })
            })
            .child(
                div()
                    .w(px(32.0))
                    .h(px(32.0))
                    .flex()
                    .flex_col()
                    .items_center()
                    .justify_center()
                    .rounded(px(16.0))
                    .when(is_today && day.is_some(), |this| {
                        this.bg(rgba(0x007AFFff))
                    })
                    .child(
                        div()
                            .text_size(px(14.0))
                            .font_weight(FontWeight(600.0))
                            .text_color(match (day, is_today, is_selected) {
                                (Some(_), true, _) => rgba(0xffffffff),
                                (Some(_), false, true) => rgba(0x007AFFff),
                                (Some(_), false, false) if is_weekend => rgba(0xff3b30ff),
                                (Some(_), false, false) => rgba(0x000000ee),
                                (None, _, _) => rgba(0x00000000),
                            })
                            .when(day.is_some(), |this| {
                                this.child(day.unwrap().to_string())
                            }),
                    )
                    .when(has_reminder && !is_today, |this| {
                        this.child(
                            div()
                                .w(px(4.0))
                                .h(px(4.0))
                                .rounded(px(2.0))
                                .bg(rgba(0x007AFFff))
                                .mt(px(2.0)),
                        )
                    })
                    .when(has_reminder && is_today, |this| {
                        this.child(
                            div()
                                .w(px(4.0))
                                .h(px(4.0))
                                .rounded(px(2.0))
                                .bg(rgba(0xffffffff))
                                .mt(px(2.0)),
                        )
                    }),
            )
    }

    fn build_timeline(app: &mut crate::app::App) -> impl IntoElement {
        let reminders = app.state.get_reminders_for_date(app.state.selected_date);
        let selected_date_str = app.state.selected_date.map(|d| d.format("%m月%d日").to_string()).unwrap_or_default();

        div()
            .flex_1()
            .w_full()
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
                    .child(format!("日程 - {}", selected_date_str)),
            )
            .child(
                div()
                    .flex_1()
                    .flex()
                    .flex_col()
                    .gap(px(8.0))
                    .p(px(12.0))
                    .when(reminders.is_empty(), |this| {
                        this.child(
                            div()
                                .flex()
                                .flex_1()
                                .items_center()
                                .justify_center()
                                .child(
                                    div()
                                        .text_size(px(16.0))
                                        .text_color(rgba(0x8e8e93ff))
                                        .child("当日无日程"),
                                ),
                        )
                    })
                    .when(!reminders.is_empty(), |this| {
                        this.children(reminders.into_iter().map(|reminder| {
                            Self::reminder_event_item(reminder)
                        }))
                    }),
            )
    }

    fn reminder_event_item(reminder: crate::models::reminder::Reminder) -> impl IntoElement {
        let time_str = reminder.due_time
            .map(|t| t.format("%H:%M").to_string())
            .unwrap_or("全天".to_string());

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
                    .bg(match reminder.priority {
                        crate::models::reminder::Priority::High => rgba(0xFF3B30ff),
                        crate::models::reminder::Priority::Medium => rgba(0x007AFFff),
                        crate::models::reminder::Priority::Low => rgba(0x4CD964ff),
                    }),
            )
            .child(
                div()
                    .flex_1()
                    .text_size(px(14.0))
                    .text_color(rgba(0x000000ee))
                    .child(reminder.title),
            )
            .child(
                div()
                    .text_size(px(12.0))
                    .text_color(rgba(0x8e8e93ff))
                    .child(time_str),
            )
    }
}
