use crate::models::reminder::Priority;
use chrono::{Datelike, Duration, Local, NaiveDate};
use gpui::{rgba, Rgba};

pub struct CalendarUtils;

impl CalendarUtils {
    pub fn generate_time_slots() -> Vec<String> {
        (0..24).map(|hour| format!("{:02}:00", hour)).collect()
    }

    pub fn get_week_days(date: NaiveDate) -> Vec<NaiveDate> {
        let monday = date - Duration::days(date.weekday().num_days_from_monday() as i64);
        (0..7).map(|i| monday + Duration::days(i)).collect()
    }

    pub fn get_day_text_color(
        date: &Option<NaiveDate>,
        is_today: bool,
        is_selected: bool,
        is_weekend: bool,
    ) -> Rgba {
        match (date, is_today, is_selected, is_weekend) {
            (Some(_), true, _, _) => rgba(0xffffffff),
            (Some(_), false, true, _) => rgba(0x007AFFff),
            (Some(_), false, false, true) => rgba(0xff3b30ff),
            (Some(_), false, false, false) => rgba(0x000000ee),
            (None, _, _, _) => rgba(0x00000000),
        }
    }

    pub fn get_priority_color(priority: &Priority) -> Rgba {
        match priority {
            Priority::High => rgba(0xFF3B30ff),
            Priority::Medium => rgba(0x007AFFff),
            Priority::Low => rgba(0x4CD964ff),
        }
    }

    pub fn is_today(date: &NaiveDate) -> bool {
        *date == Local::now().date_naive()
    }
}
