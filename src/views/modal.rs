use crate::app::App;
use crate::models::reminder::Priority;
use gpui::*;
use gpui::prelude::InteractiveElement;
use gpui_component::{Icon, IconName};

pub struct AddReminderModal;
pub struct EventDetailModal;

impl AddReminderModal {
    pub fn build(app: &mut App) -> impl IntoElement {
        div()
            .absolute()
            .top(px(0.0))
            .left(px(0.0))
            .w_full()
            .h_full()
            .bg(rgba(0x00000040))
            .flex()
            .items_center()
            .justify_center()
            .child(
                div()
                    .w(px(400.0))
                    .bg(rgb(0xffffff))
                    .rounded(px(12.0))
                    .shadow(vec![gpui::BoxShadow {
                        color: rgba(0x00000033).into(),
                        offset: gpui::Point { x: px(0.0), y: px(8.0) },
                        blur_radius: px(24.0),
                        spread_radius: px(0.0),
                        inset: false,
                    }])
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
                                    .text_size(px(16.0))
                                    .font_weight(FontWeight(600.0))
                                    .text_color(rgba(0x000000ee))
                                    .child("新建提醒"),
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
                                    .child(
                                        Icon::new(IconName::Close)
                                            .text_color(rgba(0x8e8e93ff))
                                            .size(px(14.0)),
                                    ),
                            ),
                    )
                    .child(
                        div()
                            .p(px(16.0))
                            .flex()
                            .flex_col()
                            .gap(px(12.0))
                            .child(
                                div()
                                    .flex()
                                    .flex_col()
                                    .gap(px(4.0))
                                    .child(
                                        div()
                                            .text_size(px(13.0))
                                            .text_color(rgba(0x8e8e93ff))
                                            .child("标题"),
                                    )
                                    .child(
                                        div()
                                            .w(px(368.0))
                                            .h(px(36.0))
                                            .bg(rgba(0xf2f2f7ff))
                                            .rounded(px(8.0))
                                            .p(px(12.0))
                                            .child(
                                                div()
                                                    .text_size(px(14.0))
                                                    .text_color(rgba(0x000000ee))
                                                    .child("输入提醒标题"),
                                            ),
                                    ),
                            )
                            .child(
                                div()
                                    .flex()
                                    .flex_col()
                                    .gap(px(4.0))
                                    .child(
                                        div()
                                            .text_size(px(13.0))
                                            .text_color(rgba(0x8e8e93ff))
                                            .child("备注"),
                                    )
                                    .child(
                                        div()
                                            .w(px(368.0))
                                            .h(px(80.0))
                                            .bg(rgba(0xf2f2f7ff))
                                            .rounded(px(8.0))
                                            .p(px(12.0))
                                            .child(
                                                div()
                                                    .text_size(px(14.0))
                                                    .text_color(rgba(0x8e8e93ff))
                                                    .child("添加备注（可选）"),
                                            ),
                                    ),
                            )
                            .child(
                                div()
                                    .flex()
                                    .flex_col()
                                    .gap(px(4.0))
                                    .child(
                                        div()
                                            .text_size(px(13.0))
                                            .text_color(rgba(0x8e8e93ff))
                                            .child("日期"),
                                    )
                                    .child(
                                        div()
                                            .w(px(368.0))
                                            .h(px(36.0))
                                            .bg(rgba(0xf2f2f7ff))
                                            .rounded(px(8.0))
                                            .p(px(12.0))
                                            .flex()
                                            .items_center()
                                            .justify_between()
                                            .child(
                                                div()
                                                    .text_size(px(14.0))
                                                    .text_color(rgba(0x8e8e93ff))
                                                    .child("设置日期"),
                                            )
                                            .child(
                                                Icon::new(IconName::Calendar)
                                                    .text_color(rgba(0x8e8e93ff))
                                                    .size(px(16.0)),
                                            ),
                                    ),
                            ),
                    )
                    .child(
                        div()
                            .flex()
                            .items_center()
                            .justify_end()
                            .gap(px(8.0))
                            .px(px(16.0))
                            .py(px(12.0))
                            .border_t(px(1.0))
                            .border_color(rgba(0x0000000d))
                            .child(
                                div()
                                    .px(px(16.0))
                                    .py(px(8.0))
                                    .rounded(px(8.0))
                                    .cursor_pointer()
                                    .text_size(px(14.0))
                                    .font_weight(FontWeight(600.0))
                                    .text_color(rgba(0x007AFFff))
                                    .hover(|style| style.bg(rgba(0x007AFF11)))
                                    .child("取消"),
                            )
                            .child(
                                div()
                                    .px(px(16.0))
                                    .py(px(8.0))
                                    .rounded(px(8.0))
                                    .cursor_pointer()
                                    .text_size(px(14.0))
                                    .font_weight(FontWeight(600.0))
                                    .text_color(rgba(0xffffffff))
                                    .bg(rgba(0x007AFFff))
                                    .hover(|style| style.bg(rgba(0x0066DDff)))
                                    .child("添加"),
                            ),
                    ),
            )
    }
}

impl EventDetailModal {
    pub fn build(app: &mut App, cx: &mut Context<App>) -> impl IntoElement {
        let app_entity = cx.entity().downgrade();
        let reminder = app.state.get_selected_reminder();

        if reminder.is_none() {
            return div().id("empty-event-modal");
        }

        let reminder = reminder.unwrap();
        let time_str = reminder.due_time
            .map(|t| t.format("%H:%M").to_string())
            .unwrap_or("全天".to_string());
        let date_str = reminder.due_date
            .map(|d| d.format("%Y/%m/%d").to_string())
            .unwrap_or("无日期".to_string());
        let title = reminder.title.clone();

        div()
            .id("event-modal-overlay")
            .absolute()
            .top(px(0.0))
            .left(px(0.0))
            .w_full()
            .h_full()
            .bg(rgba(0x00000040))
            .flex()
            .items_center()
            .justify_center()
            .cursor_pointer()
            .on_mouse_down(MouseButton::Left, move |_, window, cx| {
                window.prevent_default();
                cx.stop_propagation();
                app_entity.update(cx, |this, _| {
                    this.state.toggle_event_modal();
                }).ok();
            })
            .child(
                div()
                    .id("event-modal-content")
                    .w(px(360.0))
                    .bg(rgb(0xffffff))
                    .rounded(px(12.0))
                    .shadow(vec![gpui::BoxShadow {
                        color: rgba(0x00000033).into(),
                        offset: gpui::Point { x: px(0.0), y: px(8.0) },
                        blur_radius: px(24.0),
                        spread_radius: px(0.0),
                        inset: false,
                    }])
                    .flex()
                    .flex_col()
                    .cursor_default()
                    .on_mouse_down(MouseButton::Left, |_, window, cx| {
                        window.prevent_default();
                        cx.stop_propagation();
                    })
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
                                        div()
                                            .w(px(8.0))
                                            .h(px(8.0))
                                            .rounded(px(4.0))
                                            .bg(match reminder.priority {
                                                Priority::High => rgba(0xFF3B30ff),
                                                Priority::Medium => rgba(0x007AFFff),
                                                Priority::Low => rgba(0x4CD964ff),
                                            }),
                                    )
                                    .child(
                                        div()
                                            .text_size(px(16.0))
                                            .font_weight(FontWeight(600.0))
                                            .text_color(rgba(0x000000ee))
                                            .child(title),
                                    ),
                            )
                            .child(
                                div()
                                    .flex()
                                    .items_center()
                                    .gap(px(4.0))
                                    .child(
                                        Icon::new(IconName::ChevronDown)
                                            .text_color(rgba(0x8e8e93ff))
                                            .size(px(16.0)),
                                    )
                                    .child(
                                        Icon::new(IconName::Close)
                                            .text_color(rgba(0x8e8e93ff))
                                            .size(px(14.0)),
                                    ),
                            ),
                    )
                    .child(
                        div()
                            .p(px(16.0))
                            .flex()
                            .flex_col()
                            .gap(px(12.0))
                            .child(
                                div()
                                    .flex()
                                    .items_center()
                                    .gap(px(12.0))
                                    .child(
                                        Icon::new(IconName::Clock)
                                            .text_color(rgba(0x8e8e93ff))
                                            .size(px(16.0)),
                                    )
                                    .child(
                                        div()
                                            .flex()
                                            .flex_col()
                                            .child(
                                                div()
                                                    .text_size(px(13.0))
                                                    .text_color(rgba(0x8e8e93ff))
                                                    .child("开始时间"),
                                            )
                                            .child(
                                                div()
                                                    .text_size(px(14.0))
                                                    .font_weight(FontWeight(500.0))
                                                    .text_color(rgba(0x000000ee))
                                                    .child(format!("{} {}", date_str, time_str)),
                                            ),
                                    ),
                            )
                            .child(
                                div()
                                    .flex()
                                    .items_center()
                                    .gap(px(12.0))
                                    .child(
                                        Icon::new(IconName::Repeat)
                                            .text_color(rgba(0x8e8e93ff))
                                            .size(px(16.0)),
                                    )
                                    .child(
                                        div()
                                            .flex()
                                            .flex_col()
                                            .child(
                                                div()
                                                    .text_size(px(13.0))
                                                    .text_color(rgba(0x8e8e93ff))
                                                    .child("重复"),
                                            )
                                            .child(
                                                div()
                                                    .text_size(px(14.0))
                                                    .font_weight(FontWeight(500.0))
                                                    .text_color(rgba(0x000000ee))
                                                    .child("无"),
                                            ),
                                    ),
                            )
                            .child(
                                div()
                                    .flex()
                                    .items_center()
                                    .gap(px(12.0))
                                    .child(
                                        Icon::new(IconName::Bell)
                                            .text_color(rgba(0x8e8e93ff))
                                            .size(px(16.0)),
                                    )
                                    .child(
                                        div()
                                            .flex()
                                            .flex_col()
                                            .child(
                                                div()
                                                    .text_size(px(13.0))
                                                    .text_color(rgba(0x8e8e93ff))
                                                    .child("提醒"),
                                            )
                                            .child(
                                                div()
                                                    .text_size(px(14.0))
                                                    .font_weight(FontWeight(500.0))
                                                    .text_color(rgba(0x000000ee))
                                                    .child("无"),
                                            ),
                                    ),
                            )
                            .child(
                                div()
                                    .flex()
                                    .items_center()
                                    .gap(px(12.0))
                                    .child(
                                        Icon::new(IconName::User)
                                            .text_color(rgba(0x8e8e93ff))
                                            .size(px(16.0)),
                                    )
                                    .child(
                                        div()
                                            .text_size(px(14.0))
                                            .font_weight(FontWeight(500.0))
                                            .text_color(rgba(0x000000ee))
                                            .child("添加受邀人"),
                                    ),
                            )
                            .child(
                                div()
                                    .flex()
                                    .items_center()
                                    .gap(px(12.0))
                                    .child(
                                        Icon::new(IconName::FileText)
                                            .text_color(rgba(0x8e8e93ff))
                                            .size(px(16.0)),
                                    )
                                    .child(
                                        div()
                                            .text_size(px(14.0))
                                            .font_weight(FontWeight(500.0))
                                            .text_color(rgba(0x000000ee))
                                            .child("添加备注、URL或附件"),
                                    ),
                            ),
                    ),
            )
    }
}