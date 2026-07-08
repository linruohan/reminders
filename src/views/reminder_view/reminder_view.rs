use crate::app::App;
use crate::views::reminder_view::content::ReminderContent;
use crate::views::reminder_view::sidebar::ReminderSidebar;

use gpui::*;

pub struct ReminderView;

impl ReminderView {
    pub fn build(app: &mut App, cx: &mut Context<App>) -> impl IntoElement {
        let app_entity = cx.entity().clone();

        div()
            .flex()
            .w_full()
            .h_full()
            .flex_1()
            .child(ReminderSidebar::build(app, app_entity.clone()))
            .child(ReminderContent::build(app, cx))
    }
}
