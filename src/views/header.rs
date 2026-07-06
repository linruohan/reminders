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
            .justify_start()
            .w(px(800.0))
            .h(px(56.0))
            .bg(rgb(0xffffff))
            .child(
                div()
                    .flex()
                    .items_center()
                    .gap(px(8.0))
                    .px(px(12.0))
                    .child(Self::traffic_lights())
                    .child(Self::todo_button(current_view, app_entity.clone()))
                    .child(Self::calendar_button(current_view, app_entity)),
            )
            .on_mouse_down(MouseButton::Left, |_, window, _| {
                window.start_window_move();
            })
    }

    fn traffic_lights() -> impl IntoElement {
        div()
            .flex()
            .items_center()
            .gap(px(8.0))
            .child(
                div()
                    .id("close-btn")
                    .w(px(12.0))
                    .h(px(12.0))
                    .rounded(px(6.0))
                    .bg(rgba(0xff5f57ff))
                    .cursor_pointer()
                    .hover(|style| style.bg(rgba(0xff3b30ff)))
                    .on_click(|_, window, _| {
                        window.remove_window();
                    }),
            )
            .child(
                div()
                    .id("minimize-btn")
                    .w(px(12.0))
                    .h(px(12.0))
                    .rounded(px(6.0))
                    .bg(rgba(0xffbd2eff))
                    .cursor_pointer()
                    .hover(|style| style.bg(rgba(0xffa726ff)))
                    .on_click(|_, window, _| {
                        window.minimize_window();
                    }),
            )
            .child(
                div()
                    .id("maximize-btn")
                    .w(px(12.0))
                    .h(px(12.0))
                    .rounded(px(6.0))
                    .bg(rgba(0x28ca42ff))
                    .cursor_pointer()
                    .hover(|style| style.bg(rgba(0x26a641ff)))
                    .on_click(|_, window, _| {
                        window.zoom_window();
                    }),
            )
    }

    fn todo_button(current_view: AppView, app_entity: WeakEntity<App>) -> impl IntoElement {
        let is_selected = current_view == AppView::Reminder;

        div()
            .id("todo-btn")
            .flex()
            .items_center()
            .justify_center()
            .w(px(36.0))
            .h(px(30.0))
            .rounded(px(6.0))
            .cursor_pointer()
            .when(is_selected, |this| {
                this.bg(rgb(0xffffff)).shadow(vec![gpui::BoxShadow {
                    color: rgba(0x00000011).into(),
                    offset: gpui::Point {
                        x: px(0.0),
                        y: px(1.5),
                    },
                    blur_radius: px(3.0),
                    spread_radius: px(0.0),
                    inset: false,
                }])
            })
            .when(!is_selected, |this| {
                this.hover(|style| style.bg(rgba(0x00000008)))
                    .on_click(move |_, _, cx| {
                        app_entity.update(cx, |this, _| this.state.set_current_view(AppView::Reminder)).ok();
                    })
            })
            .child(
                Icon::new(IconName::Check)
                    .text_color(if is_selected {
                        rgba(0x007AFFff)
                    } else {
                        rgba(0x000000aa)
                    })
                    .size(px(18.0)),
            )
    }

    fn calendar_button(current_view: AppView, app_entity: WeakEntity<App>) -> impl IntoElement {
        let is_selected = current_view == AppView::Calendar;

        div()
            .id("calendar-btn")
            .flex()
            .items_center()
            .justify_center()
            .w(px(36.0))
            .h(px(30.0))
            .rounded(px(6.0))
            .cursor_pointer()
            .when(is_selected, |this| {
                this.bg(rgb(0xffffff)).shadow(vec![gpui::BoxShadow {
                    color: rgba(0x00000011).into(),
                    offset: gpui::Point {
                        x: px(0.0),
                        y: px(1.5),
                    },
                    blur_radius: px(3.0),
                    spread_radius: px(0.0),
                    inset: false,
                }])
            })
            .when(!is_selected, |this| {
                this.hover(|style| style.bg(rgba(0x00000008)))
                    .on_click(move |_, _, cx| {
                        app_entity.update(cx, |this, _| this.state.set_current_view(AppView::Calendar)).ok();
                    })
            })
            .child(
                Icon::new(IconName::Calendar)
                    .text_color(if is_selected {
                        rgba(0x007AFFff)
                    } else {
                        rgba(0x000000aa)
                    })
                    .size(px(18.0)),
            )
    }
}