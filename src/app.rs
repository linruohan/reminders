use crate::database::Database;
use crate::repository::{ListRepository, ReminderRepository};
use crate::state::AppState;
use crate::state::AppView;
use crate::views::calendar_view::CalendarView;
use crate::views::header::Header;
use crate::views::modal::{AddReminderModal, EventDetailModal};
use crate::views::reminder_view::ReminderView;
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

        let list_name = reminder
            .list_id
            .and_then(|id| self.state.lists.iter().find(|l| l.id == id))
            .map(|l| l.name.clone())
            .unwrap_or_else(|| "默认".to_string());

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
                        .child(
                            div()
                                .mt(px(8.0))
                                .text_size(px(14.0))
                                .text_color(rgba(0x8e8e93ff))
                                .child(description.clone()),
                        )
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
                                .on_mouse_down(MouseButton::Left, move |_, window, cx| {
                                    window.close_sheet(cx);
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
                                    window.close_sheet(cx);
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
                .on_close(move |_, _, _| {})
        });
    }

    pub fn new(db: Database, _cx: &mut Context<Self>) -> Self {
        let mut state = AppState::new();

        let reminder_repo = ReminderRepository::new(db.conn());
        let list_repo = ListRepository::new(db.conn());

        if let Ok(reminders) = reminder_repo.get_all() {
            state.reminders = reminders;
        }

        if let Ok(lists) = list_repo.get_all() {
            state.lists = lists;
        }

        Self {
            state,
            db,
            search_input_state: None,
            _search_subscription: None,
        }
    }

    pub fn init_search_input(&mut self, window: &mut Window, cx: &mut Context<Self>) {
        if self.search_input_state.is_none() {
            let search_input_state = cx.new(|cx| InputState::new(window, cx).placeholder("搜索"));
            let app_entity = cx.entity().clone();
            let subscription = cx.subscribe_in(&search_input_state, window, {
                let search_input_state = search_input_state.clone();
                let app_entity = app_entity.clone();
                move |_, _, ev: &InputEvent, _, cx| if let InputEvent::PressEnter { .. } = ev {
                    let value = search_input_state.read(cx).value();
                    if !value.trim().is_empty() {
                        app_entity.update(cx, |this, _| {
                            this.state.set_reminder_filter(
                                crate::state::ReminderFilter::Search(value.trim().to_string()),
                            );
                        });
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

    pub fn refresh_from_db(&mut self) {
        let reminder_repo = ReminderRepository::new(self.db.conn());
        let list_repo = ListRepository::new(self.db.conn());

        if let Ok(reminders) = reminder_repo.get_all() {
            self.state.reminders = reminders;
        }

        if let Ok(lists) = list_repo.get_all() {
            self.state.lists = lists;
        }
    }
}

impl Render for App {
    fn render(&mut self, window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        self.build(window, cx)
    }
}
