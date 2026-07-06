use chrono::{DateTime, Local, NaiveDate, NaiveTime};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Reminder {
    pub id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub due_date: Option<NaiveDate>,
    pub due_time: Option<NaiveTime>,
    pub is_completed: bool,
    pub priority: Priority,
    pub list_id: Option<Uuid>,
    pub created_at: DateTime<Local>,
    pub updated_at: DateTime<Local>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum Priority {
    High,
    Medium,
    Low,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ReminderList {
    pub id: Uuid,
    pub name: String,
    pub color: String,
    pub icon: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Default, Serialize, Deserialize)]
pub enum AppView {
    #[default]
    Reminder,
    Calendar,
}

impl Reminder {
    pub fn new(title: String) -> Self {
        let now = Local::now();
        Self {
            id: Uuid::new_v4(),
            title,
            description: None,
            due_date: None,
            due_time: None,
            is_completed: false,
            priority: Priority::Medium,
            list_id: None,
            created_at: now,
            updated_at: now,
        }
    }
}

impl ReminderList {
    pub fn new(name: String) -> Self {
        Self {
            id: Uuid::new_v4(),
            name,
            color: "#007AFF".to_string(),
            icon: "list".to_string(),
        }
    }
}
