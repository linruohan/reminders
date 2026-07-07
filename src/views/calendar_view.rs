use chrono::{Local, NaiveDate, Datelike, Duration, Timelike};
use gpui::*;
use gpui::prelude::{FluentBuilder, StatefulInteractiveElement};
use gpui_component::{Icon, IconName};
use crate::state::CalendarViewMode;
use crate::models::reminder::{Reminder, Priority};

struct DayViewData {
    selected_date: NaiveDate,
    times: Vec<String>,
    reminders: Vec<Reminder>,
    is_today: bool,
}

struct WeekViewData {
    week_days: Vec<NaiveDate>,
    times: Vec<String>,
    reminders_by_date: Vec<(NaiveDate, Vec<Reminder>)>,
}

struct MonthViewData {
    days: Vec<Option<NaiveDate>>,
    selected_date: Option<NaiveDate>,
    has_reminder_on_date: Vec<bool>,
}

struct YearViewData {
    year: i32,
    months: Vec<String>,
}

pub struct CalendarView;

impl CalendarView {
    pub fn build(app: &mut crate::app::App, cx: &mut Context<crate::app::App>) -> impl IntoElement {
        let app_entity = cx.entity().downgrade();

        div()
            .flex()
            .flex_col()
            .w_full()
            .h_full()
            .bg(rgb(0xffffff))
            .child(Self::build_toolbar(app, app_entity.clone()))
            .child(Self::build_calendar_body(app, app_entity))
    }

    fn build_toolbar(app: &mut crate::app::App, app_entity: WeakEntity<crate::app::App>) -> impl IntoElement {
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

    fn build_view_toggles(app: &mut crate::app::App, app_entity: WeakEntity<crate::app::App>) -> impl IntoElement {
        div()
            .flex()
            .items_center()
            .rounded(px(6.0))
            .bg(rgba(0xf2f2f7ff))
            .child(Self::view_toggle(app, CalendarViewMode::Day, "日", app_entity.clone()))
            .child(div().w(px(1.0)).h(px(20.0)).bg(rgba(0x0000000d)))
            .child(Self::view_toggle(app, CalendarViewMode::Week, "周", app_entity.clone()))
            .child(div().w(px(1.0)).h(px(20.0)).bg(rgba(0x0000000d)))
            .child(Self::view_toggle(app, CalendarViewMode::Month, "月", app_entity.clone()))
            .child(div().w(px(1.0)).h(px(20.0)).bg(rgba(0x0000000d)))
            .child(Self::view_toggle(app, CalendarViewMode::Year, "年", app_entity))
    }

    fn build_date_navigation(app: &mut crate::app::App, app_entity: WeakEntity<crate::app::App>) -> impl IntoElement {
        let year = app.state.calendar_year;
        let month = app.state.calendar_month;
        let prev_month_enabled = !(year == 1900 && month == 1);
        let next_month_enabled = !(year == 2100 && month == 12);

        div()
            .flex()
            .items_center()
            .gap(px(8.0))
            .child(Self::prev_month_button(prev_month_enabled, app_entity.clone()))
            .child(
                div()
                    .text_size(px(18.0))
                    .font_weight(FontWeight(600.0))
                    .text_color(rgba(0x000000ee))
                    .child(format!("{}年{}月", year, month)),
            )
            .child(Self::next_month_button(next_month_enabled, app_entity.clone()))
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
            .child(Icon::new(IconName::Search).text_color(rgba(0x8e8e93ff)).size(px(14.0)))
            .child(div().ml(px(6.0)).text_size(px(13.0)).text_color(rgba(0x8e8e93ff)).child("搜索日程"))
    }

    fn prev_month_button(enabled: bool, app_entity: WeakEntity<crate::app::App>) -> impl IntoElement {
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
                        app_entity.update(cx, |this, _| this.state.prev_month()).ok();
                    })
            })
            .child(Icon::new(IconName::ChevronLeft).text_color(if enabled { rgba(0x007AFFff) } else { rgba(0xc7c7ccff) }).size(px(20.0)))
    }

    fn next_month_button(enabled: bool, app_entity: WeakEntity<crate::app::App>) -> impl IntoElement {
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
                        app_entity.update(cx, |this, _| this.state.next_month()).ok();
                    })
            })
            .child(Icon::new(IconName::ChevronRight).text_color(if enabled { rgba(0x007AFFff) } else { rgba(0xc7c7ccff) }).size(px(20.0)))
    }

    fn today_button(app_entity: WeakEntity<crate::app::App>) -> impl IntoElement {
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
                app_entity.update(cx, |this, _| this.state.go_to_today()).ok();
            })
            .child("今天")
    }

    fn view_toggle(app: &mut crate::app::App, mode: CalendarViewMode, label: &str, app_entity: WeakEntity<crate::app::App>) -> impl IntoElement {
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
                        offset: gpui::Point { x: px(0.0), y: px(1.0) },
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
                        app_entity.update(cx, |this, _| this.state.set_calendar_view_mode(mode)).ok();
                    })
            })
            .child(div().text_size(px(13.0)).font_weight(FontWeight(600.0)).child(label_str))
    }

    fn build_calendar_body(app: &mut crate::app::App, app_entity: WeakEntity<crate::app::App>) -> impl IntoElement {
        let year = app.state.calendar_year;
        let month = app.state.calendar_month;
        let selected_date = app.state.selected_date.unwrap_or_else(|| Local::now().date_naive());
        let view_mode = app.state.calendar_view_mode;

        let first_day = NaiveDate::from_ymd_opt(year, month, 1).unwrap();
        let next_month_first_day = if month == 12 {
            NaiveDate::from_ymd_opt(year + 1, 1, 1).unwrap()
        } else {
            NaiveDate::from_ymd_opt(year, month + 1, 1).unwrap()
        };
        let last_day = next_month_first_day - Duration::days(1);
        let start_weekday = first_day.weekday().num_days_from_monday() as usize;

        let mut days: Vec<Option<NaiveDate>> = vec![None; start_weekday];
        for day in 1..=last_day.day() {
            days.push(Some(NaiveDate::from_ymd_opt(year, month, day).unwrap()));
        }

        let times = Self::generate_time_slots();
        let week_days = Self::get_week_days(selected_date);

        let day_view_data = DayViewData {
            selected_date,
            times: times.clone(),
            reminders: app.state.get_reminders_for_date(Some(selected_date)),
            is_today: selected_date == Local::now().date_naive(),
        };

        let week_view_data = WeekViewData {
            week_days: week_days.clone(),
            times,
            reminders_by_date: week_days.iter()
                .map(|d| (*d, app.state.get_reminders_for_date(Some(*d))))
                .collect(),
        };

        let month_view_data = MonthViewData {
            days: days.clone(),
            selected_date: app.state.selected_date,
            has_reminder_on_date: days.iter()
                .map(|d| d.map(|date| app.state.has_reminder_on_date(date)).unwrap_or(false))
                .collect(),
        };

        let year_view_data = YearViewData {
            year,
            months: vec!["一月".to_string(), "二月".to_string(), "三月".to_string(), 
                "四月".to_string(), "五月".to_string(), "六月".to_string(), 
                "七月".to_string(), "八月".to_string(), "九月".to_string(), 
                "十月".to_string(), "十一月".to_string(), "十二月".to_string()],
        };

        let day_reminders_for_month: Vec<Vec<Reminder>> = days.iter()
            .map(|d| d.map(|date| app.state.get_reminders_for_date(Some(date))).unwrap_or(vec![]))
            .collect();

        let year_month_reminders: Vec<Vec<bool>> = (1..=12).map(|m| {
            (1..=31).map(|d| {
                NaiveDate::from_ymd_opt(year, m as u32, d).map(|date| app.state.has_reminder_on_date(date)).unwrap_or(false)
            }).collect()
        }).collect();

        let app_entity_day = app_entity.clone();
        let app_entity_week = app_entity.clone();
        let app_entity_month = app_entity.clone();
        let app_entity_year = app_entity;

        div()
            .flex()
            .flex_col()
            .w_full()
            .flex_1()
            .when(view_mode == CalendarViewMode::Day, move |this| {
                this.child(Self::build_day_view(day_view_data, app_entity_day))
            })
            .when(view_mode == CalendarViewMode::Week, move |this| {
                this.child(Self::build_week_view(week_view_data, app_entity_week))
            })
            .when(view_mode == CalendarViewMode::Month, move |this| {
                this.child(Self::build_month_view(month_view_data, day_reminders_for_month, app_entity_month))
            })
            .when(view_mode == CalendarViewMode::Year, move |this| {
                this.child(Self::build_year_view(year_view_data, year_month_reminders, app_entity_year))
            })
    }

    fn build_day_view(data: DayViewData, app_entity: WeakEntity<crate::app::App>) -> impl IntoElement {
        let DayViewData { selected_date, times, reminders, is_today } = data;
        let app_entity_clone = app_entity.clone();

        div()
            .flex()
            .w_full()
            .flex_1()
            .child(
                div()
                    .w(px(80.0))
                    .flex_col()
                    .border_r(px(1.0))
                    .border_color(rgba(0x0000000d))
                    .child(
                        div()
                            .h(px(48.0))
                            .flex()
                            .items_center()
                            .justify_center()
                            .border_b(px(1.0))
                            .border_color(rgba(0x0000000d))
                            .child(
                                div()
                                    .text_size(px(14.0))
                                    .font_weight(FontWeight(600.0))
                                    .text_color(rgba(0x000000ee))
                                    .child(format!("{}月{}日", selected_date.month(), selected_date.day())),
                            ),
                    )
                    .children(times.iter().cloned().map(|time| {
                        div()
                            .h(px(60.0))
                            .border_b(px(1.0))
                            .border_color(rgba(0x0000000d))
                            .flex()
                            .items_start()
                            .justify_center()
                            .pt(px(4.0))
                            .child(div().text_size(px(12.0)).text_color(rgba(0x8e8e93ff)).child(time))
                    })),
            )
            .child(
                div()
                    .flex_1()
                    .flex_col()
                    .child(
                        div()
                            .h(px(48.0))
                            .border_b(px(1.0))
                            .border_color(rgba(0x0000000d))
                            .flex()
                            .items_center()
                            .justify_center()
                            .child(
                                div()
                                    .text_size(px(16.0))
                                    .font_weight(FontWeight(600.0))
                                    .text_color(rgba(0x000000ee))
                                    .child(format!("{}年{}月{}日", selected_date.year(), selected_date.month(), selected_date.day())),
                            ),
                    )
                    .child(
                        div()
                            .flex_col()
                            .flex_1()
                            .when(is_today, |this| this.bg(rgba(0xff3b3008)))
                            .children((0..24).map(move |hour| {
                                let hour_reminders: Vec<_> = reminders.iter()
                                    .filter(|r| r.due_time.map(|t| t.hour() == hour as u32).unwrap_or(false))
                                    .cloned()
                                    .collect();

                                div()
                                    .h(px(60.0))
                                    .border_b(px(1.0))
                                    .border_color(rgba(0x0000000d))
                                    .p(px(4.0))
                                    .children(hour_reminders.into_iter().map(|reminder| {
                                        Self::event_card(app_entity_clone.clone(), reminder)
                                    }))
                            })),
                    ),
            )
    }

    fn build_week_view(data: WeekViewData, app_entity: WeakEntity<crate::app::App>) -> impl IntoElement {
        let WeekViewData { week_days, times, reminders_by_date } = data;
        let app_entity_clone = app_entity.clone();

        div()
            .flex()
            .w_full()
            .flex_1()
            .child(
                div()
                    .w(px(80.0))
                    .flex_col()
                    .border_r(px(1.0))
                    .border_color(rgba(0x0000000d))
                    .child(
                        div()
                            .h(px(48.0))
                            .flex()
                            .items_center()
                            .justify_center()
                            .border_b(px(1.0))
                            .border_color(rgba(0x0000000d))
                            .child(div().text_size(px(14.0)).font_weight(FontWeight(600.0)).text_color(rgba(0x000000ee)).child("时间")),
                    )
                    .children(times.iter().cloned().map(|time| {
                        div()
                            .h(px(60.0))
                            .border_b(px(1.0))
                            .border_color(rgba(0x0000000d))
                            .flex()
                            .items_start()
                            .justify_center()
                            .pt(px(4.0))
                            .child(div().text_size(px(12.0)).text_color(rgba(0x8e8e93ff)).child(time))
                    })),
            )
            .child(
                div()
                    .flex_1()
                    .flex_col()
                    .children(reminders_by_date.into_iter().map(move |(date, reminders)| {
                        let is_today = date == Local::now().date_naive();
                        let app_entity_clone = app_entity_clone.clone();

                        div()
                            .flex_1()
                            .flex_col()
                            .border_r(px(1.0))
                            .border_color(rgba(0x0000000d))
                            .when(is_today, |this| this.bg(rgba(0xff3b3008)))
                            .children((0..24).map(move |hour| {
                                let hour_reminders: Vec<_> = reminders.iter()
                                    .filter(|r| r.due_time.map(|t| t.hour() == hour as u32).unwrap_or(false))
                                    .cloned()
                                    .collect();

                                div()
                                    .h(px(60.0))
                                    .border_b(px(1.0))
                                    .border_color(rgba(0x0000000d))
                                    .p(px(4.0))
                                    .children(hour_reminders.into_iter().map(|reminder| {
                                        Self::event_card(app_entity_clone.clone(), reminder)
                                    }))
                            }))
                    })),
            )
    }

    fn build_month_view(data: MonthViewData, day_reminders: Vec<Vec<Reminder>>, app_entity: WeakEntity<crate::app::App>) -> impl IntoElement {
        let MonthViewData { days, selected_date, has_reminder_on_date } = data;
        let weekdays = ["一", "二", "三", "四", "五", "六", "日"];
        let app_entity_clone = app_entity.clone();

        div()
            .flex()
            .flex_col()
            .w_full()
            .flex_1()
            .child(
                div()
                    .flex()
                    .w_full()
                    .h(px(40.0))
                    .border_b(px(1.0))
                    .border_color(rgba(0x0000000d))
                    .children(weekdays.iter().map(|day| {
                        let day_str = day.to_string();
                        div()
                            .flex_1()
                            .flex()
                            .items_center()
                            .justify_center()
                            .text_size(px(12.0))
                            .font_weight(FontWeight(600.0))
                            .text_color(rgba(0x8e8e93ff))
                            .child(day_str)
                    })),
            )
            .child(
                div()
                    .flex()
                    .flex_wrap()
                    .w_full()
                    .flex_1()
                    .children(days.iter().enumerate().map(move |(index, date)| {
                        let has_reminder = has_reminder_on_date[index];
                        let reminders = if has_reminder { day_reminders[index].clone() } else { vec![] };
                        Self::day_cell(date, index, selected_date, has_reminder, reminders, app_entity_clone.clone())
                    })),
            )
    }

    fn build_year_view(data: YearViewData, month_reminders: Vec<Vec<bool>>, app_entity: WeakEntity<crate::app::App>) -> impl IntoElement {
        let YearViewData { year, months } = data;
        let app_entity_clone = app_entity.clone();

        div()
            .flex()
            .flex_col()
            .w_full()
            .flex_1()
            .child(
                div()
                    .h(px(48.0))
                    .flex()
                    .items_center()
                    .justify_center()
                    .border_b(px(1.0))
                    .border_color(rgba(0x0000000d))
                    .child(div().text_size(px(20.0)).font_weight(FontWeight(600.0)).text_color(rgba(0x000000ee)).child(format!("{}年", year))),
            )
            .child(
                div()
                    .flex()
                    .flex_wrap()
                    .w_full()
                    .flex_1()
                    .children(months.into_iter().enumerate().map(move |(idx, month_name)| {
                        let month_num = idx + 1;
                        let reminders = month_reminders[idx].clone();
                        Self::year_month_cell(month_num, month_name, year, reminders, app_entity_clone.clone())
                    })),
            )
    }

    fn day_cell(date: &Option<NaiveDate>, index: usize, selected_date: Option<NaiveDate>, has_reminder: bool, reminders: Vec<Reminder>, app_entity: WeakEntity<crate::app::App>) -> impl IntoElement {
        let today = Local::now().date_naive();
        let is_today = date == &Some(today);
        let is_selected = date == &selected_date;
        let is_weekend = index % 7 == 5 || index % 7 == 6;
        let is_empty = date.is_none();

        let date_for_click = date.clone();

        div()
            .id(format!("day-cell-{}", index))
            .flex_1()
            .h(px(60.0))
            .flex()
            .flex_col()
            .items_center()
            .justify_start()
            .pt(px(4.0))
            .rounded(px(8.0))
            .border_r(px(1.0))
            .border_color(rgba(0x0000000d))
            .cursor_pointer()
            .when(is_empty, |this| this.opacity(0.0))
            .when(is_selected && !is_empty, |this| this.bg(rgba(0x007AFF11)))
            .when(!is_selected && !is_empty, |this| {
                this.hover(|style| style.bg(rgba(0x00000008)))
                    .on_click(move |_, _, cx| {
                        app_entity.update(cx, |this, _| this.state.set_selected_date(date_for_click)).ok();
                    })
            })
            .child(
                div()
                    .w(px(28.0))
                    .h(px(28.0))
                    .flex()
                    .flex_col()
                    .items_center()
                    .justify_center()
                    .rounded(px(14.0))
                    .when(is_today && !is_empty, |this| this.bg(rgba(0xff3b30ff)))
                    .child(
                        div()
                            .text_size(px(13.0))
                            .font_weight(FontWeight(600.0))
                            .text_color(Self::get_day_text_color(date, is_today, is_selected, is_weekend))
                            .when(!is_empty, |this| this.child(date.unwrap().day().to_string())),
                    )
                    .when(has_reminder && !is_today && !is_empty, |this| {
                        this.child(div().w(px(4.0)).h(px(4.0)).rounded(px(2.0)).bg(rgba(0x007AFFff)).mt(px(2.0)))
                    })
                    .when(has_reminder && is_today && !is_empty, |this| {
                        this.child(div().w(px(4.0)).h(px(4.0)).rounded(px(2.0)).bg(rgba(0xffffffff)).mt(px(2.0)))
                    }),
            )
            .when(!is_empty && !reminders.is_empty(), |this| {
                this.child(
                    div()
                        .flex()
                        .flex_col()
                        .gap(px(2.0))
                        .mt(px(4.0))
                        .children(reminders.into_iter().take(3).map(|reminder| Self::mini_event_card(reminder))),
                )
            })
    }

    fn year_month_cell(month_num: usize, month_name: String, year: i32, reminders: Vec<bool>, app_entity: WeakEntity<crate::app::App>) -> impl IntoElement {
        let month_u32 = month_num as u32;
        let is_current_month = year == Local::now().year() && month_u32 == Local::now().month();
        let year_clone = year;
        let month_clone = month_u32;

        div()
            .id(format!("year-month-cell-{}-{}", year, month_num))
            .w(px(150.0))
            .flex_1()
            .flex()
            .flex_col()
            .border(px(1.0))
            .border_color(rgba(0x0000000d))
            .cursor_pointer()
            .when(is_current_month, |this| this.bg(rgba(0x007AFF11)))
            .hover(|style| style.bg(rgba(0x00000008)))
            .on_mouse_down(MouseButton::Left, |_, window, cx| {
                window.prevent_default();
                cx.stop_propagation();
            })
            .on_click(move |_, _, cx| {
                app_entity.update(cx, |this, _| {
                    this.state.calendar_year = year_clone;
                    this.state.calendar_month = month_clone;
                    this.state.set_calendar_view_mode(CalendarViewMode::Month);
                }).ok();
            })
            .child(
                div()
                    .h(px(32.0))
                    .flex()
                    .items_center()
                    .justify_center()
                    .border_b(px(1.0))
                    .border_color(rgba(0x0000000d))
                    .child(div().text_size(px(13.0)).font_weight(FontWeight(600.0)).text_color(rgba(0x000000ee)).child(month_name)),
            )
            .child(
                div()
                    .flex()
                    .flex_wrap()
                    .flex_1()
                    .p(px(4.0))
                    .children((0..31).map(move |day_idx| {
                        let day = (day_idx + 1) as u32;
                        if let Some(date) = NaiveDate::from_ymd_opt(year, month_u32, day) {
                            let is_today = date == Local::now().date_naive();
                            let is_weekend = date.weekday() == chrono::Weekday::Sat || date.weekday() == chrono::Weekday::Sun;
                            let has_reminder = reminders[day_idx];

                            div()
                                .w(px(20.0))
                                .h(px(20.0))
                                .flex()
                                .items_center()
                                .justify_center()
                                .rounded(px(10.0))
                                .when(is_today, |this| this.bg(rgba(0xff3b30ff)))
                                .child(
                                    div()
                                        .text_size(px(11.0))
                                        .text_color(if is_today { rgba(0xffffffff) } else if is_weekend { rgba(0xff3b30ff) } else { rgba(0x000000ee) })
                                        .child(day.to_string()),
                                )
                                .when(has_reminder && !is_today, |this| {
                                    this.child(div().w(px(3.0)).h(px(3.0)).rounded(px(1.5)).bg(rgba(0x007AFFff)).absolute().bottom(px(2.0)).right(px(2.0)))
                                })
                        } else {
                            div().w(px(20.0)).h(px(20.0))
                        }
                    })),
            )
    }

    fn event_card(app_entity: WeakEntity<crate::app::App>, reminder: Reminder) -> impl IntoElement {
        let time_str = reminder.due_time.map(|t| t.format("%H:%M").to_string()).unwrap_or("全天".to_string());
        let reminder_clone = reminder.clone();

        div()
            .id(format!("event-card-{}", reminder.id))
            .flex()
            .items_center()
            .gap(px(8.0))
            .p(px(6.0))
            .bg(rgba(0x4CD964ff))
            .rounded(px(4.0))
            .cursor_pointer()
            .hover(|style| style.bg(rgba(0x34c759ff)))
            .on_mouse_down(MouseButton::Left, |_, window, cx| {
                window.prevent_default();
                cx.stop_propagation();
            })
            .on_click(move |_, _, cx| {
                app_entity.update(cx, |this, _| {
                    this.state.set_selected_reminder(Some(reminder_clone.id));
                    this.state.toggle_event_modal();
                }).ok();
            })
            .child(div().text_size(px(11.0)).font_weight(FontWeight(500.0)).text_color(rgba(0xffffff)).child(time_str))
            .child(div().flex_1().text_size(px(12.0)).text_color(rgba(0xffffff)).child(reminder.title))
    }

    fn mini_event_card(reminder: Reminder) -> impl IntoElement {
        div()
            .w_full()
            .h(px(14.0))
            .bg(match reminder.priority {
                Priority::High => rgba(0xFF3B30ff),
                Priority::Medium => rgba(0x007AFFff),
                Priority::Low => rgba(0x4CD964ff),
            })
            .rounded(px(2.0))
    }

    fn get_day_text_color(date: &Option<NaiveDate>, is_today: bool, is_selected: bool, is_weekend: bool) -> Rgba {
        match (date, is_today, is_selected, is_weekend) {
            (Some(_), true, _, _) => rgba(0xffffffff),
            (Some(_), false, true, _) => rgba(0x007AFFff),
            (Some(_), false, false, true) => rgba(0xff3b30ff),
            (Some(_), false, false, false) => rgba(0x000000ee),
            (None, _, _, _) => rgba(0x00000000),
        }
    }

    fn generate_time_slots() -> Vec<String> {
        (0..24).map(|hour| format!("{:02}:00", hour)).collect()
    }

    fn get_week_days(date: NaiveDate) -> Vec<NaiveDate> {
        let monday = date - Duration::days(date.weekday().num_days_from_monday() as i64);
        (0..7).map(|i| monday + Duration::days(i)).collect()
    }
}
