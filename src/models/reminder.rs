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

    pub fn with_list_id(mut self, list_id: Uuid) -> Self {
        self.list_id = Some(list_id);
        self
    }

    pub fn with_due_date(mut self, due_date: NaiveDate) -> Self {
        self.due_date = Some(due_date);
        self
    }

    pub fn with_due_time(mut self, due_time: NaiveTime) -> Self {
        self.due_time = Some(due_time);
        self
    }

    pub fn with_description(mut self, description: String) -> Self {
        self.description = Some(description);
        self
    }

    pub fn with_priority(mut self, priority: Priority) -> Self {
        self.priority = priority;
        self
    }

    pub fn mark_completed(mut self) -> Self {
        self.is_completed = true;
        self.updated_at = Local::now();
        self
    }

    pub fn mark_incomplete(mut self) -> Self {
        self.is_completed = false;
        self.updated_at = Local::now();
        self
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

    pub fn with_color(mut self, color: String) -> Self {
        self.color = color;
        self
    }

    pub fn with_icon(mut self, icon: String) -> Self {
        self.icon = icon;
        self
    }
}
