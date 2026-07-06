use crate::models::reminder::{Reminder, ReminderList};
use crate::app::App;
use crate::state::ReminderFilter;
use chrono::{Local, NaiveDate};
use gpui::*;
use gpui::prelude::{FluentBuilder, StatefulInteractiveElement};
use gpui_component::{Icon, IconName};

pub struct ReminderView;

impl ReminderView {
    pub fn build(app: &mut App, cx: &mut Context<App>) -> impl IntoElement {
        let app_entity = cx.entity().downgrade();
        
        div()
            .flex()
            .w_full()
            .h_full()
            .bg(rgb(0xffffff))
            .child(Self::build_sidebar(app, app_entity.clone()))
            .child(Self::build_content_area(app, app_entity))
    }

    fn build_sidebar(app: &mut App, app_entity: WeakEntity<App>) -> impl IntoElement {
        let lists = app.state.lists.clone();
        let filter = app.state.reminder_filter;
        let today = Local::now().date_naive();
        
        let today_count = app.state.reminders.iter()
            .filter(|r| r.due_date.map(|d| d == today).unwrap_or(false) && !r.is_completed)
            .count();
        let planned_count = app.state.reminders.iter()
            .filter(|r| r.due_date.is_some() && !r.is_completed)
            .count();
        let total_count = app.state.reminders.iter()
            .filter(|r| !r.is_completed)
            .count();
        
        div()
            .w(px(220.0))
            .h_full()
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
                    .child(Self::quick_item("今天", IconName::Clock, filter == ReminderFilter::Today, today_count, app_entity.clone(), ReminderFilter::Today))
                    .child(Self::quick_item("计划", IconName::ListTodo, filter == ReminderFilter::Planned, planned_count, app_entity.clone(), ReminderFilter::Planned)),
            )
            .child(
                div()
                    .px(px(12.0))
                    .pb(px(8.0))
                    .child(Self::quick_item("全部", IconName::List, filter == ReminderFilter::All, total_count, app_entity.clone(), ReminderFilter::All)),
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
                        let is_selected = matches!(filter, ReminderFilter::List(id) if id == list.id);
                        let list_count = app.state.reminders.iter()
                            .filter(|r| r.list_id == Some(list.id) && !r.is_completed)
                            .count();
                        Self::list_item(list, is_selected, list_count, app_entity.clone())
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

    fn quick_item(label: &str, icon: IconName, selected: bool, count: usize, app_entity: WeakEntity<App>, filter: ReminderFilter) -> impl IntoElement {
        let label_str = label.to_string();
        let id_str = format!("quick-item-{}", label_str);
        
        div()
            .id(id_str)
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
                    .on_click(move |_, _, cx| {
                        app_entity.update(cx, |this, _| {
                            this.state.set_reminder_filter(filter)
                        }).ok();
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

    fn list_item(list: ReminderList, selected: bool, count: usize, app_entity: WeakEntity<App>) -> impl IntoElement {
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
            .when(selected, |this| {
                this.bg(rgba(0xe8f0feff))
            })
            .when(!selected, |this| {
                this.hover(|style| style.bg(rgba(0x00000008)))
                    .on_click(move |_, _, cx| {
                        app_entity.update(cx, |this, _| {
                            this.state.set_reminder_filter(ReminderFilter::List(list_id))
                        }).ok();
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

    fn build_content_area(app: &mut App, app_entity: WeakEntity<App>) -> impl IntoElement + '_ {
        let reminders = app.state.get_filtered_reminders();
        let filter = app.state.reminder_filter;
        
        let title = match filter {
            ReminderFilter::Today => "今天".to_string(),
            ReminderFilter::Planned => "计划".to_string(),
            ReminderFilter::All => "全部".to_string(),
            ReminderFilter::List(id) => app.state.lists.iter()
                .find(|l| l.id == id)
                .map(|l| l.name.clone())
                .unwrap_or_else(|| "提醒事项".to_string()),
        };

        let count = reminders.len();

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
                            Self::reminder_item(reminder, app_entity.clone())
                        }))
                    }),
            )
    }

    fn reminder_item(reminder: Reminder, app_entity: WeakEntity<App>) -> impl IntoElement {
        let due_date = reminder.due_date;
        let reminder_id = reminder.id;
        let is_completed = reminder.is_completed;
        let checkbox_id = format!("checkbox-{}", reminder_id);
        let item_id = format!("reminder-item-{}", reminder_id);
        
        div()
            .id(item_id)
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
                    .id(checkbox_id)
                    .w(px(18.0))
                    .h(px(18.0))
                    .rounded(px(9.0))
                    .border(px(2.0))
                    .border_color(if is_completed { rgba(0x007AFFff) } else { rgba(0xc7c7ccff) })
                    .cursor_pointer()
                    .hover(|style| style.border_color(rgba(0x007AFFff)))
                    .when(is_completed, |this| {
                        this.bg(rgba(0x007AFFff))
                            .child(
                                Icon::new(IconName::Check)
                                    .text_color(rgba(0xffffffff))
                                    .size(px(12.0)),
                            )
                    })
                    .on_click(move |_, _, cx| {
                        app_entity.update(cx, |this, _| {
                            if let Some(r) = this.state.reminders.iter_mut().find(|r| r.id == reminder_id) {
                                r.is_completed = !r.is_completed;
                            }
                        }).ok();
                    }),
            )
            .child(
                div()
                    .flex_1()
                    .text_size(px(15.0))
                    .text_color(if is_completed { rgba(0x8e8e93ff) } else { rgba(0x000000dd) })
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