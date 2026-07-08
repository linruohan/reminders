use crate::models::reminder::Reminder;
use crate::state::ReminderFilter;
use chrono::{Datelike, Local, NaiveDate, NaiveTime};

pub fn apply_filter(reminders: &[Reminder], filter: &ReminderFilter) -> Vec<Reminder> {
    let today = Local::now().date_naive();
    let tomorrow = today.succ_opt().unwrap_or(today);

    let filtered: Vec<Reminder> = match filter {
        ReminderFilter::Today => reminders
            .iter()
            .filter(|r| !r.is_completed && r.due_date.map(|d| d <= today).unwrap_or(false))
            .cloned()
            .collect(),
        ReminderFilter::Tomorrow => reminders
            .iter()
            .filter(|r| !r.is_completed && r.due_date == Some(tomorrow))
            .cloned()
            .collect(),
        ReminderFilter::Week => {
            let weekday = today.weekday().num_days_from_monday() as i64;
            let week_start = today - chrono::Duration::days(weekday);
            let week_end = week_start + chrono::Duration::days(6);
            reminders
                .iter()
                .filter(|r| {
                    !r.is_completed
                        && r.due_date
                            .map(|d| d >= week_start && d <= week_end)
                            .unwrap_or(false)
                })
                .cloned()
                .collect()
        }
        ReminderFilter::Overdue => reminders
            .iter()
            .filter(|r| !r.is_completed && r.due_date.map(|d| d < today).unwrap_or(false))
            .cloned()
            .collect(),
        ReminderFilter::Planned | ReminderFilter::Upcoming => reminders
            .iter()
            .filter(|r| !r.is_completed && r.due_date.is_some())
            .cloned()
            .collect(),
        ReminderFilter::Open | ReminderFilter::All => reminders
            .iter()
            .filter(|r| !r.is_completed)
            .cloned()
            .collect(),
        ReminderFilter::Completed => reminders
            .iter()
            .filter(|r| r.is_completed)
            .cloned()
            .collect(),
        ReminderFilter::Everything => reminders.to_vec(),
        ReminderFilter::Date(date) => reminders
            .iter()
            .filter(|r| !r.is_completed && r.due_date == Some(*date))
            .cloned()
            .collect(),
        ReminderFilter::List(id) => reminders
            .iter()
            .filter(|r| r.list_id == Some(*id) && !r.is_completed)
            .cloned()
            .collect(),
        ReminderFilter::Search(keyword) => reminders
            .iter()
            .filter(|r| !r.is_completed && r.matches_search(keyword))
            .cloned()
            .collect(),
    };

    sort_reminders(filtered)
}

pub fn sort_reminders(mut reminders: Vec<Reminder>) -> Vec<Reminder> {
    reminders.sort_by(|lhs, rhs| match (due_sort_key(lhs), due_sort_key(rhs)) {
        (None, None) => lhs.title.cmp(&rhs.title),
        (None, Some(_)) => std::cmp::Ordering::Greater,
        (Some(_), None) => std::cmp::Ordering::Less,
        (Some(left), Some(right)) => left.cmp(&right).then_with(|| lhs.title.cmp(&rhs.title)),
    });
    reminders
}

fn due_sort_key(reminder: &Reminder) -> Option<(NaiveDate, NaiveTime)> {
    reminder.due_date.map(|date| {
        (
            date,
            reminder
                .due_time
                .unwrap_or_else(|| NaiveTime::from_hms_opt(0, 0, 0).unwrap()),
        )
    })
}

pub fn count_for_filter(reminders: &[Reminder], filter: ReminderFilter) -> usize {
    apply_filter(reminders, &filter).len()
}
