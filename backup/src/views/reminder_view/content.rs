use crate::app::App as RemindersApp;
use crate::models::reminder::{
    LocationProximity, LocationTrigger, Priority, Reminder, ReminderList,
};
use crate::repository::ReminderRepository;
use crate::state::ReminderFilter;
use chrono::{Datelike, Duration, Local, NaiveDate, NaiveTime, Timelike, Weekday};
use gpui::prelude::{FluentBuilder, InteractiveElement};
use gpui::*;

use gpui_component::button::{Button, ButtonVariants};
use gpui_component::input::{Input, InputEvent, InputState};
use gpui_component::menu::{ContextMenuExt, DropdownMenu, PopupMenuItem};
use gpui_component::list::{List, ListState};
use gpui_component::popover::{Popover, PopoverState};
use gpui_component::tag::Tag;
use gpui_component::calendar::{Calendar, CalendarEvent, CalendarState, Date};
use gpui_component::Selectable;
use gpui_component::Sizable;

use super::suggestion_list::{
    SuggestionAction, SuggestionEntry, SuggestionListDelegate, SuggestionSection,
};

use gpui_component::{h_flex, v_flex, Icon, IconName};

pub struct ReminderContent;

impl ReminderContent {
    pub fn build(app: &mut RemindersApp, cx: &mut Context<RemindersApp>) -> impl IntoElement {
        let reminders = app.state.get_filtered_reminders();
        let filter = &app.state.reminder_filter;
        let app_entity = cx.entity().clone();
        let is_editing = app.state.editing_reminder_id.is_some();
        let picker_open = app
            .editing_view
            .as_ref()
            .is_some_and(|view| view.read(cx).has_open_picker());

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
        let has_reminders = !reminders.is_empty();

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
                                            app_entity.update(cx, |this, cx| {
                                                let id = this.create_reminder("新提醒");
                                                this.set_editing_reminder(Some(id), cx);
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
                    .when(!picker_open, |this| this.overflow_y_hidden())
                    .flex()
                    .flex_col()
                    .when(reminders.is_empty(), |this| {
                        this.on_mouse_down(MouseButton::Left, {
                            let app_entity = app_entity.clone();
                            move |_, _, cx| {
                                app_entity.update(cx, |this, cx| {
                                    this.set_editing_reminder(None, cx);
                                });
                            }
                        })
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
                    .when(has_reminders, |this| {
                        this.children(reminders.into_iter().map(|reminder| {
                            Self::reminder_item(app, reminder, app_entity.clone(), cx)
                        }))
                    })
                    .when(is_editing && has_reminders && !picker_open, |this| {
                        let app_entity = app_entity.clone();
                        this.child(div().flex_1().min_h(px(48.0)).on_mouse_down(
                            MouseButton::Left,
                            move |_, _, cx| {
                                app_entity.update(cx, |this, cx| {
                                    this.set_editing_reminder(None, cx);
                                });
                            },
                        ))
                    }),
            )
    }

    /// 渲染单个提醒项,包含复选框、标题、日期时间标签和信息按钮
    /// 点击提醒项会显示编辑菜单(PopupMenu)
    fn reminder_item(
        app: &mut RemindersApp,
        reminder: Reminder,
        app_entity: Entity<RemindersApp>,
        cx: &mut Context<RemindersApp>,
    ) -> impl IntoElement {
        let due_date = reminder.due_date;
        let due_time = reminder.due_time;
        let owner_id = reminder.owner_id;
        let reminder_id = reminder.id;
        let is_completed = reminder.is_completed;
        let is_editing = app.state.editing_reminder_id == Some(reminder_id);
        let another_editing = app.state.editing_reminder_id.is_some() && !is_editing;

        // 如果处于编辑状态,渲染编辑视图
        if is_editing {
            if let Some(view) = app.ensure_editing_view(app_entity.clone(), cx) {
                return view.into_any_element();
            }
        }

        let app_entity_clone = app_entity.clone();
        let owners = app.state.owners.clone();
        let owner_name = owner_id
            .and_then(|id| owners.iter().find(|o| o.id == id))
            .map(|o| o.name.clone());

        // 创建编辑菜单的按钮
        let reminder_clone = reminder.clone();
        let app_entity_for_menu = app_entity.clone();
        let edit_menu_btn = Button::new("edit-btn")
            .icon(IconName::Pencil)
            .ghost()
            .small()
            .dropdown_menu(move |menu, window, cx| {
                Self::build_edit_menu(
                    menu,
                    window,
                    cx,
                    app_entity_for_menu.clone(),
                    reminder_id,
                    reminder_clone.clone(),
                )
            });

        div()
            .id(format!("reminder-item-{}", reminder_id))
            .px(px(24.0))
            .py(px(12.0))
            .border_b(px(1.0))
            .border_color(rgba(0x00000008))
            .cursor_pointer()
            .when(another_editing, |this| {
                this.on_mouse_down(MouseButton::Left, |_, _, cx| {
                    cx.stop_propagation();
                })
            })
            .when(!another_editing, |this| {
                this.hover(|style| style.bg(rgba(0x00000004)))
                    .on_mouse_down(MouseButton::Left, {
                        let app_entity = app_entity.clone();
                        move |_, _, cx| {
                            cx.stop_propagation();
                            app_entity.update(cx, |this, cx| {
                                this.set_editing_reminder(Some(reminder_id), cx);
                            });
                        }
                    })
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
                    .child(edit_menu_btn)
                    .child(Self::info_button(app_entity_clone, reminder_id, false)),
            )
            .into_any_element()
    }

    fn checkbox(
        reminder_id: uuid::Uuid,
        is_completed: bool,
        editing: bool,
        app_entity: Entity<RemindersApp>,
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
        app_entity: Entity<RemindersApp>,
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

    /// 构建编辑菜单(PopupMenu),包含编辑标题、设置日期、设置时间等选项
    fn build_edit_menu(
        menu: gpui_component::menu::PopupMenu,
        window: &mut Window,
        _cx: &mut Context<gpui_component::menu::PopupMenu>,
        app_entity: Entity<RemindersApp>,
        reminder_id: uuid::Uuid,
        reminder: Reminder,
    ) -> gpui_component::menu::PopupMenu {
        menu.label("编辑选项")
            .item(PopupMenuItem::new("编辑标题").on_click(window.listener_for(
                &app_entity,
                move |this, _, _, cx| {
                    this.set_editing_reminder(Some(reminder_id), cx);
                },
            )))
            .separator()
            .item(PopupMenuItem::new("设置日期").on_click(window.listener_for(
                &app_entity,
                move |this, _, _, cx| {
                    // 进入编辑模式并标记需要自动打开日期选择器
                    this.set_editing_reminder_with_picker(Some(reminder_id), "date", cx);
                },
            )))
            .item(PopupMenuItem::new("设置时间").on_click(window.listener_for(
                &app_entity,
                move |this, _, _, cx| {
                    this.set_editing_reminder_with_picker(Some(reminder_id), "time", cx);
                },
            )))
            .item(PopupMenuItem::new("设置位置").on_click(window.listener_for(
                &app_entity,
                move |this, _, _, cx| {
                    this.set_editing_reminder_with_picker(Some(reminder_id), "location", cx);
                },
            )))
            .item(
                PopupMenuItem::new("设置负责人").on_click(window.listener_for(
                    &app_entity,
                    move |this, _, _, cx| {
                        this.set_editing_reminder(Some(reminder_id), cx);
                    },
                )),
            )
            .separator()
            .item(
                PopupMenuItem::new(if reminder.is_completed {
                    "标记为未完成"
                } else {
                    "标记为完成"
                })
                .on_click(window.listener_for(
                    &app_entity,
                    move |this, _, _, _cx| {
                        if reminder.is_completed {
                            this.uncomplete_reminder(reminder_id);
                        } else {
                            this.complete_reminder(reminder_id);
                        }
                    },
                )),
            )
            .separator()
            .item(PopupMenuItem::new("显示简介").on_click(window.listener_for(
                &app_entity,
                move |this, _, window, cx| {
                    this.open_reminder_detail(window, cx, reminder_id);
                },
            )))
            .separator()
            .item(PopupMenuItem::new("删除").on_click(window.listener_for(
                &app_entity,
                move |this, _, _, _cx| {
                    this.delete_reminder(reminder_id);
                },
            )))
    }

    fn context_menu(
        app_entity: Entity<RemindersApp>,
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
    app_entity: Entity<RemindersApp>,
    title_input: Option<Entity<InputState>>,
    notes_input: Option<Entity<InputState>>,
    editing_title: String,
    editing_notes: String,
    editing_date: Option<NaiveDate>,
    editing_time: Option<NaiveTime>,
    editing_location: Option<String>,
    editing_owner_id: Option<uuid::Uuid>,
    show_date_picker: bool,
    show_time_picker: bool,
    show_location_picker: bool,
    show_owner_picker: bool,
    pub(crate) auto_open_picker: Option<String>,
    calendar_state: Option<Entity<CalendarState>>,
    _calendar_subscription: Option<Subscription>,
    date_list_state: Option<Entity<ListState<SuggestionListDelegate>>>,
    time_list_state: Option<Entity<ListState<SuggestionListDelegate>>>,
    location_list_state: Option<Entity<ListState<SuggestionListDelegate>>>,
}

impl EditableReminder {
    pub fn reminder_id(&self) -> uuid::Uuid {
        self.reminder.id
    }

    pub fn has_open_picker(&self) -> bool {
        self.show_date_picker || self.show_time_picker || self.show_location_picker
    }

    /// 创建可编辑提醒视图,初始化编辑状态和输入组件
    pub(crate) fn new(
        reminder: Reminder,
        app_entity: Entity<RemindersApp>,
        _cx: &mut Context<Self>,
    ) -> Self {
        Self {
            editing_title: reminder.title.clone(),
            editing_notes: reminder.description.clone().unwrap_or_default(),
            editing_date: reminder.due_date,
            editing_time: reminder.due_time,
            editing_location: reminder.location.as_ref().map(|l| l.address.clone()),
            editing_owner_id: reminder.owner_id,
            show_date_picker: false,
            show_time_picker: false,
            show_location_picker: false,
            show_owner_picker: false,
            title_input: None,
            notes_input: None,
            reminder,
            app_entity,
            auto_open_picker: None,
            calendar_state: None,
            _calendar_subscription: None,
            date_list_state: None,
            time_list_state: None,
            location_list_state: None,
        }
    }

    pub(crate) fn apply_suggestion(&mut self, action: SuggestionAction, cx: &mut Context<Self>) {
        match action {
            SuggestionAction::Date(date) => self.set_date(date, cx),
            SuggestionAction::Time(time) => self.select_time(&time, cx),
            SuggestionAction::Location(location) => self.set_location(location, cx),
        }
    }

    fn ensure_calendar(&mut self, window: &mut Window, cx: &mut Context<Self>) {
        if self.calendar_state.is_some() {
            if let Some(date) = self.editing_date {
                if let Some(state) = &self.calendar_state {
                    state.update(cx, |calendar, cx| {
                        if calendar.date().start() != Some(date) {
                            calendar.set_date(Date::Single(Some(date)), window, cx);
                        }
                    });
                }
            }
            return;
        }

        let entity = cx.entity().clone();
        let initial_date = self.editing_date;
        let calendar = cx.new(|cx| {
            let mut state = CalendarState::new(window, cx);
            if let Some(date) = initial_date {
                state.set_date(Date::Single(Some(date)), window, cx);
            }
            state
        });

        let subscription = cx.subscribe_in(&calendar, window, move |_, _, ev: &CalendarEvent, _, cx| {
            let CalendarEvent::Selected(date) = ev;
                if let Some(selected) = date.start() {
                    entity.update(cx, |this, cx| {
                        this.set_date(selected, cx);
                    });
                }
            }
        });

        self.calendar_state = Some(calendar);
        self._calendar_subscription = Some(subscription);
    }

    fn ensure_date_list(&mut self, window: &mut Window, cx: &mut Context<Self>) {
        let quick_options: Vec<_> = Self::generate_date_options().into_iter().take(3).collect();
        let confirmed = self
            .editing_date
            .map(SuggestionAction::Date);
        let sections = vec![SuggestionSection {
            title: "建议".into(),
            items: quick_options
                .into_iter()
                .map(|(date, label, subtitle)| SuggestionEntry {
                    icon: IconName::Calendar,
                    icon_color: rgba(0x007AFFff).into(),
                    primary: label.into(),
                    secondary: subtitle.map(Into::into),
                    action: SuggestionAction::Date(date),
                })
                .collect(),
        }];

        let entity = cx.entity().clone();
        Self::refresh_list_state(
            &mut self.date_list_state,
            sections,
            confirmed,
            entity,
            window,
            cx,
        );
    }

    fn ensure_time_list(&mut self, window: &mut Window, cx: &mut Context<Self>) {
        let confirmed = self.editing_time.map(|time| {
            SuggestionAction::Time(time.format("%H:%M").to_string())
        });
        let sections = vec![SuggestionSection {
            title: "建议".into(),
            items: Self::generate_time_options()
                .into_iter()
                .map(|(time_val, time_label, period)| SuggestionEntry {
                    icon: IconName::Clock,
                    icon_color: rgba(0xff9500ff).into(),
                    primary: time_label.into(),
                    secondary: Some(period.into()),
                    action: SuggestionAction::Time(time_val),
                })
                .collect(),
        }];

        let entity = cx.entity().clone();
        Self::refresh_list_state(
            &mut self.time_list_state,
            sections,
            confirmed,
            entity,
            window,
            cx,
        );
    }

    fn ensure_location_list(&mut self, window: &mut Window, cx: &mut Context<Self>) {
        let confirmed = self
            .editing_location
            .clone()
            .map(SuggestionAction::Location);
        let sections = vec![SuggestionSection {
            title: "建议".into(),
            items: vec![
                ("家".to_string(), "到达时".to_string()),
                ("公司".to_string(), "到达时".to_string()),
                ("当前位置".to_string(), "离开时".to_string()),
            ]
            .into_iter()
            .map(|(label, subtitle)| SuggestionEntry {
                icon: IconName::MapPin,
                icon_color: rgba(0x5856D6ff).into(),
                primary: label.clone().into(),
                secondary: Some(subtitle.into()),
                action: SuggestionAction::Location(label),
            })
            .collect(),
        }];

        let entity = cx.entity().clone();
        Self::refresh_list_state(
            &mut self.location_list_state,
            sections,
            confirmed,
            entity,
            window,
            cx,
        );
    }

    fn refresh_list_state(
        state: &mut Option<Entity<ListState<SuggestionListDelegate>>>,
        sections: Vec<SuggestionSection>,
        confirmed: Option<SuggestionAction>,
        reminder_entity: Entity<EditableReminder>,
        window: &mut Window,
        cx: &mut Context<Self>,
    ) {
        if let Some(list_state) = state {
            list_state.update(cx, |list, cx| {
                list.delegate_mut().set_data(sections, confirmed);
                cx.notify();
            });
            return;
        }

        let delegate = SuggestionListDelegate::new(sections, confirmed, reminder_entity);
        *state = Some(cx.new(|cx| ListState::new(delegate, window, cx)));
    }

    fn build_date_popover(&mut self, window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        self.ensure_calendar(window, cx);
        self.ensure_date_list(window, cx);

        let date_list = self.date_list_state.as_ref().unwrap().clone();
        let calendar = self.calendar_state.as_ref().unwrap().clone();

        v_flex()
            .w(px(300.0))
            .max_h(px(420.0))
            .child(
                List::new(&date_list)
                    .small()
                    .max_h(px(168.0))
                    .scrollbar_visible(true),
            )
            .child(
                div()
                    .px(px(8.0))
                    .py(px(4.0))
                    .text_size(px(11.0))
                    .font_weight(FontWeight(600.0))
                    .text_color(rgba(0x8e8e93ff))
                    .child("具体日期"),
            )
            .child(
                Calendar::new(&calendar)
                    .number_of_months(1)
                    .small()
                    .border_0()
                    .p_0(),
            )
    }

    fn build_time_popover(&mut self, window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        self.ensure_time_list(window, cx);
        let time_list = self.time_list_state.as_ref().unwrap().clone();

        v_flex()
            .w(px(260.0))
            .max_h(px(320.0))
            .child(
                List::new(&time_list)
                    .small()
                    .max_h(px(280.0))
                    .scrollbar_visible(true),
            )
    }

    fn build_location_popover(&mut self, window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        self.ensure_location_list(window, cx);
        let location_list = self.location_list_state.as_ref().unwrap().clone();

        v_flex()
            .w(px(260.0))
            .max_h(px(240.0))
            .child(
                List::new(&location_list)
                    .small()
                    .max_h(px(220.0))
                    .scrollbar_visible(true),
            )
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
                r.location = self
                    .editing_location
                    .as_ref()
                    .map(|address| LocationTrigger {
                        address: address.clone(),
                        latitude: None,
                        longitude: None,
                        radius: 100.0,
                        proximity: LocationProximity::Arriving,
                    });
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

    /// 选择日期后更新提醒数据,但不关闭选择器以保持编辑状态
    fn set_date(&mut self, date: NaiveDate, cx: &mut Context<Self>) {
        self.editing_date = Some(date);
        // 不立即关闭选择器,保持编辑状态
        self.sync_to_app(cx);
        cx.notify();
    }

    fn open_date_picker(&mut self, cx: &mut Context<Self>) {
        self.show_date_picker = true;
        self.show_time_picker = false;
        self.show_location_picker = false;
        cx.notify();
    }

    fn close_date_picker(&mut self, cx: &mut Context<Self>) {
        self.show_date_picker = false;
        cx.notify();
    }

    fn toggle_date_picker(&mut self, cx: &mut Context<Self>) {
        self.show_date_picker = !self.show_date_picker;
        if self.show_date_picker {
            self.show_time_picker = false;
            self.show_location_picker = false;
        }
        cx.notify();
    }

    fn remove_time(&mut self, cx: &mut Context<Self>) {
        self.editing_time = None;
        self.show_time_picker = false;
        self.sync_to_app(cx);
        cx.notify();
    }

    /// 选择时间后更新提醒数据,但不关闭选择器以保持编辑状态
    fn select_time(&mut self, time_str: &str, cx: &mut Context<Self>) {
        if let Ok(time) = NaiveTime::parse_from_str(time_str, "%H:%M") {
            self.editing_time = Some(time);
        }
        // 不立即关闭选择器,保持编辑状态
        self.sync_to_app(cx);
        cx.notify();
    }

    fn open_time_picker(&mut self, cx: &mut Context<Self>) {
        self.show_time_picker = true;
        self.show_date_picker = false;
        self.show_location_picker = false;
        cx.notify();
    }

    fn close_time_picker(&mut self, cx: &mut Context<Self>) {
        self.show_time_picker = false;
        cx.notify();
    }

    fn toggle_time_picker(&mut self, cx: &mut Context<Self>) {
        self.show_time_picker = !self.show_time_picker;
        if self.show_time_picker {
            self.show_date_picker = false;
            self.show_location_picker = false;
        }
        cx.notify();
    }

    fn remove_location(&mut self, cx: &mut Context<Self>) {
        self.editing_location = None;
        self.show_location_picker = false;
        self.sync_to_app(cx);
        cx.notify();
    }

    fn set_location(&mut self, address: String, cx: &mut Context<Self>) {
        self.editing_location = Some(address);
        self.sync_to_app(cx);
        cx.notify();
    }

    fn open_location_picker(&mut self, cx: &mut Context<Self>) {
        self.show_location_picker = true;
        self.show_date_picker = false;
        self.show_time_picker = false;
        cx.notify();
    }

    fn close_location_picker(&mut self, cx: &mut Context<Self>) {
        self.show_location_picker = false;
        cx.notify();
    }

    fn toggle_location_picker(&mut self, cx: &mut Context<Self>) {
        self.show_location_picker = !self.show_location_picker;
        if self.show_location_picker {
            self.show_date_picker = false;
            self.show_time_picker = false;
        }
        cx.notify();
    }

    fn remove_owner(&mut self, cx: &mut Context<Self>) {
        self.editing_owner_id = None;
        self.show_owner_picker = false;
        self.sync_to_app(cx);
        cx.notify();
    }

    /// 选择负责人后更新提醒数据,但不关闭选择器以保持编辑状态
    fn set_owner(&mut self, owner_id: uuid::Uuid, cx: &mut Context<Self>) {
        self.editing_owner_id = Some(owner_id);
        // 不立即关闭选择器,保持编辑状态
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

    fn chip_tag(label: impl Into<SharedString>, icon: IconName, icon_color: Rgba) -> Tag {
        Tag::custom(
            rgba(0x00000008).into(),
            rgba(0x000000cc).into(),
            rgba(0x00000000).into(),
        )
        .small()
        .rounded_full()
        .child(Icon::new(icon).size(px(13.0)).text_color(icon_color))
        .child(label.into())
    }

    fn chip_tag_placeholder(
        label: impl Into<SharedString>,
        icon: IconName,
        icon_color: Rgba,
    ) -> Tag {
        Tag::custom(
            rgba(0x00000000).into(),
            icon_color.into(),
            rgba(0x00000000).into(),
        )
        .small()
        .rounded_full()
        .child(Icon::new(icon).size(px(13.0)).text_color(icon_color))
        .child(label.into())
    }

    fn chip_close_button(
        entity: Entity<EditableReminder>,
        on_remove: fn(&mut EditableReminder, &mut Context<EditableReminder>),
    ) -> impl IntoElement {
        div()
            .w(px(16.0))
            .h(px(16.0))
            .rounded(px(8.0))
            .cursor_pointer()
            .flex()
            .items_center()
            .justify_center()
            .hover(|style| style.bg(rgba(0x00000011)))
            .on_mouse_down(MouseButton::Left, move |_, window, cx| {
                window.prevent_default();
                cx.stop_propagation();
                entity.update(cx, on_remove);
            })
            .child(
                Icon::new(IconName::Close)
                    .size(px(10.0))
                    .text_color(rgba(0x8e8e93ff)),
            )
    }

    fn generate_time_options() -> Vec<(String, String, String)> {
        let now = Local::now().time();
        let base_hour = now.hour();

        let candidate_hours = [
            base_hour,
            (base_hour + 1) % 24,
            (base_hour + 2) % 24,
            (base_hour + 3) % 24,
            if base_hour < 12 { 12 } else { 18 },
        ];

        let mut options = Vec::new();
        let mut seen = std::collections::HashSet::new();

        for hour in candidate_hours {
            if !seen.insert(hour) {
                continue;
            }
            if let Some(time) = NaiveTime::from_hms_opt(hour, 0, 0) {
                options.push((
                    time.format("%H:%M").to_string(),
                    Self::format_time_display(time),
                    Self::time_period_label(hour),
                ));
            }
        }

        if options.len() < 5 {
            for (hour, period) in [
                (9, "上午"),
                (12, "中午"),
                (15, "下午"),
                (18, "晚上"),
                (21, "夜间"),
            ] {
                if options.len() >= 5 {
                    break;
                }
                if !seen.insert(hour) {
                    continue;
                }
                if let Some(time) = NaiveTime::from_hms_opt(hour, 0, 0) {
                    options.push((
                        time.format("%H:%M").to_string(),
                        Self::format_time_display(time),
                        period.to_string(),
                    ));
                }
            }
        }

        options
    }

    fn time_period_label(hour: u32) -> String {
        match hour {
            0..=11 => "上午".to_string(),
            12 => "中午".to_string(),
            13..=17 => "下午".to_string(),
            18..=21 => "晚上".to_string(),
            _ => "夜间".to_string(),
        }
    }

    fn render_chip_popover<F, E>(
        id: SharedString,
        entity: Entity<EditableReminder>,
        open: bool,
        trigger: impl IntoElement + Selectable + 'static,
        content: F,
        on_open_change: impl Fn(bool, Entity<EditableReminder>, &mut App) + 'static,
    ) -> impl IntoElement
    where
        F: Fn(&mut PopoverState, &mut Window, &mut Context<PopoverState>) -> E + 'static,
        E: IntoElement,
    {
        Popover::new(id)
            .anchor(Anchor::TopLeft)
            .open(open)
            .overlay_closable(true)
            .on_open_change(move |is_open, _, cx| {
                on_open_change(*is_open, entity.clone(), cx);
            })
            .trigger(trigger)
            .content(content)
    }
}

impl Render for EditableReminder {
    fn render(&mut self, window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        // 处理自动打开选择器
        if let Some(picker_type) = &self.auto_open_picker {
            match picker_type.as_str() {
                "date" => self.open_date_picker(cx),
                "time" => self.open_time_picker(cx),
                "location" => self.open_location_picker(cx),
                _ => {}
            }
            self.auto_open_picker = None;
        }

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
        let show_date_picker = self.show_date_picker;
        let show_time_picker = self.show_time_picker;
        let show_location_picker = self.show_location_picker;
        let editing_time = self.editing_time;
        let editing_location = self.editing_location.clone();
        let time_display = editing_time.map(Self::format_time_display);

        let lists = app_entity.read(cx).state.lists.clone();

        let date_remove_entity = entity.clone();
        let time_remove_entity = entity.clone();
        let location_remove_entity = entity.clone();

        let date_chip = if let Some(date_label) = formatted_date.clone() {
            let picker_entity = entity.clone();
            Self::render_chip_popover(
                format!("date-chip-{}", reminder_id).into(),
                entity.clone(),
                show_date_picker,
                Button::new(format!("date-trigger-{}", reminder_id))
                    .ghost()
                    .small()
                    .child(
                        h_flex()
                            .items_center()
                            .gap(px(6.0))
                            .px(px(10.0))
                            .py(px(5.0))
                            .bg(rgba(0x00000008))
                            .rounded(px(16.0))
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
                                    .when(show_date_picker, |this| this.bg(rgba(0x007AFFff)))
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
                            .child(Self::chip_close_button(
                                date_remove_entity,
                                EditableReminder::remove_date,
                            )),
                    ),
                move |_, window, cx| {
                    picker_entity.update(cx, |this, cx| this.build_date_popover(window, cx))
                },
                move |open, picker_entity, cx| {
                    picker_entity.update(cx, |this, cx| {
                        if open {
                            this.open_date_picker(cx);
                        } else {
                            this.close_date_picker(cx);
                        }
                    });
                },
            )
            .into_any_element()
        } else {
            let picker_entity = entity.clone();
            Self::render_chip_popover(
                format!("add-date-chip-{}", reminder_id).into(),
                entity.clone(),
                show_date_picker,
                Button::new(format!("add-date-trigger-{}", reminder_id))
                    .ghost()
                    .small()
                    .child(Self::chip_tag_placeholder(
                        "添加日期",
                        IconName::Calendar,
                        rgba(0x007AFFff),
                    )),
                move |_, window, cx| {
                    picker_entity.update(cx, |this, cx| this.build_date_popover(window, cx))
                },
                move |open, picker_entity, cx| {
                    picker_entity.update(cx, |this, cx| {
                        if open {
                            this.open_date_picker(cx);
                        } else {
                            this.close_date_picker(cx);
                        }
                    });
                },
            )
            .into_any_element()
        };

        let time_chip = if let Some(time_label) = time_display.clone() {
            let picker_entity = entity.clone();
            Self::render_chip_popover(
                format!("time-chip-{}", reminder_id).into(),
                entity.clone(),
                show_time_picker,
                Button::new(format!("time-trigger-{}", reminder_id))
                    .ghost()
                    .small()
                    .child(
                        h_flex()
                            .items_center()
                            .gap(px(6.0))
                            .px(px(10.0))
                            .py(px(5.0))
                            .bg(rgba(0x00000008))
                            .rounded(px(16.0))
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
                                    .when(show_time_picker, |this| this.bg(rgba(0x007AFFff)))
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
                            .child(Self::chip_close_button(
                                time_remove_entity,
                                EditableReminder::remove_time,
                            )),
                    ),
                move |_, window, cx| {
                    picker_entity.update(cx, |this, cx| this.build_time_popover(window, cx))
                },
                move |open, picker_entity, cx| {
                    picker_entity.update(cx, |this, cx| {
                        if open {
                            this.open_time_picker(cx);
                        } else {
                            this.close_time_picker(cx);
                        }
                    });
                },
            )
            .into_any_element()
        } else {
            let picker_entity = entity.clone();
            Self::render_chip_popover(
                format!("add-time-chip-{}", reminder_id).into(),
                entity.clone(),
                show_time_picker,
                Button::new(format!("add-time-trigger-{}", reminder_id))
                    .ghost()
                    .small()
                    .child(Self::chip_tag_placeholder(
                        "添加时间",
                        IconName::Clock,
                        rgba(0xff9500ff),
                    )),
                move |_, window, cx| {
                    picker_entity.update(cx, |this, cx| this.build_time_popover(window, cx))
                },
                move |open, picker_entity, cx| {
                    picker_entity.update(cx, |this, cx| {
                        if open {
                            this.open_time_picker(cx);
                        } else {
                            this.close_time_picker(cx);
                        }
                    });
                },
            )
            .into_any_element()
        };

        let location_label = editing_location.clone();
        let location_chip = if let Some(location_name) = location_label.clone() {
            let picker_entity = entity.clone();
            Self::render_chip_popover(
                format!("location-chip-{}", reminder_id).into(),
                entity.clone(),
                show_location_picker,
                Button::new(format!("location-trigger-{}", reminder_id))
                    .ghost()
                    .small()
                    .child(
                        h_flex()
                            .items_center()
                            .gap(px(6.0))
                            .px(px(10.0))
                            .py(px(5.0))
                            .bg(rgba(0x00000008))
                            .rounded(px(16.0))
                            .child(
                                Icon::new(IconName::MapPin)
                                    .size(px(13.0))
                                    .text_color(rgba(0x5856D6ff)),
                            )
                            .child(
                                div()
                                    .px(px(4.0))
                                    .py(px(1.0))
                                    .rounded(px(4.0))
                                    .when(show_location_picker, |this| this.bg(rgba(0x007AFFff)))
                                    .child(
                                        div()
                                            .text_size(px(13.0))
                                            .text_color(if show_location_picker {
                                                rgba(0xffffffff)
                                            } else {
                                                rgba(0x000000cc)
                                            })
                                            .child(location_name),
                                    ),
                            )
                            .child(Self::chip_close_button(
                                location_remove_entity,
                                EditableReminder::remove_location,
                            )),
                    ),
                move |_, window, cx| {
                    picker_entity.update(cx, |this, cx| this.build_location_popover(window, cx))
                },
                move |open, picker_entity, cx| {
                    picker_entity.update(cx, |this, cx| {
                        if open {
                            this.open_location_picker(cx);
                        } else {
                            this.close_location_picker(cx);
                        }
                    });
                },
            )
            .into_any_element()
        } else {
            let picker_entity = entity.clone();
            Self::render_chip_popover(
                format!("add-location-chip-{}", reminder_id).into(),
                entity.clone(),
                show_location_picker,
                Button::new(format!("add-location-trigger-{}", reminder_id))
                    .ghost()
                    .small()
                    .child(Self::chip_tag_placeholder(
                        "添加位置",
                        IconName::MapPin,
                        rgba(0x5856D6ff),
                    )),
                move |_, window, cx| {
                    picker_entity.update(cx, |this, cx| this.build_location_popover(window, cx))
                },
                move |open, picker_entity, cx| {
                    picker_entity.update(cx, |this, cx| {
                        if open {
                            this.open_location_picker(cx);
                        } else {
                            this.close_location_picker(cx);
                        }
                    });
                },
            )
            .into_any_element()
        };

        div()
            .id(format!("reminder-item-{}", reminder_id))
            .px(px(24.0))
            .py(px(12.0))
            .border_b(px(1.0))
            .border_color(rgba(0x00000008))
            .bg(rgba(0xf8f9fbff))
            .on_mouse_down(MouseButton::Left, |_, window, cx| {
                window.prevent_default();
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
                                div()
                                    .w_full()
                                    .on_mouse_down(MouseButton::Left, |_, _, cx| {
                                        cx.stop_propagation();
                                    })
                                    .child(if let Some(input) = &self.title_input {
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
                                    }),
                            )
                            .child(
                                div()
                                    .w_full()
                                    .on_mouse_down(MouseButton::Left, |_, _, cx| {
                                        cx.stop_propagation();
                                    })
                                    .child(if let Some(input) = &self.notes_input {
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
                                    }),
                            ),
                    )
                    .child(ReminderContent::info_button(
                        app_entity.clone(),
                        reminder_id,
                        true,
                    )),
            )
            .child(
                h_flex()
                    .mt(px(10.0))
                    .gap(px(8.0))
                    .flex_wrap()
                    .child(date_chip)
                    .child(time_chip)
                    .child(location_chip),
            )
    }
}
