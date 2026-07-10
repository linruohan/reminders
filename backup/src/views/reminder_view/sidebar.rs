use crate::app::App;
use crate::models::owner::Owner;
use crate::models::reminder::ReminderList;
use crate::state::ReminderFilter;
use gpui::prelude::{FluentBuilder, InteractiveElement};
use gpui::*;
use gpui_component::input::{Input, InputState};
use gpui_component::{Icon, IconName};
use std::sync::Arc;

pub struct ReminderSidebar;

impl ReminderSidebar {
    pub fn build(app: &mut App, app_entity: Entity<App>) -> impl IntoElement {
        let lists = app.state.lists.clone();
        let owners = app.state.owners.clone();
        let filter = &app.state.reminder_filter;
        let search_input_state = app.search_input_state.as_ref();

        let quick_filters = [
            ("今天", IconName::Clock, ReminderFilter::Today),
            ("计划", IconName::ListTodo, ReminderFilter::Planned),
            ("已逾期", IconName::Clock, ReminderFilter::Overdue),
            ("全部", IconName::List, ReminderFilter::Open),
            ("已完成", IconName::Check, ReminderFilter::Completed),
        ];

        div()
            .w(px(220.0))
            .h_full()
            .bg(rgba(0xf9f9f9ff))
            .border_r(px(1.0))
            .border_color(rgba(0x0000000d))
            .flex()
            .flex_col()
            .child(Self::build_search_bar(search_input_state))
            .child(
                div()
                    .flex()
                    .flex_col()
                    .gap(px(2.0))
                    .px(px(12.0))
                    .py(px(8.0))
                    .children(quick_filters.into_iter().map(|(label, icon, filter_type)| {
                        Self::quick_item(
                            label,
                            icon,
                            filter == &filter_type,
                            app.state.count_for_filter(filter_type.clone()),
                            app_entity.clone(),
                            filter_type,
                        )
                    })),
            )
            .child(
                div()
                    .px(px(16.0))
                    .py(px(4.0))
                    .text_size(px(11.0))
                    .font_weight(FontWeight(600.0))
                    .text_color(rgba(0x8e8e93ff))
                    .child("我的列表"),
            )
            .child(
                div()
                    .flex_1()
                    .overflow_y_hidden()
                    .children(lists.into_iter().map(|list| {
                        let is_selected =
                            matches!(filter, ReminderFilter::List(id) if *id == list.id);
                        let list_count = app.state.count_for_filter(ReminderFilter::List(list.id));
                        Self::list_item(list, is_selected, list_count, app_entity.clone())
                    })),
            )
            .child(
                div().px(px(12.0)).pb(px(4.0)).child(
                    div()
                        .p(px(8.0))
                        .flex()
                        .items_center()
                        .gap(px(8.0))
                        .cursor_pointer()
                        .hover(|style| style.bg(rgba(0x00000008)))
                        .rounded(px(8.0))
                        .on_mouse_down(MouseButton::Left, {
                            let app_entity = app_entity.clone();
                            move |_, _, cx| {
                                app_entity.update(cx, |this, _| {
                                    let name = format!("新列表 {}", this.state.lists.len() + 1);
                                    this.create_list(&name);
                                });
                            }
                        })
                        .child(
                            Icon::new(IconName::Plus)
                                .text_color(rgba(0x007AFFff))
                                .size(px(14.0)),
                        )
                        .child(
                            div()
                                .text_size(px(13.0))
                                .font_weight(FontWeight(500.0))
                                .text_color(rgba(0x007AFFff))
                                .child("添加列表"),
                        ),
                ),
            )
            .child(
                div()
                    .px(px(16.0))
                    .py(px(4.0))
                    .text_size(px(11.0))
                    .font_weight(FontWeight(600.0))
                    .text_color(rgba(0x8e8e93ff))
                    .child("负责人"),
            )
            .child(
                div().max_h(px(120.0)).overflow_y_hidden().children(
                    owners
                        .into_iter()
                        .map(|owner| Self::owner_item(owner, app_entity.clone())),
                ),
            )
            .child(
                div().px(px(12.0)).pb(px(12.0)).child(
                    div()
                        .p(px(8.0))
                        .flex()
                        .items_center()
                        .gap(px(8.0))
                        .cursor_pointer()
                        .hover(|style| style.bg(rgba(0x00000008)))
                        .rounded(px(8.0))
                        .on_mouse_down(MouseButton::Left, {
                            let app_entity = app_entity.clone();
                            move |_, _, cx| {
                                app_entity.update(cx, |this, _| {
                                    let name = format!("负责人 {}", this.state.owners.len() + 1);
                                    this.create_owner(&name);
                                });
                            }
                        })
                        .child(
                            Icon::new(IconName::Plus)
                                .text_color(rgba(0x5856D6ff))
                                .size(px(14.0)),
                        )
                        .child(
                            div()
                                .text_size(px(13.0))
                                .font_weight(FontWeight(500.0))
                                .text_color(rgba(0x5856D6ff))
                                .child("添加负责人"),
                        ),
                ),
            )
    }

    fn build_search_bar(search_input_state: Option<&Entity<InputState>>) -> impl IntoElement {
        div().p(px(12.0)).child(
            div()
                .flex()
                .items_center()
                .w(px(196.0))
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
                .when_some(search_input_state, |this, input_state| {
                    this.child(
                        Input::new(input_state)
                            .appearance(false)
                            .bordered(false)
                            .focus_bordered(false)
                            .w(px(160.0))
                            .h(px(24.0)),
                    )
                }),
        )
    }

    fn quick_item(
        label: &str,
        icon: IconName,
        selected: bool,
        count: usize,
        app_entity: Entity<App>,
        filter: ReminderFilter,
    ) -> impl IntoElement {
        let label_str = label.to_string();
        let id_str = format!("quick-item-{}", label_str);
        let filter_arc = Arc::new(filter);

        div()
            .id(id_str)
            .flex()
            .items_center()
            .justify_between()
            .p(px(10.0))
            .rounded(px(8.0))
            .cursor_pointer()
            .when(selected, |this| this.bg(rgba(0xe8f0feff)))
            .when(!selected, |this| {
                this.hover(|style| style.bg(rgba(0x00000008)))
                    .on_click(move |_, _, cx| {
                        app_entity.update(cx, |this, _| {
                            this.state.set_reminder_filter((*filter_arc).clone());
                        });
                    })
            })
            .child(
                div()
                    .flex()
                    .items_center()
                    .gap(px(8.0))
                    .child(
                        Icon::new(icon)
                            .text_color(if selected {
                                rgba(0x007AFFff)
                            } else {
                                rgba(0x000000cc)
                            })
                            .size(px(16.0)),
                    )
                    .child(
                        div()
                            .text_size(px(13.0))
                            .font_weight(FontWeight(600.0))
                            .text_color(if selected {
                                rgba(0x007AFFff)
                            } else {
                                rgba(0x000000cc)
                            })
                            .child(label_str),
                    ),
            )
            .child(
                div()
                    .text_size(px(13.0))
                    .font_weight(FontWeight(600.0))
                    .text_color(rgba(0x8e8e93ff))
                    .child(count.to_string()),
            )
    }

    fn list_item(
        list: ReminderList,
        selected: bool,
        count: usize,
        app_entity: Entity<App>,
    ) -> impl IntoElement {
        let list_name = list.name.clone();
        let list_color = list.color.clone();
        let list_id = list.id;
        let id_str = format!("list-item-{}", list_id);

        div()
            .id(id_str)
            .flex()
            .items_center()
            .justify_between()
            .px(px(12.0))
            .py(px(10.0))
            .rounded(px(8.0))
            .cursor_pointer()
            .when(selected, |this| this.bg(rgba(0xe8f0feff)))
            .when(!selected, |this| {
                this.hover(|style| style.bg(rgba(0x00000008)))
                    .on_click(move |_, _, cx| {
                        app_entity.update(cx, |this, _| {
                            this.state
                                .set_reminder_filter(ReminderFilter::List(list_id));
                            this.state.set_selected_list(Some(list_id));
                        });
                    })
            })
            .child(
                div()
                    .flex()
                    .items_center()
                    .gap(px(10.0))
                    .child(
                        div()
                            .w(px(16.0))
                            .h(px(16.0))
                            .rounded(px(8.0))
                            .bg(Self::parse_color(&list_color)),
                    )
                    .child(
                        div()
                            .text_size(px(13.0))
                            .font_weight(FontWeight(500.0))
                            .text_color(rgba(0x000000cc))
                            .child(list_name),
                    ),
            )
            .child(
                div()
                    .text_size(px(13.0))
                    .font_weight(FontWeight(600.0))
                    .text_color(rgba(0x8e8e93ff))
                    .child(count.to_string()),
            )
    }

    fn owner_item(owner: Owner, app_entity: Entity<App>) -> impl IntoElement {
        let owner_name = owner.name.clone();
        let owner_color = owner.color.clone();
        let owner_id = owner.id;
        let id_str = format!("owner-item-{}", owner_id);

        div()
            .id(id_str)
            .flex()
            .items_center()
            .justify_between()
            .px(px(12.0))
            .py(px(8.0))
            .rounded(px(8.0))
            .hover(|style| style.bg(rgba(0x00000008)))
            .child(
                div()
                    .flex()
                    .items_center()
                    .gap(px(10.0))
                    .child(
                        div()
                            .w(px(16.0))
                            .h(px(16.0))
                            .rounded(px(8.0))
                            .bg(Self::parse_color(&owner_color))
                            .flex()
                            .items_center()
                            .justify_center()
                            .child(
                                div()
                                    .text_size(px(9.0))
                                    .font_weight(FontWeight(600.0))
                                    .text_color(rgba(0xffffffff))
                                    .child(owner_name.chars().next().unwrap_or('?').to_string()),
                            ),
                    )
                    .child(
                        div()
                            .text_size(px(13.0))
                            .font_weight(FontWeight(500.0))
                            .text_color(rgba(0x000000cc))
                            .child(owner_name),
                    ),
            )
            .child(
                div()
                    .w(px(20.0))
                    .h(px(20.0))
                    .rounded(px(10.0))
                    .cursor_pointer()
                    .flex()
                    .items_center()
                    .justify_center()
                    .hover(|style| style.bg(rgba(0x00000011)))
                    .on_mouse_down(MouseButton::Left, move |_, _, cx| {
                        cx.stop_propagation();
                        app_entity.update(cx, |this, _| {
                            this.delete_owner(owner_id);
                        });
                    })
                    .child(
                        Icon::new(IconName::Close)
                            .size(px(10.0))
                            .text_color(rgba(0x8e8e93ff)),
                    ),
            )
    }

    fn parse_color(color: &str) -> Rgba {
        match color {
            "#007AFF" => rgba(0x007AFFff),
            "#FF3B30" => rgba(0xFF3B30ff),
            "#FF9500" => rgba(0xFF9500ff),
            "#FFCC00" => rgba(0xFFCC00ff),
            "#4CD964" => rgba(0x4CD964ff),
            "#5856D6" => rgba(0x5856D6ff),
            "#FF2D55" => rgba(0xFF2D55ff),
            _ => rgba(0x8E8E93ff),
        }
    }
}
