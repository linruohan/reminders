use crate::app::App;
use crate::models::reminder::AppView;
use gpui::prelude::FluentBuilder;
use gpui::*;
use gpui_component::{Icon, IconName, TitleBar};

pub struct Header;

impl Header {
    pub fn build(app: &mut App, cx: &mut Context<App>) -> impl IntoElement {
        let current_view = app.state.current_view;
        let app_entity = cx.entity().clone();

        TitleBar::new()
            .child(
                div()
                    .flex()
                    .items_center()
                    .w_full()
                    .justify_between()
                    .px(px(12.0))
                    .child(
                        div()
                            .flex()
                            .items_center()
                            .gap(px(8.0))
                            .child(Self::traffic_lights())
                            .child(Self::tab_button(
                                "todo-btn",
                                IconName::Check,
                                current_view == AppView::Reminder,
                                app_entity.clone(),
                                AppView::Reminder,
                            ))
                            .child(Self::tab_button(
                                "calendar-btn",
                                IconName::Calendar,
                                current_view == AppView::Calendar,
                                app_entity.clone(),
                                AppView::Calendar,
                            )),
                    )
                    .child(
                        div()
                            .flex()
                            .items_center()
                            .gap(px(4.0))
                            .child(Self::icon_button("list-btn", IconName::List))
                            .child(Self::icon_button("share-btn", IconName::Share))
                            .child(Self::icon_button("add-btn", IconName::Plus)),
                    ),
            )
    }

    fn traffic_lights() -> impl IntoElement {
        #[cfg(target_os = "macos")]
        {
            div()
                .flex()
                .items_center()
                .gap(px(8.0))
                .child(
                    div()
                        .id("close-mac")
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
                        .id("minimize-mac")
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
                        .id("maximize-mac")
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
        #[cfg(not(target_os = "macos"))]
        {
            div()
        }
    }

    fn tab_button(
        id: &str,
        icon: IconName,
        is_selected: bool,
        app_entity: Entity<App>,
        target_view: AppView,
    ) -> impl IntoElement {
        let id_str = id.to_string();

        div()
            .id(id_str)
            .flex()
            .items_center()
            .justify_center()
            .w(px(36.0))
            .h(px(30.0))
            .rounded(px(6.0))
            .cursor_pointer()
            .on_mouse_down(MouseButton::Left, |_, window, cx| {
                window.prevent_default();
                cx.stop_propagation();
            })
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
                        app_entity.update(cx, |this, _| {
                            this.state.set_current_view(target_view)
                        });
                    })
            })
            .child(
                Icon::new(icon)
                    .text_color(if is_selected {
                        rgba(0x007AFFff)
                    } else {
                        rgba(0x000000aa)
                    })
                    .size(px(18.0)),
            )
    }

    fn icon_button(id: &str, icon: IconName) -> impl IntoElement {
        let id_str = id.to_string();

        div()
            .id(id_str)
            .flex()
            .items_center()
            .justify_center()
            .w(px(32.0))
            .h(px(28.0))
            .rounded(px(6.0))
            .cursor_pointer()
            .hover(|style| style.bg(rgba(0x00000008)))
            .child(
                Icon::new(icon)
                    .text_color(rgba(0x000000aa))
                    .size(px(16.0)),
            )
    }
}