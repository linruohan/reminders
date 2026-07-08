use crate::app::App;
use crate::models::owner::Owner;
use crate::models::reminder::{Priority, Reminder, ReminderList};
use crate::repository::ReminderRepository;
use crate::state::ReminderFilter;
use chrono::{Datelike, Duration, Local, NaiveDate, NaiveTime, Timelike, Weekday};
use gpui::prelude::{FluentBuilder, InteractiveElement};
use gpui::*;

use gpui_component::input::{Input, InputEvent, InputState};
use gpui_component::menu::{ContextMenuExt, PopupMenuItem};
use gpui_component::scroll::ScrollableElement;

use gpui_component::{h_flex, v_flex, Icon, IconName};

pub struct ReminderContent;

impl ReminderContent {
    pub fn build(app: &mut App, cx: &mut Context<App>) -> impl IntoElement {
        let reminders = app.state.get_filtered_reminders();
        let filter = &app.state.reminder_filter;
        let app_entity = cx.entity().clone();

        let title = match filter {
            ReminderFilter::Today => "今天".to_string(),
            ReminderFilter::Tomorrow => "明天".to_string(),
            ReminderFilter::Week => "本周".to_string(),
            ReminderFilter::Overdue => "已逾期".to_string(),
            ReminderFilter::Planned | ReminderFilter::Upcoming => "计划".to_string(),
            ReminderFilter::All | ReminderFilter::Open => "全部".to_string(),
            ReminderFilter::Completed => "已完成".to_string(),
            ReminderFilter::Everything => "所有提醒".to_string(),
            ReminderFilter::Date(date) => date.format("%m月%d日").to_string(),
            ReminderFilter::List(id) => app
                .state
                .lists
                .iter()
                .find(|l| l.id == *id)
                .map(|l| l.name.clone())
                .unwrap_or_else(|| "提醒事项".to_string()),
            ReminderFilter::Search(keyword) => format!("搜索 \"{}\"", keyword),
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
                                    .id("content-add-btn")
                                    .w(px(28.0))
                                    .h(px(28.0))
                                    .rounded(px(14.0))
                                    .cursor_pointer()
                                    .hover(|style| style.bg(rgba(0x007AFF11)))
                                    .flex()
                                    .items_center()
                                    .justify_center()
                                    .on_click({
                                        let app_entity = app_entity.clone();
                                        move |_, _, cx| {
                                            app_entity.update(cx, |this, _| {
                                                let id = this.create_reminder("新提醒");
                                                this.state.set_editing_reminder(Some(id));
                                            });
                                        }
                                    })
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
                    .id("reminder-list")
                    .flex_1()
                    .overflow_y_hidden()
                    .on_mouse_down(MouseButton::Left, {
                        let app_entity = app_entity.clone();
                        move |_, _, cx| {
                            app_entity.update(cx, |this, _| {
                                this.state.set_editing_reminder(None);
                            });
                        }
                    })
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
                            Self::reminder_item(app, reminder, app_entity.clone(), cx)
                        }))
                    }),
            )
    }

    fn reminder_item(
        app: &App,
        reminder: Reminder,
        app_entity: Entity<App>,
        cx: &mut Context<App>,
    ) -> impl IntoElement {
        let due_date = reminder.due_date;
        let due_time = reminder.due_time;
        let owner_id = reminder.owner_id;
        let reminder_id = reminder.id;
        let is_completed = reminder.is_completed;
        let is_editing = app.state.editing_reminder_id == Some(reminder_id);

        if is_editing {
            return cx
                .new(|cx| EditableReminder::new(reminder, app_entity, cx))
                .into_any_element();
        }

        let app_entity_clone = app_entity.clone();
        let owners = app.state.owners.clone();
        let owner_name = owner_id
            .and_then(|id| owners.iter().find(|o| o.id == id))
            .map(|o| o.name.clone());

        div()
            .id(format!("reminder-item-{}", reminder_id))
            .px(px(24.0))
            .py(px(12.0))
            .border_b(px(1.0))
            .border_color(rgba(0x00000008))
            .cursor_pointer()
            .hover(|style| style.bg(rgba(0x00000004)))
            .on_mouse_down(MouseButton::Left, {
                let app_entity = app_entity.clone();
                move |_, _, cx| {
                    cx.stop_propagation();
                    app_entity.update(cx, |this, _| {
                        this.state.set_editing_reminder(Some(reminder_id));
                    });
                }
            })
            .context_menu(Self::context_menu(
                app_entity.clone(),
                reminder_id,
                is_completed,
                app.state.lists.clone(),
            ))
            .child(
                div()
                    .flex()
                    .items_center()
                    .gap(px(16.0))
                    .child(Self::checkbox(
                        reminder_id,
                        is_completed,
                        false,
                        app_entity_clone.clone(),
                    ))
                    .child(
                        div()
                            .flex_1()
                            .flex()
                            .flex_col()
                            .gap(px(2.0))
                            .child(
                                div()
                                    .text_size(px(15.0))
                                    .text_color(if is_completed {
                                        rgba(0x8e8e93ff)
                                    } else {
                                        rgba(0x000000dd)
                                    })
                                    .when(is_completed, |this| this.text_decoration_0())
                                    .child(reminder.title),
                            )
                            .when(
                                due_date.is_some() || due_time.is_some() || owner_name.is_some(),
                                |this| {
                                    this.child(
                                        h_flex()
                                            .gap(px(8.0))
                                            .when(due_date.is_some(), |this| {
                                                this.child(
                                                    div()
                                                        .text_size(px(12.0))
                                                        .font_weight(FontWeight(500.0))
                                                        .text_color(Self::get_due_date_color(
                                                            &due_date,
                                                        ))
                                                        .child(Self::format_due_date(&due_date)),
                                                )
                                            })
                                            .when(due_time.is_some(), |this| {
                                                this.child(
                                                    div()
                                                        .text_size(px(12.0))
                                                        .font_weight(FontWeight(500.0))
                                                        .text_color(rgba(0xff9500ff))
                                                        .child(
                                                            EditableReminder::format_time_display(
                                                                due_time.unwrap(),
                                                            ),
                                                        ),
                                                )
                                            })
                                            .when(owner_name.is_some(), |this| {
                                                this.child(
                                                    div()
                                                        .text_size(px(12.0))
                                                        .font_weight(FontWeight(500.0))
                                                        .text_color(rgba(0x5856D6ff))
                                                        .child(owner_name.clone().unwrap()),
                                                )
                                            }),
                                    )
                                },
                            ),
                    )
                    .child(Self::info_button(app_entity_clone, reminder_id, false)),
            )
            .into_any_element()
    }

    fn checkbox(
        reminder_id: uuid::Uuid,
        is_completed: bool,
        editing: bool,
        app_entity: Entity<App>,
    ) -> impl IntoElement {
        let size = if editing { px(22.0) } else { px(18.0) };
        let radius = if editing { px(11.0) } else { px(9.0) };

        div()
            .id(format!("checkbox-{}", reminder_id))
            .w(size)
            .h(size)
            .rounded(radius)
            .border(px(2.0))
            .border_color(if is_completed {
                rgba(0x007AFFff)
            } else {
                rgba(0xc7c7ccff)
            })
            .cursor_pointer()
            .flex()
            .items_center()
            .justify_center()
            .flex_shrink_0()
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
            .on_click({
                move |_, _, cx| {
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
                        if let Some(r) = this.state.reminders.iter().find(|r| r.id == reminder_id) {
                            let _ = reminder_repo.update(r);
                        }
                    });
                }
            })
    }

    fn info_button(
        app_entity: Entity<App>,
        reminder_id: uuid::Uuid,
        editing: bool,
    ) -> impl IntoElement {
        div()
            .w(px(24.0))
            .h(px(24.0))
            .rounded(px(12.0))
            .cursor_pointer()
            .flex()
            .items_center()
            .justify_center()
            .flex_shrink_0()
            .hover(|style| style.bg(rgba(0x00000008)))
            .on_mouse_down(MouseButton::Left, {
                move |_, window, cx| {
                    window.prevent_default();
                    cx.stop_propagation();
                    app_entity.update(cx, |this, cx| {
                        this.open_reminder_detail(window, cx, reminder_id);
                    });
                }
            })
            .child(
                Icon::new(IconName::Info)
                    .text_color(if editing {
                        rgba(0x007AFFff)
                    } else {
                        rgba(0x8e8e93ff)
                    })
                    .size(px(14.0)),
            )
    }

    fn context_menu(
        app_entity: Entity<App>,
        reminder_id: uuid::Uuid,
        is_completed: bool,
        lists: Vec<ReminderList>,
    ) -> impl Fn(
        gpui_component::menu::PopupMenu,
        &mut Window,
        &mut Context<gpui_component::menu::PopupMenu>,
    ) -> gpui_component::menu::PopupMenu {
        move |menu, window, _cx| {
            let toggle_app = app_entity.clone();
            let toggle_id = reminder_id;

            let show_app = app_entity.clone();
            let show_id = reminder_id;

            let delete_app = app_entity.clone();
            let delete_id = reminder_id;

            let due_app = app_entity.clone();
            let due_id = reminder_id;

            let mut menu = menu
                .item(
                    PopupMenuItem::new(if is_completed {
                        "标记为未完成"
                    } else {
                        "标记为完成"
                    })
                    .on_click(window.listener_for(
                        &toggle_app,
                        move |this, _, _, _cx| {
                            if is_completed {
                                this.uncomplete_reminder(toggle_id);
                            } else {
                                this.complete_reminder(toggle_id);
                            }
                        },
                    )),
                )
                .item(PopupMenuItem::new("显示简介").on_click(window.listener_for(
                    &show_app,
                    move |this, _, window, cx| {
                        this.open_reminder_detail(window, cx, show_id);
                    },
                )))
                .separator()
                .item(PopupMenuItem::new("删除").on_click(window.listener_for(
                    &delete_app,
                    move |this, _, _, _cx| {
                        this.delete_reminder(delete_id);
                    },
                )))
                .separator()
                .item(PopupMenuItem::new("明天到期").on_click(window.listener_for(
                    &due_app,
                    move |this, _, _, _cx| {
                        this.set_due_tomorrow(due_id);
                    },
                )))
                .separator();

            for list in &lists {
                let move_app = app_entity.clone();
                let move_id = reminder_id;
                let list_id = list.id;
                let list_name = list.name.clone();
                menu = menu.item(PopupMenuItem::new(format!("移到 {}", list_name)).on_click(
                    window.listener_for(&move_app, move |this, _, _, _cx| {
                        this.move_reminder_to_list(move_id, list_id);
                    }),
                ));
            }

            menu = menu.separator();

            for (label, priority) in [
                ("优先级：高", Priority::High),
                ("优先级：中", Priority::Medium),
                ("优先级：低", Priority::Low),
                ("优先级：无", Priority::None),
            ] {
                let priority_app = app_entity.clone();
                let priority_id = reminder_id;
                menu = menu.item(PopupMenuItem::new(label).on_click(window.listener_for(
                    &priority_app,
                    move |this, _, _, _cx| {
                        this.set_priority(priority_id, priority.clone());
                    },
                )));
            }

            menu
        }
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

pub struct EditableReminder {
    reminder: Reminder,
    app_entity: Entity<App>,
    title_input: Option<Entity<InputState>>,
    notes_input: Option<Entity<InputState>>,
    editing_title: String,
    editing_notes: String,
    editing_date: Option<NaiveDate>,
    editing_time: Option<NaiveTime>,
    editing_owner_id: Option<uuid::Uuid>,
    show_date_picker: bool,
    show_time_picker: bool,
    show_owner_picker: bool,
}

impl EditableReminder {
    fn new(reminder: Reminder, app_entity: Entity<App>, _cx: &mut Context<Self>) -> Self {
        Self {
            editing_title: reminder.title.clone(),
            editing_notes: reminder.description.clone().unwrap_or_default(),
            editing_date: reminder.due_date,
            editing_time: reminder.due_time,
            editing_owner_id: reminder.owner_id,
            show_date_picker: false,
            show_time_picker: false,
            show_owner_picker: false,
            title_input: None,
            notes_input: None,
            reminder,
            app_entity,
        }
    }

    fn format_time_display(time: NaiveTime) -> String {
        let hour = time.hour();
        let minute = time.minute();
        if hour < 12 {
            format!("上午{}:{:02}", if hour == 0 { 12 } else { hour }, minute)
        } else if hour == 12 {
            format!("下午12:{:02}", minute)
        } else {
            format!("下午{}:{:02}", hour - 12, minute)
        }
    }

    fn sync_to_app(&self, cx: &mut Context<Self>) {
        self.app_entity.update(cx, |app, _| {
            if let Some(r) = app
                .state
                .reminders
                .iter_mut()
                .find(|r| r.id == self.reminder.id)
            {
                r.title = self.editing_title.clone();
                r.description = if self.editing_notes.is_empty() {
                    None
                } else {
                    Some(self.editing_notes.clone())
                };
                r.due_date = self.editing_date;
                r.due_time = self.editing_time;
                r.owner_id = self.editing_owner_id;
            }
            let repo = ReminderRepository::new(app.db.conn());
            if let Some(r) = app
                .state
                .reminders
                .iter()
                .find(|r| r.id == self.reminder.id)
            {
                let _ = repo.update(r);
            }
        });
    }

    fn remove_date(&mut self, cx: &mut Context<Self>) {
        self.editing_date = None;
        self.show_date_picker = false;
        self.sync_to_app(cx);
        cx.notify();
    }

    fn set_date(&mut self, date: NaiveDate, cx: &mut Context<Self>) {
        self.editing_date = Some(date);
        self.show_date_picker = false;
        self.sync_to_app(cx);
        cx.notify();
    }

    fn open_date_picker(&mut self, cx: &mut Context<Self>) {
        self.show_date_picker = true;
        self.show_time_picker = false;
        self.show_owner_picker = false;
        cx.notify();
    }

    fn toggle_date_picker(&mut self, cx: &mut Context<Self>) {
        self.show_date_picker = !self.show_date_picker;
        if self.show_date_picker {
            self.show_time_picker = false;
            self.show_owner_picker = false;
        }
        cx.notify();
    }

    fn remove_time(&mut self, cx: &mut Context<Self>) {
        self.editing_time = None;
        self.show_time_picker = false;
        self.sync_to_app(cx);
        cx.notify();
    }

    fn select_time(&mut self, time_str: &str, cx: &mut Context<Self>) {
        if let Ok(time) = NaiveTime::parse_from_str(time_str, "%H:%M") {
            self.editing_time = Some(time);
        }
        self.show_time_picker = false;
        self.sync_to_app(cx);
        cx.notify();
    }

    fn open_time_picker(&mut self, cx: &mut Context<Self>) {
        self.show_time_picker = true;
        self.show_date_picker = false;
        self.show_owner_picker = false;
        cx.notify();
    }

    fn toggle_time_picker(&mut self, cx: &mut Context<Self>) {
        self.show_time_picker = !self.show_time_picker;
        if self.show_time_picker {
            self.show_date_picker = false;
            self.show_owner_picker = false;
        }
        cx.notify();
    }

    fn remove_owner(&mut self, cx: &mut Context<Self>) {
        self.editing_owner_id = None;
        self.show_owner_picker = false;
        self.sync_to_app(cx);
        cx.notify();
    }

    fn set_owner(&mut self, owner_id: uuid::Uuid, cx: &mut Context<Self>) {
        self.editing_owner_id = Some(owner_id);
        self.show_owner_picker = false;
        self.sync_to_app(cx);
        cx.notify();
    }

    fn open_owner_picker(&mut self, cx: &mut Context<Self>) {
        self.show_owner_picker = true;
        self.show_date_picker = false;
        self.show_time_picker = false;
        cx.notify();
    }

    fn toggle_owner_picker(&mut self, cx: &mut Context<Self>) {
        self.show_owner_picker = !self.show_owner_picker;
        if self.show_owner_picker {
            self.show_date_picker = false;
            self.show_time_picker = false;
        }
        cx.notify();
    }

    fn weekday_label(weekday: Weekday) -> &'static str {
        match weekday {
            Weekday::Mon => "周一",
            Weekday::Tue => "周二",
            Weekday::Wed => "周三",
            Weekday::Thu => "周四",
            Weekday::Fri => "周五",
            Weekday::Sat => "周六",
            Weekday::Sun => "周日",
        }
    }

    fn generate_date_options() -> Vec<(NaiveDate, String, Option<String>)> {
        let today = Local::now().date_naive();
        let tomorrow = today.succ_opt().unwrap_or(today);
        let next_week = today + Duration::days(7);

        let mut options = vec![
            (today, "今天".to_string(), None),
            (tomorrow, "明天".to_string(), None),
            (
                next_week,
                "下周".to_string(),
                Some(next_week.format("%m月%d日").to_string()),
            ),
        ];

        for offset in 2..=30 {
            let date = today + Duration::days(offset);
            if date == tomorrow || date == next_week {
                continue;
            }
            let label = date.format("%m月%d日").to_string();
            let subtitle = Some(Self::weekday_label(date.weekday()).to_string());
            options.push((date, label, subtitle));
        }

        options
    }

    fn render_picker_dropdown(
        _entity: Entity<EditableReminder>,
        children: impl IntoIterator<Item = AnyElement>,
    ) -> impl IntoElement {
        div()
            .absolute()
            .top(px(36.0))
            .left(px(0.0))
            .w(px(240.0))
            .max_h(px(320.0))
            .overflow_y_scrollbar()
            .bg(rgba(0xffffffee))
            .rounded(px(12.0))
            .border(px(1.0))
            .border_color(rgba(0x00000012))
            .shadow(vec![BoxShadow {
                color: rgba(0x00000028).into(),
                offset: Point {
                    x: px(0.0),
                    y: px(6.0),
                },
                blur_radius: px(20.0),
                spread_radius: px(0.0),
                inset: false,
            }])
            .p(px(6.0))
            .on_mouse_down(MouseButton::Left, |_, _, cx| {
                cx.stop_propagation();
            })
            .child(v_flex().children(children))
    }

    fn render_date_picker(
        entity: Entity<EditableReminder>,
        editing_date: Option<NaiveDate>,
    ) -> impl IntoElement {
        let quick_options: Vec<_> = Self::generate_date_options().into_iter().take(3).collect();
        let specific_options: Vec<_> = Self::generate_date_options().into_iter().skip(3).collect();

        let entity_for_quick = entity.clone();
        let entity_for_specific = entity.clone();

        Self::render_picker_dropdown(
            entity.clone(),
            std::iter::once(
                div()
                    .px(px(8.0))
                    .py(px(4.0))
                    .text_size(px(11.0))
                    .font_weight(FontWeight(600.0))
                    .text_color(rgba(0x8e8e93ff))
                    .child("建议")
                    .into_any_element(),
            )
            .chain(
                quick_options
                    .into_iter()
                    .map(move |(date, label, subtitle)| {
                        let is_selected = editing_date == Some(date);
                        let select_entity = entity_for_quick.clone();
                        div()
                            .flex()
                            .items_center()
                            .gap(px(10.0))
                            .px(px(8.0))
                            .py(px(7.0))
                            .rounded(px(8.0))
                            .cursor_pointer()
                            .when(is_selected, |this| this.bg(rgba(0x007AFFff)))
                            .when(!is_selected, |this| {
                                this.hover(|style| style.bg(rgba(0x00000008)))
                            })
                            .on_mouse_down(MouseButton::Left, move |_, _, cx| {
                                cx.stop_propagation();
                                select_entity.update(cx, |this, cx| {
                                    this.set_date(date, cx);
                                });
                            })
                            .child(Icon::new(IconName::Calendar).size(px(16.0)).text_color(
                                if is_selected {
                                    rgba(0xffffffff)
                                } else {
                                    rgba(0x007AFFff)
                                },
                            ))
                            .child(
                                v_flex()
                                    .child(
                                        div()
                                            .text_size(px(14.0))
                                            .font_weight(FontWeight(500.0))
                                            .text_color(if is_selected {
                                                rgba(0xffffffff)
                                            } else {
                                                rgba(0x000000ee)
                                            })
                                            .child(label),
                                    )
                                    .when_some(subtitle, |this, sub| {
                                        this.child(
                                            div()
                                                .text_size(px(12.0))
                                                .text_color(if is_selected {
                                                    rgba(0xffffffbb)
                                                } else {
                                                    rgba(0x8e8e93ff)
                                                })
                                                .child(sub),
                                        )
                                    }),
                            )
                            .into_any_element()
                    }),
            )
            .chain(std::iter::once(
                div()
                    .px(px(8.0))
                    .py(px(4.0))
                    .mt(px(4.0))
                    .text_size(px(11.0))
                    .font_weight(FontWeight(600.0))
                    .text_color(rgba(0x8e8e93ff))
                    .child("具体日期")
                    .into_any_element(),
            ))
            .chain(
                specific_options
                    .into_iter()
                    .map(move |(date, label, subtitle)| {
                        let is_selected = editing_date == Some(date);
                        let select_entity = entity_for_specific.clone();
                        div()
                            .flex()
                            .items_center()
                            .gap(px(10.0))
                            .px(px(8.0))
                            .py(px(7.0))
                            .rounded(px(8.0))
                            .cursor_pointer()
                            .when(is_selected, |this| this.bg(rgba(0x007AFFff)))
                            .when(!is_selected, |this| {
                                this.hover(|style| style.bg(rgba(0x00000008)))
                            })
                            .on_mouse_down(MouseButton::Left, move |_, _, cx| {
                                cx.stop_propagation();
                                select_entity.update(cx, |this, cx| {
                                    this.set_date(date, cx);
                                });
                            })
                            .child(Icon::new(IconName::Calendar).size(px(16.0)).text_color(
                                if is_selected {
                                    rgba(0xffffffff)
                                } else {
                                    rgba(0x007AFFff)
                                },
                            ))
                            .child(
                                v_flex()
                                    .child(
                                        div()
                                            .text_size(px(14.0))
                                            .font_weight(FontWeight(500.0))
                                            .text_color(if is_selected {
                                                rgba(0xffffffff)
                                            } else {
                                                rgba(0x000000ee)
                                            })
                                            .child(label),
                                    )
                                    .when_some(subtitle, |this, sub| {
                                        this.child(
                                            div()
                                                .text_size(px(12.0))
                                                .text_color(if is_selected {
                                                    rgba(0xffffffbb)
                                                } else {
                                                    rgba(0x8e8e93ff)
                                                })
                                                .child(sub),
                                        )
                                    }),
                            )
                            .into_any_element()
                    }),
            ),
        )
    }

    fn render_owner_picker(
        entity: Entity<EditableReminder>,
        owners: Vec<Owner>,
        editing_owner_id: Option<uuid::Uuid>,
    ) -> impl IntoElement {
        Self::render_picker_dropdown(
            entity.clone(),
            std::iter::once(
                div()
                    .px(px(8.0))
                    .py(px(4.0))
                    .text_size(px(11.0))
                    .font_weight(FontWeight(600.0))
                    .text_color(rgba(0x8e8e93ff))
                    .child("选择负责人")
                    .into_any_element(),
            )
            .chain(owners.into_iter().map(move |owner| {
                let is_selected = editing_owner_id == Some(owner.id);
                let owner_id = owner.id;
                let owner_name = owner.name.clone();
                let owner_color = owner.color.clone();
                let select_entity = entity.clone();
                div()
                    .flex()
                    .items_center()
                    .gap(px(10.0))
                    .px(px(8.0))
                    .py(px(7.0))
                    .rounded(px(8.0))
                    .cursor_pointer()
                    .when(is_selected, |this| this.bg(rgba(0x5856D6ff)))
                    .when(!is_selected, |this| {
                        this.hover(|style| style.bg(rgba(0x00000008)))
                    })
                    .on_mouse_down(MouseButton::Left, move |_, _, cx| {
                        cx.stop_propagation();
                        select_entity.update(cx, |this, cx| {
                            this.set_owner(owner_id, cx);
                        });
                    })
                    .child(
                        div()
                            .w(px(20.0))
                            .h(px(20.0))
                            .rounded(px(10.0))
                            .bg(Self::parse_owner_color(&owner_color))
                            .flex()
                            .items_center()
                            .justify_center()
                            .child(
                                div()
                                    .text_size(px(10.0))
                                    .font_weight(FontWeight(600.0))
                                    .text_color(rgba(0xffffffff))
                                    .child(owner_name.chars().next().unwrap_or('?').to_string()),
                            ),
                    )
                    .child(
                        div()
                            .text_size(px(14.0))
                            .font_weight(FontWeight(500.0))
                            .text_color(if is_selected {
                                rgba(0xffffffff)
                            } else {
                                rgba(0x000000ee)
                            })
                            .child(owner_name),
                    )
                    .into_any_element()
            })),
        )
    }

    fn parse_owner_color(color: &str) -> Rgba {
        match color {
            "#007AFF" => rgba(0x007AFFff),
            "#FF3B30" => rgba(0xFF3B30ff),
            "#FF9500" => rgba(0xFF9500ff),
            "#4CD964" => rgba(0x4CD964ff),
            "#5856D6" => rgba(0x5856D6ff),
            "#FF2D55" => rgba(0xFF2D55ff),
            _ => rgba(0x5856D6ff),
        }
    }

    fn generate_time_options() -> Vec<(String, String, String)> {
        vec![
            (
                "09:00".to_string(),
                "上午9:00".to_string(),
                "上午".to_string(),
            ),
            (
                "12:00".to_string(),
                "下午12:00".to_string(),
                "中午".to_string(),
            ),
            (
                "15:00".to_string(),
                "下午3:00".to_string(),
                "下午".to_string(),
            ),
            (
                "18:00".to_string(),
                "下午6:00".to_string(),
                "晚上".to_string(),
            ),
            (
                "21:00".to_string(),
                "下午9:00".to_string(),
                "夜间".to_string(),
            ),
        ]
    }
}

impl Render for EditableReminder {
    fn render(&mut self, window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        if self.title_input.is_none() {
            self.title_input = Some(cx.new(|cx| {
                let mut state = InputState::new(window, cx);
                state.set_value(self.editing_title.clone(), window, cx);
                state
            }));

            if let Some(input) = &self.title_input {
                let _ = cx.subscribe_in(input, window, move |this, _, ev: &InputEvent, _, cx| {
                    if let InputEvent::Change = ev {
                        if let Some(input) = &this.title_input {
                            this.editing_title = input.read(cx).value().to_string();
                            this.sync_to_app(cx);
                        }
                    }
                });
                input.update(cx, |input, cx| input.focus(window, cx));
            }
        }

        if self.notes_input.is_none() {
            self.notes_input = Some(cx.new(|cx| {
                let mut state = InputState::new(window, cx);
                state.set_placeholder("备注", window, cx);
                if !self.editing_notes.is_empty() {
                    state.set_value(self.editing_notes.clone(), window, cx);
                }
                state
            }));

            if let Some(input) = &self.notes_input {
                let _ = cx.subscribe_in(input, window, move |this, _, ev: &InputEvent, _, cx| {
                    if let InputEvent::Change = ev {
                        if let Some(input) = &this.notes_input {
                            this.editing_notes = input.read(cx).value().to_string();
                            this.sync_to_app(cx);
                        }
                    }
                });
            }
        }

        let reminder_id = self.reminder.id;
        let is_completed = self.reminder.is_completed;
        let app_entity = self.app_entity.clone();
        let entity = cx.entity().clone();
        let editing_date = self.editing_date;
        let formatted_date = editing_date.map(|d| ReminderContent::format_due_date(&Some(d)));
        let time_options = Self::generate_time_options();
        let show_date_picker = self.show_date_picker;
        let show_time_picker = self.show_time_picker;
        let show_owner_picker = self.show_owner_picker;
        let editing_time = self.editing_time;
        let editing_owner_id = self.editing_owner_id;
        let time_display = editing_time.map(Self::format_time_display);

        let lists = app_entity.read(cx).state.lists.clone();
        let owners = app_entity.read(cx).state.owners.clone();
        let owner_name = editing_owner_id
            .and_then(|id| owners.iter().find(|o| o.id == id))
            .map(|o| o.name.clone());

        div()
            .id(format!("reminder-item-{}", reminder_id))
            .px(px(24.0))
            .py(px(12.0))
            .border_b(px(1.0))
            .border_color(rgba(0x00000008))
            .bg(rgba(0xf8f9fbff))
            .on_mouse_down(MouseButton::Left, |_, _, cx| {
                cx.stop_propagation();
            })
            .context_menu(ReminderContent::context_menu(
                app_entity.clone(),
                reminder_id,
                is_completed,
                lists,
            ))
            .child(
                div()
                    .flex()
                    .items_start()
                    .gap(px(16.0))
                    .child(ReminderContent::checkbox(
                        reminder_id,
                        is_completed,
                        true,
                        app_entity.clone(),
                    ))
                    .child(
                        v_flex()
                            .flex_1()
                            .gap(px(2.0))
                            .child(
                                if let Some(input) = &self.title_input {
                                    Input::new(input)
                                        .appearance(true)
                                        .bordered(false)
                                        .focus_bordered(false)
                                        .w_full()
                                        .text_size(px(15.0))
                                        .font_weight(FontWeight(600.0))
                                        .into_any_element()
                                } else {
                                    div().into_any_element()
                                },
                            )
                            .child(
                                if let Some(input) = &self.notes_input {
                                    Input::new(input)
                                        .appearance(true)
                                        .bordered(false)
                                        .focus_bordered(false)
                                        .w_full()
                                        .text_size(px(13.0))
                                        .text_color(rgba(0x8e8e93ff))
                                        .into_any_element()
                                } else {
                                    div()
                                        .text_size(px(13.0))
                                        .text_color(rgba(0x8e8e93ff))
                                        .child("备注")
                                        .into_any_element()
                                },
                            ),
                    )
                    .child(ReminderContent::info_button(
                        app_entity.clone(),
                        reminder_id,
                        true,
                    )),
            )
            .child(
                div()
                    .mt(px(10.0))
                    .pt(px(10.0))
                    .border_t(px(1.0))
                    .border_color(rgba(0x0000000d))
                    .child(
                        h_flex()
                            .gap(px(8.0))
                            .flex_wrap()
                            .when(editing_date.is_some(), |this| {
                                let date_label = formatted_date.clone().unwrap();
                                let remove_entity = entity.clone();
                                let picker_entity = entity.clone();
                                this.child(
                                    div()
                                        .relative()
                                        .child(
                                            div()
                                                .flex()
                                                .items_center()
                                                .gap(px(6.0))
                                                .px(px(10.0))
                                                .py(px(5.0))
                                                .bg(rgba(0x00000008))
                                                .rounded(px(16.0))
                                                .cursor_pointer()
                                                .on_mouse_down(MouseButton::Left, move |_, _, cx| {
                                                    cx.stop_propagation();
                                                    picker_entity.update(cx, |this, cx| {
                                                        this.toggle_date_picker(cx);
                                                    });
                                                })
                                                .child(
                                                    Icon::new(IconName::Calendar)
                                                        .size(px(13.0))
                                                        .text_color(rgba(0x007AFFff)),
                                                )
                                                .child(
                                                    div()
                                                        .px(px(4.0))
                                                        .py(px(1.0))
                                                        .rounded(px(4.0))
                                                        .when(show_date_picker, |this| {
                                                            this.bg(rgba(0x007AFFff))
                                                        })
                                                        .child(
                                                            div()
                                                                .text_size(px(13.0))
                                                                .text_color(if show_date_picker {
                                                                    rgba(0xffffffff)
                                                                } else {
                                                                    rgba(0x000000cc)
                                                                })
                                                                .child(date_label),
                                                        ),
                                                )
                                                .child(
                                                    div()
                                                        .w(px(16.0))
                                                        .h(px(16.0))
                                                        .rounded(px(8.0))
                                                        .cursor_pointer()
                                                        .flex()
                                                        .items_center()
                                                        .justify_center()
                                                        .hover(|style| style.bg(rgba(0x00000011)))
                                                        .on_mouse_down(
                                                            MouseButton::Left,
                                                            move |_, _, cx| {
                                                                cx.stop_propagation();
                                                                remove_entity.update(cx, |this, cx| {
                                                                    this.remove_date(cx);
                                                                });
                                                            },
                                                        )
                                                        .child(
                                                            Icon::new(IconName::Close)
                                                                .size(px(10.0))
                                                                .text_color(rgba(0x8e8e93ff)),
                                                        ),
                                                ),
                                        )
                                        .when(show_date_picker, |this| {
                                            this.child(Self::render_date_picker(
                                                entity.clone(),
                                                editing_date,
                                            ))
                                        }),
                                )
                            })
                            .when(editing_date.is_none(), |this| {
                                let picker_entity = entity.clone();
                                this.child(
                                    div()
                                        .relative()
                                        .child(
                                            div()
                                                .flex()
                                                .items_center()
                                                .gap(px(6.0))
                                                .px(px(10.0))
                                                .py(px(5.0))
                                                .rounded(px(16.0))
                                                .cursor_pointer()
                                                .hover(|style| style.bg(rgba(0x00000008)))
                                                .on_mouse_down(MouseButton::Left, move |_, _, cx| {
                                                    cx.stop_propagation();
                                                    picker_entity.update(cx, |this, cx| {
                                                        this.open_date_picker(cx);
                                                    });
                                                })
                                                .child(
                                                    Icon::new(IconName::Calendar)
                                                        .size(px(13.0))
                                                        .text_color(rgba(0x007AFFff)),
                                                )
                                                .child(
                                                    div()
                                                        .text_size(px(13.0))
                                                        .text_color(rgba(0x007AFFff))
                                                        .child("添加日期"),
                                                ),
                                        )
                                        .when(show_date_picker, |this| {
                                            this.child(Self::render_date_picker(
                                                entity.clone(),
                                                editing_date,
                                            ))
                                        }),
                                )
                            })
                            .when(editing_time.is_some(), |this| {
                                let time_label = time_display.clone().unwrap();
                                let remove_entity = entity.clone();
                                let picker_entity = entity.clone();
                                this.child(
                                    div()
                                        .relative()
                                        .child(
                                            div()
                                                .flex()
                                                .items_center()
                                                .gap(px(6.0))
                                                .px(px(10.0))
                                                .py(px(5.0))
                                                .bg(rgba(0x00000008))
                                                .rounded(px(16.0))
                                                .cursor_pointer()
                                                .on_mouse_down(MouseButton::Left, move |_, _, cx| {
                                                    cx.stop_propagation();
                                                    picker_entity.update(cx, |this, cx| {
                                                        this.toggle_time_picker(cx);
                                                    });
                                                })
                                                .child(
                                                    Icon::new(IconName::Clock)
                                                        .size(px(13.0))
                                                        .text_color(rgba(0xff9500ff)),
                                                )
                                                .child(
                                                    div()
                                                        .px(px(4.0))
                                                        .py(px(1.0))
                                                        .rounded(px(4.0))
                                                        .when(show_time_picker, |this| {
                                                            this.bg(rgba(0x007AFFff))
                                                        })
                                                        .child(
                                                            div()
                                                                .text_size(px(13.0))
                                                                .text_color(if show_time_picker {
                                                                    rgba(0xffffffff)
                                                                } else {
                                                                    rgba(0x000000cc)
                                                                })
                                                                .child(time_label),
                                                        ),
                                                )
                                                .child(
                                                    div()
                                                        .w(px(16.0))
                                                        .h(px(16.0))
                                                        .rounded(px(8.0))
                                                        .cursor_pointer()
                                                        .flex()
                                                        .items_center()
                                                        .justify_center()
                                                        .hover(|style| style.bg(rgba(0x00000011)))
                                                        .on_mouse_down(
                                                            MouseButton::Left,
                                                            move |_, _, cx| {
                                                                cx.stop_propagation();
                                                                remove_entity.update(cx, |this, cx| {
                                                                    this.remove_time(cx);
                                                                });
                                                            },
                                                        )
                                                        .child(
                                                            Icon::new(IconName::Close)
                                                                .size(px(10.0))
                                                                .text_color(rgba(0x8e8e93ff)),
                                                        ),
                                                ),
                                        )
                                        .when(show_time_picker, |this| {
                                            this.child(
                                                div()
                                                    .absolute()
                                                    .top(px(36.0))
                                                    .left(px(0.0))
                                                    .w(px(220.0))
                                                    .bg(rgba(0xffffffee))
                                                    .rounded(px(12.0))
                                                    .border(px(1.0))
                                                    .border_color(rgba(0x00000012))
                                                    .shadow(vec![BoxShadow {
                                                        color: rgba(0x00000028).into(),
                                                        offset: Point {
                                                            x: px(0.0),
                                                            y: px(6.0),
                                                        },
                                                        blur_radius: px(20.0),
                                                        spread_radius: px(0.0),
                                                        inset: false,
                                                    }])
                                                    .p(px(6.0))
                                                    .child(
                                                        v_flex()
                                                            .child(
                                                                div()
                                                                    .px(px(8.0))
                                                                    .py(px(4.0))
                                                                    .text_size(px(11.0))
                                                                    .font_weight(FontWeight(600.0))
                                                                    .text_color(rgba(0x8e8e93ff))
                                                                    .child("建议"),
                                                            )
                                                            .children(
                                                                time_options.iter().map(
                                                                    |(time_val, time_label, period)| {
                                                                        let is_selected = editing_time
                                                                            .map(|t| {
                                                                                t.format("%H:%M")
                                                                                    .to_string()
                                                                            })
                                                                            == Some(
                                                                                time_val.clone(),
                                                                            );
                                                                        let time_val_clone =
                                                                            time_val.clone();
                                                                        let select_entity =
                                                                            entity.clone();
                                                                        div()
                                                                            .flex()
                                                                            .items_center()
                                                                            .gap(px(10.0))
                                                                            .px(px(8.0))
                                                                            .py(px(7.0))
                                                                            .rounded(px(8.0))
                                                                            .cursor_pointer()
                                                                            .when(is_selected, |this| {
                                                                                this.bg(rgba(
                                                                                    0x007AFFff,
                                                                                ))
                                                                            })
                                                                            .when(!is_selected, |this| {
                                                                                this.hover(|style| {
                                                                                    style.bg(rgba(
                                                                                        0x00000008,
                                                                                    ))
                                                                                })
                                                                            })
                                                                            .on_mouse_down(
                                                                                MouseButton::Left,
                                                                                move |_, _, cx| {
                                                                                    cx.stop_propagation();
                                                                                    select_entity.update(
                                                                                        cx,
                                                                                        |this, cx| {
                                                                                            this.select_time(
                                                                                                &time_val_clone,
                                                                                                cx,
                                                                                            );
                                                                                        },
                                                                                    );
                                                                                },
                                                                                )
                                                                            .child(
                                                                                Icon::new(
                                                                                    IconName::Clock,
                                                                                )
                                                                                .size(px(16.0))
                                                                                .text_color(
                                                                                    if is_selected {
                                                                                        rgba(
                                                                                            0xffffffff,
                                                                                        )
                                                                                    } else {
                                                                                        rgba(
                                                                                            0xff9500ff,
                                                                                        )
                                                                                    },
                                                                                ),
                                                                            )
                                                                            .child(
                                                                                v_flex()
                                                                                    .child(
                                                                                        div()
                                                                                            .text_size(
                                                                                                px(14.0),
                                                                                            )
                                                                                            .font_weight(
                                                                                                FontWeight(
                                                                                                    500.0,
                                                                                                ),
                                                                                            )
                                                                                            .text_color(
                                                                                                if is_selected
                                                                                                {
                                                                                                    rgba(
                                                                                                        0xffffffff,
                                                                                                    )
                                                                                                } else {
                                                                                                    rgba(
                                                                                                        0x000000ee,
                                                                                                    )
                                                                                                },
                                                                                            )
                                                                                            .child(
                                                                                                time_label
                                                                                                    .clone(),
                                                                                            ),
                                                                                    )
                                                                                    .child(
                                                                                        div()
                                                                                            .text_size(
                                                                                                px(12.0),
                                                                                            )
                                                                                            .text_color(
                                                                                                if is_selected
                                                                                                {
                                                                                                    rgba(
                                                                                                        0xffffffbb,
                                                                                                    )
                                                                                                } else {
                                                                                                    rgba(
                                                                                                        0x8e8e93ff,
                                                                                                    )
                                                                                                },
                                                                                            )
                                                                                            .child(
                                                                                                period
                                                                                                    .clone(),
                                                                                            ),
                                                                                    ),
                                                                            )
                                                                    },
                                                                ),
                                                            ),
                                                    ),
                                            )
                                        }),
                                )
                            })
                            .when(editing_time.is_none(), |this| {
                                let picker_entity = entity.clone();
                                this.child(
                                    div()
                                        .relative()
                                        .child(
                                            div()
                                                .flex()
                                                .items_center()
                                                .gap(px(6.0))
                                                .px(px(10.0))
                                                .py(px(5.0))
                                                .rounded(px(16.0))
                                                .cursor_pointer()
                                                .hover(|style| style.bg(rgba(0x00000008)))
                                                .on_mouse_down(MouseButton::Left, move |_, _, cx| {
                                                    cx.stop_propagation();
                                                    picker_entity.update(cx, |this, cx| {
                                                        this.open_time_picker(cx);
                                                    });
                                                })
                                                .child(
                                                    Icon::new(IconName::Clock)
                                                        .size(px(13.0))
                                                        .text_color(rgba(0xff9500ff)),
                                                )
                                                .child(
                                                    div()
                                                        .text_size(px(13.0))
                                                        .text_color(rgba(0xff9500ff))
                                                        .child("添加时间"),
                                                ),
                                        )
                                        .when(show_time_picker, |this| {
                                            this.child(
                                                div()
                                                    .absolute()
                                                    .top(px(36.0))
                                                    .left(px(0.0))
                                                    .w(px(220.0))
                                                    .bg(rgba(0xffffffee))
                                                    .rounded(px(12.0))
                                                    .border(px(1.0))
                                                    .border_color(rgba(0x00000012))
                                                    .shadow(vec![BoxShadow {
                                                        color: rgba(0x00000028).into(),
                                                        offset: Point {
                                                            x: px(0.0),
                                                            y: px(6.0),
                                                        },
                                                        blur_radius: px(20.0),
                                                        spread_radius: px(0.0),
                                                        inset: false,
                                                    }])
                                                    .p(px(6.0))
                                                    .child(
                                                        v_flex()
                                                            .child(
                                                                div()
                                                                    .px(px(8.0))
                                                                    .py(px(4.0))
                                                                    .text_size(px(11.0))
                                                                    .font_weight(FontWeight(600.0))
                                                                    .text_color(rgba(0x8e8e93ff))
                                                                    .child("建议"),
                                                            )
                                                            .children(
                                                                time_options.iter().map(
                                                                    |(time_val, time_label, period)| {
                                                                        let time_val_clone =
                                                                            time_val.clone();
                                                                        let select_entity =
                                                                            entity.clone();
                                                                        div()
                                                                            .flex()
                                                                            .items_center()
                                                                            .gap(px(10.0))
                                                                            .px(px(8.0))
                                                                            .py(px(7.0))
                                                                            .rounded(px(8.0))
                                                                            .cursor_pointer()
                                                                            .hover(|style| {
                                                                                style.bg(rgba(
                                                                                    0x00000008,
                                                                                ))
                                                                            })
                                                                            .on_mouse_down(
                                                                                MouseButton::Left,
                                                                                move |_, _, cx| {
                                                                                    cx.stop_propagation();
                                                                                    select_entity.update(
                                                                                        cx,
                                                                                        |this, cx| {
                                                                                            this.select_time(
                                                                                                &time_val_clone,
                                                                                                cx,
                                                                                            );
                                                                                        },
                                                                                    );
                                                                                },
                                                                            )
                                                                            .child(
                                                                                Icon::new(
                                                                                    IconName::Clock,
                                                                                )
                                                                                .size(px(16.0))
                                                                                .text_color(
                                                                                    rgba(
                                                                                        0xff9500ff,
                                                                                    ),
                                                                                ),
                                                                            )
                                                                            .child(
                                                                                v_flex()
                                                                                    .child(
                                                                                        div()
                                                                                            .text_size(
                                                                                                px(14.0),
                                                                                            )
                                                                                            .font_weight(
                                                                                                FontWeight(
                                                                                                    500.0,
                                                                                                ),
                                                                                            )
                                                                                            .text_color(
                                                                                                rgba(
                                                                                                    0x000000ee,
                                                                                                ),
                                                                                            )
                                                                                            .child(
                                                                                                time_label
                                                                                                    .clone(),
                                                                                            ),
                                                                                    )
                                                                                    .child(
                                                                                        div()
                                                                                            .text_size(
                                                                                                px(12.0),
                                                                                            )
                                                                                            .text_color(
                                                                                                rgba(
                                                                                                    0x8e8e93ff,
                                                                                                ),
                                                                                            )
                                                                                            .child(
                                                                                                period
                                                                                                    .clone(),
                                                                                            ),
                                                                                    ),
                                                                            )
                                                                    },
                                                                ),
                                                            ),
                                                    ),
                                            )
                                        }),
                                )
                            })
                            .child(
                                if editing_owner_id.is_some() {
                                    let owner_label = owner_name.clone().unwrap();
                                    let remove_entity = entity.clone();
                                    let picker_entity = entity.clone();
                                    div()
                                        .relative()
                                        .child(
                                            div()
                                                .flex()
                                                .items_center()
                                                .gap(px(6.0))
                                                .px(px(10.0))
                                                .py(px(5.0))
                                                .bg(rgba(0x00000008))
                                                .rounded(px(16.0))
                                                .cursor_pointer()
                                                .on_mouse_down(MouseButton::Left, move |_, _, cx| {
                                                    cx.stop_propagation();
                                                    picker_entity.update(cx, |this, cx| {
                                                        this.toggle_owner_picker(cx);
                                                    });
                                                })
                                                .child(
                                                    Icon::new(IconName::User)
                                                        .size(px(13.0))
                                                        .text_color(rgba(0x5856D6ff)),
                                                )
                                                .child(
                                                    div()
                                                        .px(px(4.0))
                                                        .py(px(1.0))
                                                        .rounded(px(4.0))
                                                        .when(show_owner_picker, |this| {
                                                            this.bg(rgba(0x5856D6ff))
                                                        })
                                                        .child(
                                                            div()
                                                                .text_size(px(13.0))
                                                                .text_color(if show_owner_picker {
                                                                    rgba(0xffffffff)
                                                                } else {
                                                                    rgba(0x000000cc)
                                                                })
                                                                .child(owner_label),
                                                        ),
                                                )
                                                .child(
                                                    div()
                                                        .w(px(16.0))
                                                        .h(px(16.0))
                                                        .rounded(px(8.0))
                                                        .cursor_pointer()
                                                        .flex()
                                                        .items_center()
                                                        .justify_center()
                                                        .hover(|style| style.bg(rgba(0x00000011)))
                                                        .on_mouse_down(
                                                            MouseButton::Left,
                                                            move |_, _, cx| {
                                                                cx.stop_propagation();
                                                                remove_entity.update(cx, |this, cx| {
                                                                    this.remove_owner(cx);
                                                                });
                                                            },
                                                        )
                                                        .child(
                                                            Icon::new(IconName::Close)
                                                                .size(px(10.0))
                                                                .text_color(rgba(0x8e8e93ff)),
                                                        ),
                                                ),
                                        )
                                        .when(show_owner_picker, |this| {
                                            this.child(Self::render_owner_picker(
                                                entity.clone(),
                                                owners.clone(),
                                                editing_owner_id,
                                            ))
                                        })
                                        .into_any_element()
                                } else {
                                    let picker_entity = entity.clone();
                                    div()
                                        .relative()
                                        .child(
                                            div()
                                                .flex()
                                                .items_center()
                                                .gap(px(6.0))
                                                .px(px(10.0))
                                                .py(px(5.0))
                                                .rounded(px(16.0))
                                                .cursor_pointer()
                                                .hover(|style| style.bg(rgba(0x00000008)))
                                                .on_mouse_down(MouseButton::Left, move |_, _, cx| {
                                                    cx.stop_propagation();
                                                    picker_entity.update(cx, |this, cx| {
                                                        this.open_owner_picker(cx);
                                                    });
                                                })
                                                .child(
                                                    Icon::new(IconName::User)
                                                        .size(px(13.0))
                                                        .text_color(rgba(0x5856D6ff)),
                                                )
                                                .child(
                                                    div()
                                                        .text_size(px(13.0))
                                                        .text_color(rgba(0x5856D6ff))
                                                        .child("设置负责人"),
                                                ),
                                        )
                                        .when(show_owner_picker, |this| {
                                            this.child(Self::render_owner_picker(
                                                entity.clone(),
                                                owners.clone(),
                                                editing_owner_id,
                                            ))
                                        })
                                        .into_any_element()
                                },
                            ),
                    ),
            )
    }
}
