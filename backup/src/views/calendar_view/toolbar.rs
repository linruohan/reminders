use crate::app::App;
use crate::state::CalendarViewMode;
use gpui::prelude::FluentBuilder;
use gpui::*;
use gpui_component::{Icon, IconName};

pub struct CalendarToolbar;

impl CalendarToolbar {
    pub fn build(app: &mut App, app_entity: Entity<App>) -> impl IntoElement {
        div()
            .flex()
            .items_center()
            .justify_between()
            .w_full()
            .h(px(52.0))
            .px(px(16.0))
            .border_b(px(1.0))
            .border_color(rgba(0x0000000d))
            .child(Self::build_view_toggles(app, app_entity.clone()))
            .child(Self::build_date_navigation(app, app_entity.clone()))
            .child(Self::build_search_box())
    }

    fn build_view_toggles(app: &mut App, app_entity: Entity<App>) -> impl IntoElement {
        div()
            .flex()
            .items_center()
            .rounded(px(6.0))
            .bg(rgba(0xf2f2f7ff))
            .child(Self::view_toggle(
                app,
                CalendarViewMode::Day,
                "日",
                app_entity.clone(),
            ))
            .child(div().w(px(1.0)).h(px(20.0)).bg(rgba(0x0000000d)))
            .child(Self::view_toggle(
                app,
                CalendarViewMode::Week,
                "周",
                app_entity.clone(),
            ))
            .child(div().w(px(1.0)).h(px(20.0)).bg(rgba(0x0000000d)))
            .child(Self::view_toggle(
                app,
                CalendarViewMode::Month,
                "月",
                app_entity.clone(),
            ))
            .child(div().w(px(1.0)).h(px(20.0)).bg(rgba(0x0000000d)))
            .child(Self::view_toggle(
                app,
                CalendarViewMode::Year,
                "年",
                app_entity,
            ))
    }

    fn build_date_navigation(app: &mut App, app_entity: Entity<App>) -> impl IntoElement {
        let year = app.state.calendar_year;
        let month = app.state.calendar_month;
        let prev_month_enabled = !(year == 1900 && month == 1);
        let next_month_enabled = !(year == 2100 && month == 12);

        div()
            .flex()
            .items_center()
            .gap(px(8.0))
            .child(Self::prev_month_button(
                prev_month_enabled,
                app_entity.clone(),
            ))
            .child(
                div()
                    .text_size(px(18.0))
                    .font_weight(FontWeight(600.0))
                    .text_color(rgba(0x000000ee))
                    .child(format!("{}年{}月", year, month)),
            )
            .child(Self::next_month_button(
                next_month_enabled,
                app_entity.clone(),
            ))
            .child(div().w(px(1.0)).h(px(24.0)).bg(rgba(0x0000000d)))
            .child(Self::today_button(app_entity))
    }

    fn build_search_box() -> impl IntoElement {
        div()
            .flex()
            .items_center()
            .w(px(160.0))
            .h(px(32.0))
            .bg(rgba(0xf2f2f7ff))
            .rounded(px(8.0))
            .border(px(1.0))
            .border_color(rgba(0x0000000d))
            .p(px(8.0))
            .child(
                Icon::new(IconName::Search)
                    .text_color(rgba(0x8e8e93ff))
                    .size(px(14.0)),
            )
            .child(
                div()
                    .ml(px(6.0))
                    .text_size(px(13.0))
                    .text_color(rgba(0x8e8e93ff))
                    .child("搜索日程"),
            )
    }

    fn prev_month_button(enabled: bool, app_entity: Entity<App>) -> impl IntoElement {
        div()
            .id("prev-month-btn")
            .w(px(32.0))
            .h(px(32.0))
            .flex()
            .items_center()
            .justify_center()
            .rounded(px(8.0))
            .cursor_pointer()
            .when(enabled, |this| {
                this.hover(|style| style.bg(rgba(0x007AFF11)))
                    .on_click(move |_, _, cx| {
                        app_entity.update(cx, |this, _| this.state.prev_month());
                    })
            })
            .child(
                Icon::new(IconName::ChevronLeft)
                    .text_color(if enabled {
                        rgba(0x007AFFff)
                    } else {
                        rgba(0xc7c7ccff)
                    })
                    .size(px(20.0)),
            )
    }

    fn next_month_button(enabled: bool, app_entity: Entity<App>) -> impl IntoElement {
        div()
            .id("next-month-btn")
            .w(px(32.0))
            .h(px(32.0))
            .flex()
            .items_center()
            .justify_center()
            .rounded(px(8.0))
            .cursor_pointer()
            .when(enabled, |this| {
                this.hover(|style| style.bg(rgba(0x007AFF11)))
                    .on_click(move |_, _, cx| {
                        app_entity.update(cx, |this, _| this.state.next_month());
                    })
            })
            .child(
                Icon::new(IconName::ChevronRight)
                    .text_color(if enabled {
                        rgba(0x007AFFff)
                    } else {
                        rgba(0xc7c7ccff)
                    })
                    .size(px(20.0)),
            )
    }

    fn today_button(app_entity: Entity<App>) -> impl IntoElement {
        div()
            .id("today-btn")
            .px(px(12.0))
            .py(px(6.0))
            .rounded(px(6.0))
            .cursor_pointer()
            .text_size(px(13.0))
            .font_weight(FontWeight(500.0))
            .text_color(rgba(0x007AFFff))
            .hover(|style| style.bg(rgba(0x007AFF11)))
            .on_click(move |_, _, cx| {
                app_entity.update(cx, |this, _| this.state.go_to_today());
            })
            .child("今天")
    }

    fn view_toggle(
        app: &mut App,
        mode: CalendarViewMode,
        label: &str,
        app_entity: Entity<App>,
    ) -> impl IntoElement {
        let is_selected = app.state.calendar_view_mode == mode;
        let label_str = label.to_string();

        div()
            .id(format!("view-toggle-{}", mode as u8))
            .flex()
            .items_center()
            .justify_center()
            .w(px(40.0))
            .h(px(28.0))
            .cursor_pointer()
            .when(is_selected, |this| {
                this.bg(rgba(0xffffff))
                    .shadow(vec![gpui::BoxShadow {
                        color: rgba(0x00000011).into(),
                        offset: gpui::Point {
                            x: px(0.0),
                            y: px(1.0),
                        },
                        blur_radius: px(2.0),
                        spread_radius: px(0.0),
                        inset: false,
                    }])
                    .text_color(rgba(0x007AFFff))
            })
            .when(!is_selected, |this| {
                this.text_color(rgba(0x000000aa))
                    .hover(|style| style.bg(rgba(0x00000008)))
                    .on_click(move |_, _, cx| {
                        app_entity.update(cx, |this, _| this.state.set_calendar_view_mode(mode));
                    })
            })
            .child(
                div()
                    .text_size(px(13.0))
                    .font_weight(FontWeight(600.0))
                    .child(label_str),
            )
    }
}
