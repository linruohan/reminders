use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Default, Serialize, Deserialize)]
pub enum CalendarViewMode {
    #[default]
    Day,
    Week,
    Month,
    Year,
}

#[derive(Debug, Clone, PartialEq, Default, Serialize, Deserialize)]
pub enum ReminderFilter {
    #[default]
    Today,
    Tomorrow,
    Week,
    Overdue,
    /// Has a due date and is incomplete (remindctl: upcoming)
    Planned,
    Upcoming,
    /// All incomplete reminders (remindctl: open)
    All,
    Open,
    Completed,
    /// All reminders including completed (remindctl: all)
    Everything,
    Date(chrono::NaiveDate),
    List(Uuid),
    Search(String),
}

#[derive(Debug, Clone, Copy, PartialEq, Default, Serialize, Deserialize)]
pub enum AppView {
    #[default]
    Reminder,
    Calendar,
}
