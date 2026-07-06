use crate::models::reminder::AppView;
use crate::state::AppState;
use crate::views::header::Header;
use crate::views::reminder_view::ReminderView;
use crate::views::calendar_view::CalendarView;
use crate::views::modal::AddReminderModal;
use gpui::*;
use gpui::prelude::FluentBuilder;

pub struct App {
    pub state: AppState,
}

impl App {
    pub fn new(_cx: &mut Context<Self>) -> Self {
        Self {
            state: AppState::new(),
        }
    }

    fn build(&mut self, _cx: &mut Context<Self>) -> impl IntoElement {
        let current_view = self.state.current_view;
        let show_modal = self.state.show_add_modal;
        
        div()
            .flex()
            .flex_col()
            .w(px(800.0))
            .h(px(660.0))
            .bg(rgb(0xffffff))
            .child(Header::build(self))
            .child(
                div()
                    .flex_1()
                    .when(current_view == AppView::Reminder, |this| {
                        this.child(ReminderView::build(self))
                    })
                    .when(current_view == AppView::Calendar, |this| {
                        this.child(CalendarView::build(self))
                    }),
            )
            .when(show_modal, |this| {
                this.child(AddReminderModal::build(self))
            })
    }
}

impl Render for App {
    fn render(&mut self, _window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        self.build(cx)
    }
}