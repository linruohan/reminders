use crate::app::App;
use crate::models::reminder::Reminder;
use crate::views::calendar_view::utils::CalendarUtils;
use chrono::{Datelike, Local, NaiveDate};
use gpui::prelude::FluentBuilder;
use gpui::*;

pub struct MonthView;

impl MonthView {
    pub fn build(
        days: Vec<Option<NaiveDate>>,
        selected_date: Option<NaiveDate>,
        has_reminder_on_date: Vec<bool>,
        day_reminders: Vec<Vec<Reminder>>,
        app_entity: Entity<App>,
    ) -> impl IntoElement {
        let weekdays = ["一", "二", "三", "四", "五", "六", "日"];
        let app_entity_clone = app_entity.clone();

        div()
            .flex()
            .flex_col()
            .w_full()
            .flex_1()
            .child(
                div()
                    .flex()
                    .w_full()
                    .h(px(40.0))
                    .border_b(px(1.0))
                    .border_color(rgba(0x0000000d))
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
            .child(div().flex().flex_wrap().w_full().flex_1().children(
                days.iter().enumerate().map(move |(index, date)| {
                    let has_reminder = has_reminder_on_date[index];
                    let reminders = if has_reminder {
                        day_reminders[index].clone()
                    } else {
                        vec![]
                    };
                    Self::day_cell(
                        date,
                        index,
                        selected_date,
                        has_reminder,
                        reminders,
                        app_entity_clone.clone(),
                    )
                }),
            ))
    }

    fn day_cell(
        date: &Option<NaiveDate>,
        index: usize,
        selected_date: Option<NaiveDate>,
        has_reminder: bool,
        reminders: Vec<Reminder>,
        app_entity: Entity<App>,
    ) -> impl IntoElement {
        let today = Local::now().date_naive();
        let is_today = date == &Some(today);
        let is_selected = date == &selected_date;
        let is_weekend = index % 7 == 5 || index % 7 == 6;
        let is_empty = date.is_none();

        let date_for_click = *date;

        div()
            .id(format!("day-cell-{}", index))
            .flex_1()
            .h(px(60.0))
            .flex()
            .flex_col()
            .items_center()
            .justify_start()
            .pt(px(4.0))
            .rounded(px(8.0))
            .border_r(px(1.0))
            .border_color(rgba(0x0000000d))
            .cursor_pointer()
            .when(is_empty, |this| this.opacity(0.0))
            .when(is_selected && !is_empty, |this| this.bg(rgba(0x007AFF11)))
            .when(!is_selected && !is_empty, |this| {
                this.hover(|style| style.bg(rgba(0x00000008)))
                    .on_click(move |_, _, cx| {
                        app_entity
                            .update(cx, |this, _| this.state.set_selected_date(date_for_click));
                    })
            })
            .child(
                div()
                    .w(px(28.0))
                    .h(px(28.0))
                    .flex()
                    .flex_col()
                    .items_center()
                    .justify_center()
                    .rounded(px(14.0))
                    .when(is_today && !is_empty, |this| this.bg(rgba(0xff3b30ff)))
                    .child(
                        div()
                            .text_size(px(13.0))
                            .font_weight(FontWeight(600.0))
                            .text_color(CalendarUtils::get_day_text_color(
                                date,
                                is_today,
                                is_selected,
                                is_weekend,
                            ))
                            .when(!is_empty, |this| {
                                this.child(date.unwrap().day().to_string())
                            }),
                    )
                    .when(has_reminder && !is_today && !is_empty, |this| {
                        this.child(
                            div()
                                .w(px(4.0))
                                .h(px(4.0))
                                .rounded(px(2.0))
                                .bg(rgba(0x007AFFff))
                                .mt(px(2.0)),
                        )
                    })
                    .when(has_reminder && is_today && !is_empty, |this| {
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
            .when(!is_empty && !reminders.is_empty(), |this| {
                this.child(
                    div()
                        .flex()
                        .flex_col()
                        .gap(px(2.0))
                        .mt(px(4.0))
                        .children(reminders.into_iter().take(3).map(Self::mini_event_card)),
                )
            })
    }

    fn mini_event_card(reminder: Reminder) -> impl IntoElement {
        div()
            .w_full()
            .h(px(14.0))
            .bg(CalendarUtils::get_priority_color(&reminder.priority))
            .rounded(px(2.0))
    }
}
