use crate::app::App;
use crate::models::reminder::Reminder;
use crate::views::calendar_view::utils::CalendarUtils;
use chrono::{Local, NaiveDate, Timelike};
use gpui::prelude::FluentBuilder;
use gpui::*;

pub struct WeekView;

impl WeekView {
    pub fn build(
        _week_days: Vec<NaiveDate>,
        times: Vec<String>,
        reminders_by_date: Vec<(NaiveDate, Vec<Reminder>)>,
        app_entity: Entity<App>,
    ) -> impl IntoElement {
        let app_entity_clone = app_entity.clone();

        div()
            .flex()
            .w_full()
            .flex_1()
            .child(
                div()
                    .w(px(80.0))
                    .flex_col()
                    .border_r(px(1.0))
                    .border_color(rgba(0x0000000d))
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
                                    .text_size(px(14.0))
                                    .font_weight(FontWeight(600.0))
                                    .text_color(rgba(0x000000ee))
                                    .child("时间"),
                            ),
                    )
                    .children(times.iter().cloned().map(|time| {
                        div()
                            .h(px(60.0))
                            .border_b(px(1.0))
                            .border_color(rgba(0x0000000d))
                            .flex()
                            .items_start()
                            .justify_center()
                            .pt(px(4.0))
                            .child(
                                div()
                                    .text_size(px(12.0))
                                    .text_color(rgba(0x8e8e93ff))
                                    .child(time),
                            )
                    })),
            )
            .child(
                div()
                    .flex_1()
                    .flex_col()
                    .children(reminders_by_date.into_iter().map(move |(date, reminders)| {
                        let is_today = date == Local::now().date_naive();
                        let app_entity_clone = app_entity_clone.clone();

                        div()
                            .flex_1()
                            .flex_col()
                            .border_r(px(1.0))
                            .border_color(rgba(0x0000000d))
                            .when(is_today, |this| this.bg(rgba(0xff3b3008)))
                            .children((0..24).map(move |hour| {
                                let hour_reminders: Vec<_> = reminders
                                    .iter()
                                    .filter(|r| {
                                        r.due_time.map(|t| t.hour() == hour as u32).unwrap_or(false)
                                    })
                                    .cloned()
                                    .collect();

                                div()
                                    .h(px(60.0))
                                    .border_b(px(1.0))
                                    .border_color(rgba(0x0000000d))
                                    .p(px(4.0))
                                    .children(hour_reminders.into_iter().map(|reminder| {
                                        Self::event_card(app_entity_clone.clone(), reminder)
                                    }))
                            }))
                    })),
            )
    }

    fn event_card(app_entity: Entity<App>, reminder: Reminder) -> impl IntoElement {
        let time_str = reminder
            .due_time
            .map(|t| t.format("%H:%M").to_string())
            .unwrap_or("全天".to_string());
        let reminder_clone = reminder.clone();

        div()
            .id(format!("event-card-{}", reminder.id))
            .flex()
            .items_center()
            .gap(px(8.0))
            .p(px(6.0))
            .bg(CalendarUtils::get_priority_color(&reminder.priority))
            .rounded(px(4.0))
            .cursor_pointer()
            .hover(|style| style.bg(rgba(0x34c759ff)))
            .on_mouse_down(MouseButton::Left, |_, window, cx| {
                window.prevent_default();
                cx.stop_propagation();
            })
            .on_click(move |_, _, cx| {
                app_entity.update(cx, |this, _| {
                    this.state.set_selected_reminder(Some(reminder_clone.id));
                    this.state.toggle_event_modal();
                });
            })
            .child(
                div()
                    .text_size(px(11.0))
                    .font_weight(FontWeight(500.0))
                    .text_color(rgba(0xffffff))
                    .child(time_str),
            )
            .child(
                div()
                    .flex_1()
                    .text_size(px(12.0))
                    .text_color(rgba(0xffffff))
                    .child(reminder.title),
            )
    }
}
