use chrono::{DateTime, Local, NaiveDate, NaiveTime};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Default)]
pub enum Priority {
    #[default]
    None,
    Medium,
    Low,
    High,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[allow(dead_code)]
pub enum RecurrenceFrequency {
    Daily,
    Weekly,
    Monthly,
    Yearly,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Reminder {
    pub id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub url: Option<String>,
    pub created_date: Option<NaiveDate>,
    pub created_time: Option<NaiveTime>,
    pub end_date: Option<NaiveDate>,
    pub end_time: Option<NaiveTime>,
    pub is_all_day: bool,
    pub is_completed: bool,
    pub completion_date: Option<DateTime<Local>>,
    pub priority: Priority,
    pub is_flagged: bool,
    pub recurrence_frequency: Option<String>,
    pub recurrence_interval: Option<i32>,
    pub custom_recurrence_unit: Option<String>,
    pub recurrence_end_date: Option<NaiveDate>,
    pub remind_before_value: Option<i32>,
    pub remind_before_unit: Option<String>,
    pub owner_id: Option<Uuid>,
    pub list_id: Option<Uuid>,
    pub created_at: DateTime<Local>,
    pub updated_at: DateTime<Local>,
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
            url: None,
            created_date: None,
            created_time: None,
            end_date: None,
            end_time: None,
            is_all_day: false,
            is_completed: false,
            completion_date: None,
            priority: Priority::None,
            is_flagged: false,
            recurrence_frequency: None,
            recurrence_interval: None,
            custom_recurrence_unit: None,
            recurrence_end_date: None,
            remind_before_value: None,
            remind_before_unit: None,
            owner_id: None,
            list_id: None,
            created_at: now,
            updated_at: now,
        }
    }

    pub fn with_list_id(mut self, list_id: Uuid) -> Self {
        self.list_id = Some(list_id);
        self
    }

    pub fn with_created_date(mut self, created_date: NaiveDate) -> Self {
        self.created_date = Some(created_date);
        self.is_all_day = true;
        self
    }

    pub fn with_created_time(mut self, created_time: NaiveTime) -> Self {
        self.created_time = Some(created_time);
        self.is_all_day = false;
        self
    }

    pub fn with_is_all_day(mut self) -> Self {
        self.is_all_day = true;
        self
    }

    pub fn with_description(mut self, description: String) -> Self {
        self.description = Some(description);
        self
    }

    #[allow(dead_code)]
    pub fn with_priority(mut self, priority: Priority) -> Self {
        self.priority = priority;
        self
    }

    #[allow(dead_code)]
    pub fn mark_completed(mut self) -> Self {
        self.is_completed = true;
        self.completion_date = Some(Local::now());
        self.updated_at = Local::now();
        self
    }

    #[allow(dead_code)]
    pub fn mark_incomplete(mut self) -> Self {
        self.is_completed = false;
        self.completion_date = None;
        self.updated_at = Local::now();
        self
    }

    #[allow(dead_code)]
    pub fn matches_search(&self, query: &str) -> bool {
        let trimmed = query.trim();
        if trimmed.is_empty() {
            return false;
        }
        let query_lower = trimmed.to_lowercase();
        let haystack = [
            self.title.as_str(),
            self.description.as_deref().unwrap_or(""),
            self.url.as_deref().unwrap_or(""),
        ]
        .join("\n")
        .to_lowercase();
        haystack.contains(&query_lower)
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