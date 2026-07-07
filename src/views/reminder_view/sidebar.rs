use crate::app::App;
use crate::models::reminder::ReminderList;
use crate::state::ReminderFilter;
use chrono::Local;
use gpui::prelude::FluentBuilder;
use gpui::*;
use gpui_component::input::{Input, InputState};
use gpui_component::{Icon, IconName};
use std::sync::Arc;

pub struct ReminderSidebar;

impl ReminderSidebar {
    pub fn build(app: &mut App, app_entity: Entity<App>) -> impl IntoElement {
        let lists = app.state.lists.clone();
        let filter = &app.state.reminder_filter;
        let today = Local::now().date_naive();

        let today_count = app
            .state
            .reminders
            .iter()
            .filter(|r| r.due_date.map(|d| d == today).unwrap_or(false) && !r.is_completed)
            .count();
        let planned_count = app
            .state
            .reminders
            .iter()
            .filter(|r| r.due_date.is_some() && !r.is_completed)
            .count();
        let total_count = app
            .state
            .reminders
            .iter()
            .filter(|r| !r.is_completed)
            .count();

        let search_input_state = app.search_input_state.as_ref();

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
                    .gap(px(4.0))
                    .px(px(12.0))
                    .py(px(8.0))
                    .child(Self::quick_item(
                        "今天",
                        IconName::Clock,
                        matches!(filter, ReminderFilter::Today),
                        today_count,
                        app_entity.clone(),
                        ReminderFilter::Today,
                    ))
                    .child(Self::quick_item(
                        "计划",
                        IconName::ListTodo,
                        matches!(filter, ReminderFilter::Planned),
                        planned_count,
                        app_entity.clone(),
                        ReminderFilter::Planned,
                    ))
                    .child(Self::quick_item(
                        "全部",
                        IconName::List,
                        matches!(filter, ReminderFilter::All),
                        total_count,
                        app_entity.clone(),
                        ReminderFilter::All,
                    )),
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
                        let list_count = app
                            .state
                            .reminders
                            .iter()
                            .filter(|r| r.list_id == Some(list.id) && !r.is_completed)
                            .count();
                        Self::list_item(list, is_selected, list_count, app_entity.clone())
                    })),
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
            .flex_1()
            .flex()
            .items_center()
            .justify_between()
            .p(px(10.0))
            .rounded(px(8.0))
            .cursor_pointer()
            .when(selected, |this| this.bg(rgba(0xe8f0feff)))
            .when(!selected, |this| {
                let filter_clone = filter_arc.clone();
                this.hover(|style| style.bg(rgba(0x00000008)))
                    .on_click(move |_, _, cx| {
                        app_entity.update(cx, |this, _| {
                            this.state.set_reminder_filter((*filter_clone).clone());
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
                                .set_reminder_filter(ReminderFilter::List(list_id))
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
