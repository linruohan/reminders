use crate::app::App;
use crate::repository::ReminderRepository;
use gpui::prelude::FluentBuilder;
use gpui::*;
use gpui_component::{Icon, IconName};

pub struct ReminderDetailPanel;

impl ReminderDetailPanel {
    pub fn build(app: &mut App, app_entity: Entity<App>) -> impl IntoElement + '_ {
        let reminder = app.state.get_selected_reminder();

        if reminder.is_none() {
            return div().id("empty-detail-panel");
        }

        let reminder = reminder.unwrap();
        let title = reminder.title.clone();
        let description = reminder.description.clone().unwrap_or_default();
        let reminder_id = reminder.id;

        let date_str = reminder
            .due_date
            .map(|d| d.format("%m月%d日").to_string())
            .unwrap_or_default();
        let time_str = reminder
            .due_time
            .map(|t| t.format("%H:%M").to_string())
            .unwrap_or_default();

        let list_name = reminder
            .list_id
            .and_then(|id| app.state.lists.iter().find(|l| l.id == id))
            .map(|l| l.name.clone())
            .unwrap_or_else(|| "默认".to_string());

        div()
            .id("reminder-detail-panel")
            .w(px(320.0))
            .h_full()
            .bg(rgb(0xffffff))
            .border_l(px(1.0))
            .border_color(rgba(0x0000000d))
            .flex()
            .flex_col()
            .child(
                div()
                    .flex()
                    .items_center()
                    .justify_between()
                    .px(px(16.0))
                    .py(px(12.0))
                    .border_b(px(1.0))
                    .border_color(rgba(0x0000000d))
                    .child(
                        div()
                            .flex()
                            .items_center()
                            .gap(px(8.0))
                            .child(
                                Icon::new(IconName::Eye)
                                    .text_color(rgba(0x007AFFff))
                                    .size(px(16.0)),
                            )
                            .child(
                                div()
                                    .text_size(px(14.0))
                                    .font_weight(FontWeight(600.0))
                                    .text_color(rgba(0x000000ee))
                                    .child("查看"),
                            ),
                    )
                    .child(
                        div()
                            .w(px(24.0))
                            .h(px(24.0))
                            .flex()
                            .items_center()
                            .justify_center()
                            .rounded(px(12.0))
                            .cursor_pointer()
                            .hover(|style| style.bg(rgba(0x00000011)))
                            .on_mouse_down(MouseButton::Left, {
                                let app_entity = app_entity.clone();
                                move |_, window, cx| {
                                    window.prevent_default();
                                    cx.stop_propagation();
                                    app_entity.update(cx, |this, _| {
                                        this.state.close_detail_panel();
                                    });
                                }
                            })
                            .child(
                                Icon::new(IconName::Close)
                                    .text_color(rgba(0x8e8e93ff))
                                    .size(px(14.0)),
                            ),
                    ),
            )
            .child(
                div()
                    .flex_1()
                    .p(px(16.0))
                    .flex()
                    .flex_col()
                    .child(
                        div()
                            .flex_1()
                            .text_size(px(18.0))
                            .text_color(rgba(0x000000ee))
                            .child(title),
                    )
                    .child(
                        div()
                            .mt(px(8.0))
                            .text_size(px(14.0))
                            .text_color(rgba(0x8e8e93ff))
                            .child(description),
                    )
                    .when(!date_str.is_empty() || !time_str.is_empty(), |this| {
                        let time_text = if date_str.is_empty() {
                            time_str
                        } else if time_str.is_empty() {
                            date_str
                        } else {
                            format!("{} {}", date_str, time_str)
                        };
                        this.child(
                            div()
                                .mt(px(16.0))
                                .flex()
                                .items_center()
                                .gap(px(8.0))
                                .child(
                                    Icon::new(IconName::Clock)
                                        .text_color(rgba(0xff9500ff))
                                        .size(px(14.0)),
                                )
                                .child(
                                    div()
                                        .text_size(px(13.0))
                                        .text_color(rgba(0xff9500ff))
                                        .child(time_text),
                                ),
                        )
                    }),
            )
            .child(
                div()
                    .p(px(16.0))
                    .border_t(px(1.0))
                    .border_color(rgba(0x0000000d))
                    .flex()
                    .items_center()
                    .justify_between()
                    .child(
                        div()
                            .flex()
                            .items_center()
                            .gap(px(8.0))
                            .child(
                                div()
                                    .w(px(16.0))
                                    .h(px(16.0))
                                    .rounded(px(8.0))
                                    .bg(rgba(0x007AFFff)),
                            )
                            .child(
                                div()
                                    .text_size(px(13.0))
                                    .text_color(rgba(0x8e8e93ff))
                                    .child("文字颜色"),
                            ),
                    )
                    .child(
                        div()
                            .flex()
                            .items_center()
                            .gap(px(4.0))
                            .text_size(px(13.0))
                            .text_color(rgba(0x8e8e93ff))
                            .child("所属分类:")
                            .child(list_name),
                    ),
            )
            .child(
                div()
                    .p(px(16.0))
                    .flex()
                    .items_center()
                    .justify_end()
                    .gap(px(8.0))
                    .child(
                        div()
                            .px(px(12.0))
                            .py(px(6.0))
                            .rounded(px(6.0))
                            .border(px(1.0))
                            .border_color(rgba(0xc7c7ccff))
                            .cursor_pointer()
                            .text_size(px(13.0))
                            .font_weight(FontWeight(500.0))
                            .text_color(rgba(0x000000cc))
                            .hover(|style| style.bg(rgba(0x00000008)))
                            .on_mouse_down(MouseButton::Left, {
                                let app_entity = app_entity.clone();
                                move |_, window, cx| {
                                    window.prevent_default();
                                    cx.stop_propagation();
                                    app_entity.update(cx, |this, _| {
                                        let reminder_repo = ReminderRepository::new(this.db.conn());
                                        let _ = reminder_repo.delete(&reminder_id);
                                        this.state.delete_reminder(reminder_id);
                                        this.state.close_detail_panel();
                                    });
                                }
                            })
                            .child("删除"),
                    )
                    .child(
                        div()
                            .px(px(12.0))
                            .py(px(6.0))
                            .rounded(px(6.0))
                            .border(px(1.0))
                            .border_color(rgba(0xc7c7ccff))
                            .cursor_pointer()
                            .text_size(px(13.0))
                            .font_weight(FontWeight(500.0))
                            .text_color(rgba(0x000000cc))
                            .hover(|style| style.bg(rgba(0x00000008)))
                            .on_mouse_down(MouseButton::Left, move |_, window, cx| {
                                window.prevent_default();
                                cx.stop_propagation();
                                app_entity.update(cx, |this, _| {
                                    if let Some(r) = this
                                        .state
                                        .reminders
                                        .iter_mut()
                                        .find(|r| r.id == reminder_id)
                                    {
                                        r.is_completed = true;
                                    }
                                    let reminder_repo = ReminderRepository::new(this.db.conn());
                                    if let Some(r) =
                                        this.state.reminders.iter().find(|r| r.id == reminder_id)
                                    {
                                        let _ = reminder_repo.update(r);
                                    }
                                    this.state.close_detail_panel();
                                });
                            })
                            .child("完成"),
                    )
                    .child(
                        div()
                            .px(px(12.0))
                            .py(px(6.0))
                            .rounded(px(6.0))
                            .border(px(1.0))
                            .border_color(rgba(0xc7c7ccff))
                            .cursor_pointer()
                            .text_size(px(13.0))
                            .font_weight(FontWeight(500.0))
                            .text_color(rgba(0x000000cc))
                            .hover(|style| style.bg(rgba(0x00000008)))
                            .child("编辑"),
                    ),
            )
    }
}
