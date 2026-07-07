use crate::app::App;
use crate::views::reminder_view::content::ReminderContent;
use crate::views::reminder_view::detail_panel::ReminderDetailPanel;
use crate::views::reminder_view::sidebar::ReminderSidebar;
use gpui::prelude::FluentBuilder;
use gpui::*;

pub struct ReminderView;

impl ReminderView {
    pub fn build(app: &mut App, cx: &mut Context<App>) -> impl IntoElement {
        let show_detail_panel = app.state.show_detail_panel;
        let app_entity = cx.entity().clone();

        div()
            .flex()
            .w_full()
            .flex_1()
            .child(ReminderSidebar::build(app, app_entity.clone()))
            .child(ReminderContent::build(app, app_entity.clone()))
            .when(show_detail_panel, |this| {
                this.child(ReminderDetailPanel::build(app, app_entity))
            })
    }
}
