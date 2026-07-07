use crate::app::App;
use crate::models::reminder::Reminder;
use crate::repository::ReminderRepository;
use crate::state::ReminderFilter;
use chrono::{Local, NaiveDate};
use gpui::prelude::FluentBuilder;
use gpui::*;
use gpui_component::{Icon, IconName};

pub struct ReminderContent;

impl ReminderContent {
    pub fn build(app: &mut App, app_entity: Entity<App>) -> impl IntoElement + '_ {
        let reminders = app.state.get_filtered_reminders();
        let filter = app.state.reminder_filter;
        let show_detail = app.state.show_detail_panel;

        let title = match filter {
            ReminderFilter::Today => "今天".to_string(),
            ReminderFilter::Planned => "计划".to_string(),
            ReminderFilter::All => "全部".to_string(),
            ReminderFilter::List(id) => app
                .state
                .lists
                .iter()
                .find(|l| l.id == id)
                .map(|l| l.name.clone())
                .unwrap_or_else(|| "提醒事项".to_string()),
        };

        let count = reminders.len();

        div()
            .flex_1()
            .h_full()
            .flex()
            .child(
                div()
                    .flex_1()
                    .h_full()
                    .flex()
                    .flex_col()
                    .child(
                        div()
                            .flex()
                            .items_center()
                            .justify_between()
                            .px(px(24.0))
                            .py(px(20.0))
                            .border_b(px(1.0))
                            .border_color(rgba(0x0000000d))
                            .child(
                                div()
                                    .text_size(px(24.0))
                                    .font_weight(FontWeight(700.0))
                                    .text_color(rgba(0x007AFFff))
                                    .child(title),
                            )
                            .child(
                                div()
                                    .flex()
                                    .items_center()
                                    .gap(px(16.0))
                                    .child(
                                        div()
                                            .text_size(px(18.0))
                                            .font_weight(FontWeight(600.0))
                                            .text_color(rgba(0x8e8e93ff))
                                            .child(count.to_string()),
                                    )
                                    .child(
                                        div()
                                            .w(px(28.0))
                                            .h(px(28.0))
                                            .rounded(px(14.0))
                                            .cursor_pointer()
                                            .hover(|style| style.bg(rgba(0x007AFF11)))
                                            .flex()
                                            .items_center()
                                            .justify_center()
                                            .child(
                                                Icon::new(IconName::Plus)
                                                    .text_color(rgba(0x007AFFff))
                                                    .size(px(16.0)),
                                            ),
                                    ),
                            ),
                    )
                    .child(
                        div()
                            .flex_1()
                            .overflow_y_hidden()
                            .when(reminders.is_empty(), |this| {
                                this.child(
                                    div().flex().flex_1().items_center().justify_center().child(
                                        div()
                                            .text_size(px(16.0))
                                            .text_color(rgba(0x8e8e93ff))
                                            .child("没有提醒事项"),
                                    ),
                                )
                            })
                            .when(!reminders.is_empty(), |this| {
                                this.children(reminders.into_iter().map(|reminder| {
                                    Self::reminder_item(app, reminder, app_entity.clone())
                                }))
                            }),
                    ),
            )
            .when(show_detail, |this| {
                this.child(
                    crate::views::reminder_view::detail_panel::ReminderDetailPanel::build(
                        app,
                        app_entity.clone(),
                    ),
                )
            })
    }

    fn reminder_item(app: &App, reminder: Reminder, app_entity: Entity<App>) -> impl IntoElement {
        let due_date = reminder.due_date;
        let reminder_id = reminder.id;
        let is_completed = reminder.is_completed;
        let checkbox_id = format!("checkbox-{}", reminder_id);
        let item_id = format!("reminder-item-{}", reminder_id);
        let is_selected = app.state.selected_reminder_id == Some(reminder_id);

        div()
            .id(item_id)
            .px(px(24.0))
            .py(px(12.0))
            .border_b(px(1.0))
            .border_color(rgba(0x00000008))
            .flex()
            .items_center()
            .gap(px(16.0))
            .cursor_pointer()
            .hover(|style| style.bg(rgba(0x00000004)))
            .when(is_selected, |this| this.bg(rgba(0xe8f0feff)))
            .on_click({
                let app_entity = app_entity.clone();
                move |_, _, cx| {
                    app_entity.update(cx, |this, _| {
                        this.state.set_selected_reminder(Some(reminder_id));
                    });
                }
            })
            .child(
                div()
                    .id(checkbox_id)
                    .w(px(18.0))
                    .h(px(18.0))
                    .rounded(px(9.0))
                    .border(px(2.0))
                    .border_color(if is_completed {
                        rgba(0x007AFFff)
                    } else {
                        rgba(0xc7c7ccff)
                    })
                    .cursor_pointer()
                    .hover(|style| style.border_color(rgba(0x007AFFff)))
                    .when(is_completed, |this| {
                        this.bg(rgba(0x007AFFff)).child(
                            Icon::new(IconName::Check)
                                .text_color(rgba(0xffffffff))
                                .size(px(12.0)),
                        )
                    })
                    .on_mouse_down(MouseButton::Left, |_, window, cx| {
                        window.prevent_default();
                        cx.stop_propagation();
                    })
                    .on_click(move |_, _, cx| {
                        app_entity.update(cx, |this, _| {
                            if let Some(r) = this
                                .state
                                .reminders
                                .iter_mut()
                                .find(|r| r.id == reminder_id)
                            {
                                r.is_completed = !r.is_completed;
                            }
                            let reminder_repo = ReminderRepository::new(this.db.conn());
                            if let Some(r) =
                                this.state.reminders.iter().find(|r| r.id == reminder_id)
                            {
                                let _ = reminder_repo.update(r);
                            }
                        });
                    }),
            )
            .child(
                div()
                    .flex_1()
                    .text_size(px(15.0))
                    .text_color(if is_completed {
                        rgba(0x8e8e93ff)
                    } else {
                        rgba(0x000000dd)
                    })
                    .when(is_completed, |this| this.text_decoration_0())
                    .child(reminder.title),
            )
            .when(due_date.is_some(), |this| {
                this.child(
                    div()
                        .text_size(px(12.0))
                        .font_weight(FontWeight(500.0))
                        .text_color(Self::get_due_date_color(&due_date))
                        .child(Self::format_due_date(&due_date)),
                )
            })
    }

    fn format_due_date(date: &Option<NaiveDate>) -> String {
        match date {
            Some(d) => {
                let today = Local::now().date_naive();
                let tomorrow = today.succ_opt().unwrap();

                if *d == today {
                    "今天".to_string()
                } else if *d == tomorrow {
                    "明天".to_string()
                } else {
                    d.format("%m月%d日").to_string()
                }
            }
            None => String::new(),
        }
    }

    fn get_due_date_color(date: &Option<NaiveDate>) -> Rgba {
        match date {
            Some(d) => {
                let today = Local::now().date_naive();
                if *d < today {
                    rgba(0xFF3B30ff)
                } else {
                    rgba(0xff9500ff)
                }
            }
            None => rgba(0x8e8e93ff),
        }
    }
}
