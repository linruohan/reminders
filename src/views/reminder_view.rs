use crate::models::reminder::{Reminder, ReminderList};
use crate::app::App;
use chrono::{Local, NaiveDate};
use gpui::*;
use gpui::prelude::{FluentBuilder, InteractiveElement};

pub struct ReminderView;

impl ReminderView {
    pub fn build(app: &mut App) -> impl IntoElement {
        div()
            .flex()
            .w(px(800.0))
            .h(px(604.0))
            .bg(rgb(0xffffff))
            .child(Self::build_sidebar(app))
            .child(Self::build_content_area(app))
    }

    fn build_sidebar(app: &mut App) -> impl IntoElement {
        let lists = app.state.lists.clone();
        let selected_list_id = app.state.selected_list_id;
        let total_reminders = app.state.reminders.len();
        let today_count = app.state.reminders.iter()
            .filter(|r| r.due_date.map(|d| d == Local::now().date_naive()).unwrap_or(false))
            .count();
        let planned_count = app.state.reminders.iter()
            .filter(|r| r.due_date.is_some())
            .count();
        
        div()
            .w(px(220.0))
            .h(px(604.0))
            .bg(rgba(0xf9f9f9ff))
            .border_r(px(1.0))
            .border_color(rgba(0x0000000d))
            .flex()
            .flex_col()
            .child(Self::build_search_bar())
            .child(
                div()
                    .flex()
                    .gap(px(8.0))
                    .px(px(12.0))
                    .py(px(8.0))
                    .child(Self::quick_item("今天", "📅", "#007AFF", true, today_count))
                    .child(Self::quick_item("计划", "📋", "#FF9500", false, planned_count)),
            )
            .child(
                div()
                    .px(px(12.0))
                    .pb(px(8.0))
                    .child(Self::quick_item("全部", "📝", "#8E8E93", false, total_reminders)),
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
                    .overflow_hidden()
                    .children(lists.into_iter().map(|list| {
                        let is_selected = selected_list_id == Some(list.id);
                        let list_count = app.state.reminders.iter()
                            .filter(|r| r.list_id == Some(list.id))
                            .count();
                        Self::list_item(list, is_selected, list_count)
                    })),
            )
            .child(
                div()
                    .px(px(12.0))
                    .pb(px(12.0))
                    .child(
                        div()
                            .p(px(8.0))
                            .flex()
                            .items_center()
                            .gap(px(8.0))
                            .cursor_pointer()
                            .hover(|style| style.bg(rgba(0x00000008)))
                            .rounded(px(8.0))
                            .child(
                                svg()
                                    .path("M12 4v16m8-8H4")
                                    .text_color(rgba(0x007AFFff))
                                    .w(px(14.0))
                                    .h(px(14.0)),
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

    fn build_search_bar() -> impl IntoElement {
        div()
            .p(px(12.0))
            .child(
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
                        svg()
                            .path("M11 19a8 8 0 110-16 8 8 0 010 16zm-7 4h14a3 3 0 003-3V8a3 3 0 00-3-3H4a3 3 0 00-3 3v12a3 3 0 003 3z")
                            .text_color(rgba(0x8e8e93ff))
                            .w(px(14.0))
                            .h(px(14.0)),
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

    fn quick_item(label: &str, icon: &str, color: &str, selected: bool, count: usize) -> impl IntoElement {
        let label_str = label.to_string();
        let icon_str = icon.to_string();
        
        div()
            .flex_1()
            .flex()
            .items_center()
            .justify_between()
            .p(px(10.0))
            .rounded(px(8.0))
            .cursor_pointer()
            .when(selected, |this| {
                this.bg(rgba(0xe8f0feff))
            })
            .when(!selected, |this| {
                this.hover(|style| style.bg(rgba(0x00000008)))
            })
            .child(
                div()
                    .flex()
                    .items_center()
                    .gap(px(8.0))
                    .child(
                        div()
                            .text_size(px(16.0))
                            .child(icon_str),
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

    fn list_item(list: ReminderList, selected: bool, count: usize) -> impl IntoElement {
        let list_name = list.name.clone();
        let list_color = list.color.clone();
        
        div()
            .flex()
            .items_center()
            .justify_between()
            .px(px(12.0))
            .py(px(10.0))
            .rounded(px(8.0))
            .cursor_pointer()
            .when(selected, |this| {
                this.bg(rgba(0xe8f0feff))
            })
            .when(!selected, |this| {
                this.hover(|style| style.bg(rgba(0x00000008)))
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

    fn build_content_area(app: &mut App) -> impl IntoElement {
        let reminders = app.state.get_filtered_reminders();
        let lists = app.state.lists.clone();
        let selected_list_id = app.state.selected_list_id;

        let current_list = lists.iter()
            .find(|l| Some(l.id) == selected_list_id)
            .cloned()
            .unwrap_or_else(|| ReminderList::new("提醒事项".to_string()));

        let count = reminders.len();

        div()
            .flex_1()
            .h(px(604.0))
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
                            .child(current_list.name),
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
                                        svg()
                                            .path("M12 4v16m8-8H4")
                                            .text_color(rgba(0x007AFFff))
                                            .w(px(16.0))
                                            .h(px(16.0)),
                                    ),
                            ),
                    ),
            )
            .child(
                div()
                    .flex_1()
                    .overflow_hidden()
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
                                        .child("没有提醒事项"),
                                ),
                        )
                    })
                    .when(!reminders.is_empty(), |this| {
                        this.children(reminders.into_iter().map(|reminder| {
                            Self::reminder_item(reminder)
                        }))
                    }),
            )
    }

    fn reminder_item(reminder: Reminder) -> impl IntoElement {
        let due_date = reminder.due_date;
        div()
            .px(px(24.0))
            .py(px(12.0))
            .border_b(px(1.0))
            .border_color(rgba(0x00000008))
            .flex()
            .items_center()
            .gap(px(16.0))
            .hover(|style| style.bg(rgba(0x00000004)))
            .child(
                div()
                    .w(px(18.0))
                    .h(px(18.0))
                    .rounded(px(9.0))
                    .border(px(2.0))
                    .border_color(rgba(0xc7c7ccff))
                    .cursor_pointer()
                    .hover(|style| style.border_color(rgba(0x007AFFff))),
            )
            .child(
                div()
                    .flex_1()
                    .text_size(px(15.0))
                    .text_color(rgba(0x000000dd))
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

    fn parse_color_alpha(color: &str, alpha: f32) -> Rgba {
        let base = Self::parse_color(color);
        Rgba { a: alpha, ..base }
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