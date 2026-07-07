use crate::app::App;
use crate::models::reminder::Reminder;
use crate::state::CalendarViewMode;
use crate::views::calendar_view::day_view::DayView;
use crate::views::calendar_view::month_view::MonthView;
use crate::views::calendar_view::toolbar::CalendarToolbar;
use crate::views::calendar_view::utils::CalendarUtils;
use crate::views::calendar_view::week_view::WeekView;
use crate::views::calendar_view::year_view::YearView;
use chrono::{Datelike, Local, NaiveDate};
use gpui::*;

pub struct CalendarView;

impl CalendarView {
    pub fn build(app: &mut App, cx: &mut Context<App>) -> impl IntoElement {
        let state = &app.state;
        let (year, month) = (state.calendar_year, state.calendar_month);
        let selected_date = state.selected_date;
        let app_entity = cx.entity().clone();

        let times = CalendarUtils::generate_time_slots();

        match state.calendar_view_mode {
            CalendarViewMode::Day => {
                let date = selected_date.unwrap_or_else(|| Local::now().date_naive());
                let reminders = app.state.get_reminders_for_date(Some(date));
                let is_today = CalendarUtils::is_today(&date);

                div()
                    .flex()
                    .flex_col()
                    .w_full()
                    .flex_1()
                    .child(CalendarToolbar::build(app, app_entity.clone()))
                    .child(DayView::build(date, times, reminders, is_today, app_entity))
            }
            CalendarViewMode::Week => {
                let date = selected_date.unwrap_or_else(|| Local::now().date_naive());
                let week_days = CalendarUtils::get_week_days(date);

                let reminders_by_date: Vec<(NaiveDate, Vec<Reminder>)> = week_days
                    .iter()
                    .cloned()
                    .map(|d| (d, app.state.get_reminders_for_date(Some(d))))
                    .collect();

                div()
                    .flex()
                    .flex_col()
                    .w_full()
                    .flex_1()
                    .child(CalendarToolbar::build(app, app_entity.clone()))
                    .child(WeekView::build(
                        week_days,
                        times,
                        reminders_by_date,
                        app_entity,
                    ))
            }
            CalendarViewMode::Month => {
                let (days, has_reminder_on_date, day_reminders) =
                    Self::generate_month_data(year, month, &app.state);

                div()
                    .flex()
                    .flex_col()
                    .w_full()
                    .flex_1()
                    .child(CalendarToolbar::build(app, app_entity.clone()))
                    .child(MonthView::build(
                        days,
                        selected_date,
                        has_reminder_on_date,
                        day_reminders,
                        app_entity,
                    ))
            }
            CalendarViewMode::Year => {
                let months = vec![
                    "一月".to_string(),
                    "二月".to_string(),
                    "三月".to_string(),
                    "四月".to_string(),
                    "五月".to_string(),
                    "六月".to_string(),
                    "七月".to_string(),
                    "八月".to_string(),
                    "九月".to_string(),
                    "十月".to_string(),
                    "十一月".to_string(),
                    "十二月".to_string(),
                ];
                let month_reminders: Vec<Vec<bool>> = (1..=12)
                    .map(|m| {
                        let (_, has_reminder, _) =
                            Self::generate_month_data(year, m as u32, &app.state);
                        has_reminder
                    })
                    .collect();

                div()
                    .flex()
                    .flex_col()
                    .w_full()
                    .flex_1()
                    .child(CalendarToolbar::build(app, app_entity.clone()))
                    .child(YearView::build(year, months, month_reminders, app_entity))
            }
        }
    }

    fn generate_month_data(
        year: i32,
        month: u32,
        state: &crate::state::AppState,
    ) -> (Vec<Option<NaiveDate>>, Vec<bool>, Vec<Vec<Reminder>>) {
        let first_day = NaiveDate::from_ymd_opt(year, month, 1);

        if first_day.is_none() {
            return (vec![], vec![], vec![]);
        }

        let first_day = first_day.unwrap();
        let first_weekday = first_day.weekday().num_days_from_monday();

        let mut days: Vec<Option<NaiveDate>> = Vec::new();

        for _ in 0..first_weekday {
            days.push(None);
        }

        let mut day = 1;
        while let Some(date) = NaiveDate::from_ymd_opt(year, month, day) {
            days.push(Some(date));
            day += 1;
        }

        let has_reminder_on_date: Vec<bool> = days
            .iter()
            .map(|d| {
                d.map(|date| state.has_reminder_on_date(date))
                    .unwrap_or(false)
            })
            .collect();

        let day_reminders: Vec<Vec<Reminder>> = days
            .iter()
            .map(|d| state.get_reminders_for_date(*d))
            .collect();

        (days, has_reminder_on_date, day_reminders)
    }
}
