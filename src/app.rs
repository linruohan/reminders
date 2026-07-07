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

pub struct App {
    pub state: AppState,
    pub db: Database,
}

impl App {
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

        Self { state, db }
    }

    fn build(&mut self, cx: &mut Context<Self>) -> impl IntoElement {
        let current_view = self.state.current_view;
        let show_modal = self.state.show_add_modal;

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
    fn render(&mut self, _window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        self.build(cx)
    }
}
