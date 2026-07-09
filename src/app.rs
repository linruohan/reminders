use crate::database::Database;
use crate::models::owner::Owner;
use crate::models::reminder::{Priority, Reminder, ReminderList};
use crate::repository::{ListRepository, OwnerRepository, ReminderRepository};
use crate::state::AppState;
use crate::state::AppView;
use crate::views::calendar_view::CalendarView;
use crate::views::header::Header;
use crate::views::modal::{AddReminderModal, EventDetailModal};
use crate::views::reminder_view::content::EditableReminder;
use crate::views::reminder_view::ReminderView;
use chrono::Local;
use gpui::prelude::FluentBuilder;
use gpui::*;
use gpui_component::input::{InputEvent, InputState};
use gpui_component::scroll::ScrollableElement;
use gpui_component::{Icon, IconName, Placement, Root, WindowExt};
use uuid::Uuid;

pub struct App {
    pub state: AppState,
    pub db: Database,
    pub search_input_state: Option<Entity<InputState>>,
    pub _search_subscription: Option<Subscription>,
    pub editing_view: Option<Entity<EditableReminder>>,
}

impl App {
    pub fn open_reminder_detail(
        &mut self,
        window: &mut Window,
        cx: &mut Context<Self>,
        reminder_id: Uuid,
    ) {
        let reminder = self.state.reminders.iter().find(|r| r.id == reminder_id);
        if reminder.is_none() {
            return;
        }

        let reminder = reminder.unwrap();
        let title = reminder.title.clone();
        let description = reminder.description.clone().unwrap_or_default();

        let date_str = reminder
            .due_date
            .map(|d| d.format("%m月%d日").to_string())
            .unwrap_or_default();
        let time_str = reminder
            .due_time
            .map(|t| t.format("%H:%M").to_string())
            .unwrap_or_default();

        let list_name = self.state.list_name(reminder.list_id);
        let priority_label = Self::priority_label(&reminder.priority);
        let url = reminder.url.clone().unwrap_or_default();
        let recurrence = reminder
            .recurrence
            .as_ref()
            .map(|r| r.display_string())
            .unwrap_or_default();
        let location = reminder
            .location
            .as_ref()
            .map(|l| l.address.clone())
            .unwrap_or_default();
        let owner_name = self.state.owner_name(reminder.owner_id);
        let is_completed = reminder.is_completed;
        let delete_app = cx.entity().clone();
        let complete_app = cx.entity().clone();
        let edit_app = cx.entity().clone();

        window.open_sheet_at(Placement::Right, cx, move |sheet, _, _| {
            sheet
                .title(
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
                .size(px(320.0))
                .child(
                    div()
                        .flex_1()
                        .p(px(16.0))
                        .flex()
                        .flex_col()
                        .overflow_y_scrollbar()
                        .child(
                            div()
                                .flex_1()
                                .text_size(px(18.0))
                                .text_color(rgba(0x000000ee))
                                .child(title.clone()),
                        )
                        .when(!description.is_empty(), |this| {
                            this.child(
                                div()
                                    .mt(px(8.0))
                                    .text_size(px(14.0))
                                    .text_color(rgba(0x8e8e93ff))
                                    .child(description.clone()),
                            )
                        })
                        .when(!url.is_empty(), |this| {
                            this.child(
                                div()
                                    .mt(px(12.0))
                                    .text_size(px(13.0))
                                    .text_color(rgba(0x007AFFff))
                                    .child(url.clone()),
                            )
                        })
                        .when(!date_str.is_empty() || !time_str.is_empty(), |this| {
                            let time_text = if date_str.is_empty() {
                                time_str.clone()
                            } else if time_str.is_empty() {
                                date_str.clone()
                            } else {
                                format!("{} {}", date_str.clone(), time_str.clone())
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
                        })
                        .when(!recurrence.is_empty(), |this| {
                            this.child(
                                div()
                                    .mt(px(12.0))
                                    .text_size(px(13.0))
                                    .text_color(rgba(0x8e8e93ff))
                                    .child(format!("重复: {}", recurrence)),
                            )
                        })
                        .when(!location.is_empty(), |this| {
                            this.child(
                                div()
                                    .mt(px(12.0))
                                    .text_size(px(13.0))
                                    .text_color(rgba(0x34c759ff))
                                    .child(location.clone()),
                            )
                        })
                        .when(!owner_name.is_empty(), |this| {
                            this.child(
                                div()
                                    .mt(px(12.0))
                                    .flex()
                                    .items_center()
                                    .gap(px(8.0))
                                    .child(
                                        Icon::new(IconName::User)
                                            .text_color(rgba(0x5856D6ff))
                                            .size(px(14.0)),
                                    )
                                    .child(
                                        div()
                                            .text_size(px(13.0))
                                            .text_color(rgba(0x5856D6ff))
                                            .child(format!("负责人: {}", owner_name)),
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
                                .child(list_name.clone()),
                        )
                        .child(
                            div()
                                .text_size(px(13.0))
                                .text_color(rgba(0x8e8e93ff))
                                .child(format!("优先级: {}", priority_label)),
                        ),
                )
                .footer(
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
                                    let app = delete_app.clone();
                                    move |_, window, cx| {
                                        app.update(cx, |this, _| {
                                            this.delete_reminder(reminder_id);
                                        });
                                        window.close_sheet(cx);
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
                                .on_mouse_down(MouseButton::Left, {
                                    let app = complete_app.clone();
                                    move |_, window, cx| {
                                        app.update(cx, |this, _| {
                                            if is_completed {
                                                this.uncomplete_reminder(reminder_id);
                                            } else {
                                                this.complete_reminder(reminder_id);
                                            }
                                        });
                                        window.close_sheet(cx);
                                    }
                                })
                                .child(if is_completed {
                                    "标记未完成"
                                } else {
                                    "完成"
                                }),
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
                                .on_mouse_down(MouseButton::Left, {
                                    let app = edit_app.clone();
                                    move |_, window, cx| {
                                        window.close_sheet(cx);
                                        app.update(cx, |this, cx| {
                                            this.set_editing_reminder(Some(reminder_id), cx);
                                        });
                                    }
                                })
                                .child("编辑"),
                        ),
                )
                .on_close(move |_, _, _| {})
        });
    }

    pub fn new(db: Database, _cx: &mut Context<Self>) -> Self {
        let mut state = AppState::new();

        let reminder_repo = ReminderRepository::new(db.conn());
        let list_repo = ListRepository::new(db.conn());
        let owner_repo = OwnerRepository::new(db.conn());

        if let Ok(reminders) = reminder_repo.get_all() {
            state.reminders = reminders;
        }

        if let Ok(lists) = list_repo.get_all() {
            state.lists = lists;
        }

        if let Ok(owners) = owner_repo.get_all() {
            state.owners = owners;
        }

        Self {
            state,
            db,
            search_input_state: None,
            _search_subscription: None,
            editing_view: None,
        }
    }

    /// 设置当前正在编辑的提醒ID,不指定选择器类型
    pub fn set_editing_reminder(&mut self, id: Option<Uuid>, _cx: &mut Context<Self>) {
        if self.state.editing_reminder_id == id {
            return;
        }
        self.state.set_editing_reminder(id);
        self.editing_view = None;
    }

    /// 设置当前正在编辑的提醒ID,并指定需要自动打开的选择器类型
    pub fn set_editing_reminder_with_picker(
        &mut self,
        id: Option<Uuid>,
        picker_type: &str,
        cx: &mut Context<Self>,
    ) {
        // 先设置编辑状态
        self.set_editing_reminder(id, cx);

        // 如果设置了编辑ID,确保编辑视图存在并设置选择器类型
        if let Some(_editing_id) = id {
            if let Some(view) = self.ensure_editing_view(cx.entity().clone(), cx) {
                view.update(cx, |view, cx| {
                    view.auto_open_picker = Some(picker_type.to_string());
                    cx.notify();
                });
            }
        }
    }

    pub fn ensure_editing_view(
        &mut self,
        app_entity: Entity<App>,
        cx: &mut Context<Self>,
    ) -> Option<Entity<EditableReminder>> {
        let editing_id = self.state.editing_reminder_id?;
        if let Some(view) = &self.editing_view {
            if view.read(cx).reminder_id() == editing_id {
                return Some(view.clone());
            }
        }

        let reminder = self
            .state
            .reminders
            .iter()
            .find(|r| r.id == editing_id)
            .cloned()?;

        let view = cx.new(|cx| EditableReminder::new(reminder, app_entity, cx));
        self.editing_view = Some(view.clone());
        Some(view)
    }

    pub fn init_search_input(&mut self, window: &mut Window, cx: &mut Context<Self>) {
        if self.search_input_state.is_none() {
            let search_input_state = cx.new(|cx| InputState::new(window, cx).placeholder("搜索"));
            let app_entity = cx.entity().clone();
            let subscription = cx.subscribe_in(&search_input_state, window, {
                let search_input_state = search_input_state.clone();
                let app_entity = app_entity.clone();
                move |_, _, ev: &InputEvent, _, cx| {
                    if let InputEvent::PressEnter { .. } = ev {
                        let value = search_input_state.read(cx).value();
                        if !value.trim().is_empty() {
                            app_entity.update(cx, |this, _| {
                                this.state.set_reminder_filter(
                                    crate::state::ReminderFilter::Search(value.trim().to_string()),
                                );
                            });
                        }
                    }
                }
            });
            self.search_input_state = Some(search_input_state);
            self._search_subscription = Some(subscription);
        }
    }

    fn build(&mut self, window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        self.init_search_input(window, cx);
        let current_view = self.state.current_view;
        let show_modal = self.state.show_add_modal;
        let sheet_layer = Root::render_sheet_layer(window, cx);

        div()
            .flex()
            .flex_col()
            .w_full()
            .h_full()
            .bg(rgb(0xffffff))
            .child(Header::build(self, cx))
            .child(
                div()
                    .flex_1()
                    .when(current_view == AppView::Reminder, |this| {
                        this.child(ReminderView::build(self, cx))
                    })
                    .when(current_view == AppView::Calendar, |this| {
                        this.child(CalendarView::build(self, cx))
                    }),
            )
            .when(show_modal, |this| this.child(AddReminderModal::build(self)))
            .when(self.state.show_event_modal, |this| {
                this.child(EventDetailModal::build(self, cx))
            })
            .children(sheet_layer)
    }

    pub fn persist_reminder(&mut self, id: Uuid) {
        if let Some(reminder) = self.state.reminders.iter().find(|r| r.id == id).cloned() {
            let repo = ReminderRepository::new(self.db.conn());
            let _ = repo.update(&reminder);
        }
    }

    pub fn create_reminder(&mut self, title: &str) -> Uuid {
        let today = Local::now().date_naive();
        let mut reminder = Reminder::new(title.to_string());
        reminder.due_date = Some(today);
        if let Some(list_id) = self.state.default_list_id() {
            reminder.list_id = Some(list_id);
        }
        let id = reminder.id;
        let repo = ReminderRepository::new(self.db.conn());
        let _ = repo.insert(&reminder);
        self.state.add_reminder(reminder);
        id
    }

    pub fn delete_reminder(&mut self, id: Uuid) {
        let repo = ReminderRepository::new(self.db.conn());
        let _ = repo.delete(&id);
        if self.state.editing_reminder_id == Some(id) {
            self.editing_view = None;
        }
        self.state.delete_reminder(id);
    }

    pub fn complete_reminder(&mut self, id: Uuid) {
        self.state.toggle_completed(id);
        self.persist_reminder(id);
    }

    pub fn uncomplete_reminder(&mut self, id: Uuid) {
        self.state.toggle_completed(id);
        self.persist_reminder(id);
    }

    pub fn set_priority(&mut self, id: Uuid, priority: Priority) {
        self.state.set_priority(id, priority);
        self.persist_reminder(id);
    }

    pub fn move_reminder_to_list(&mut self, id: Uuid, list_id: Uuid) {
        self.state.move_reminder_to_list(id, list_id);
        self.persist_reminder(id);
    }

    pub fn set_due_tomorrow(&mut self, id: Uuid) {
        self.state.set_due_tomorrow(id);
        self.persist_reminder(id);
    }

    pub fn create_list(&mut self, name: &str) -> Uuid {
        let list = ReminderList::new(name.to_string());
        let id = list.id;
        let repo = ListRepository::new(self.db.conn());
        let _ = repo.insert(&list);
        self.state.add_list(list);
        id
    }

    pub fn create_owner(&mut self, name: &str) -> Uuid {
        let owner = Owner::new(name.to_string());
        let id = owner.id;
        let repo = OwnerRepository::new(self.db.conn());
        let _ = repo.insert(&owner);
        self.state.add_owner(owner);
        id
    }

    pub fn delete_owner(&mut self, id: Uuid) {
        let repo = OwnerRepository::new(self.db.conn());
        let _ = repo.delete(&id);
        self.state.delete_owner(id);
    }

    fn priority_label(priority: &Priority) -> &'static str {
        match priority {
            Priority::None => "无",
            Priority::High => "高",
            Priority::Medium => "中",
            Priority::Low => "低",
        }
    }

    pub fn refresh_from_db(&mut self) {
        let reminder_repo = ReminderRepository::new(self.db.conn());
        let list_repo = ListRepository::new(self.db.conn());
        let owner_repo = OwnerRepository::new(self.db.conn());

        if let Ok(reminders) = reminder_repo.get_all() {
            self.state.reminders = reminders;
        }

        if let Ok(lists) = list_repo.get_all() {
            self.state.lists = lists;
        }

        if let Ok(owners) = owner_repo.get_all() {
            self.state.owners = owners;
        }
    }
}

impl Render for App {
    fn render(&mut self, window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        self.build(window, cx)
    }
}
