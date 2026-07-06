use crate::app::App;
use crate::models::reminder::AppView;
use gpui::prelude::{FluentBuilder, StatefulInteractiveElement};
use gpui::*;
use gpui_component::{Icon, IconName};

pub struct Header;

impl Header {
    pub fn build(app: &mut App, app_entity: WeakEntity<App>) -> impl IntoElement {
        let current_view = app.state.current_view;

        div()
            .flex()
            .items_center()
            .justify_center()
            .w(px(800.0))
            .h(px(56.0))
            .bg(rgba(0xf2f2f7ff))
            .border_b(px(1.0))
            .border_color(rgba(0x0000000d))
            .child(
                div()
                    .flex()
                    .items_center()
                    .gap(px(8.0))
                    .child(Self::todo_button(current_view, app_entity.clone()))
                    .child(Self::calendar_button(current_view, app_entity)),
            )
    }

    fn todo_button(current_view: AppView, app_entity: WeakEntity<App>) -> impl IntoElement {
        let is_selected = current_view == AppView::Reminder;

        div()
            .id("todo-btn")
            .flex()
            .items_center()
            .justify_center()
            .w(px(72.0))
            .h(px(44.0))
            .rounded(px(8.0))
            .cursor_pointer()
            .when(is_selected, |this| {
                this.bg(rgb(0xffffff)).shadow(vec![gpui::BoxShadow {
                    color: rgba(0x00000011).into(),
                    offset: gpui::Point {
                        x: px(0.0),
                        y: px(2.0),
                    },
                    blur_radius: px(4.0),
                    spread_radius: px(0.0),
                    inset: false,
                }])
            })
            .when(!is_selected, |this| {
                this.hover(|style| style.bg(rgba(0x00000008)))
                    .on_click(move |_, _, cx| {
                        app_entity
                            .update(cx, |this, _| this.state.set_current_view(AppView::Reminder))
                            .ok();
                    })
            })
            .child(
                Icon::new(IconName::Check)
                    .text_color(if is_selected {
                        rgba(0x007AFFff)
                    } else {
                        rgba(0x000000aa)
                    })
                    .size(px(24.0)),
            )
    }

    fn calendar_button(current_view: AppView, app_entity: WeakEntity<App>) -> impl IntoElement {
        let is_selected = current_view == AppView::Calendar;

        div()
            .id("calendar-btn")
            .flex()
            .items_center()
            .justify_center()
            .w(px(72.0))
            .h(px(44.0))
            .rounded(px(8.0))
            .cursor_pointer()
            .when(is_selected, |this| {
                this.bg(rgb(0xffffff)).shadow(vec![gpui::BoxShadow {
                    color: rgba(0x00000011).into(),
                    offset: gpui::Point {
                        x: px(0.0),
                        y: px(2.0),
                    },
                    blur_radius: px(4.0),
                    spread_radius: px(0.0),
                    inset: false,
                }])
            })
            .when(!is_selected, |this| {
                this.hover(|style| style.bg(rgba(0x00000008)))
                    .on_click(move |_, _, cx| {
                        app_entity
                            .update(cx, |this, _| this.state.set_current_view(AppView::Calendar))
                            .ok();
                    })
            })
            .child(
                Icon::new(IconName::Calendar)
                    .text_color(if is_selected {
                        rgba(0x007AFFff)
                    } else {
                        rgba(0x000000aa)
                    })
                    .size(px(24.0)),
            )
    }
}
