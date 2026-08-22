use serde::{Deserialize, Serialize};

use crate::models::owner::Owner;
use crate::models::reminder::{Reminder, ReminderList};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TagResponse {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ReminderResponse {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub url: Option<String>,
    pub created_date: Option<String>,
    pub created_time: Option<String>,
    pub end_date: Option<String>,
    pub end_time: Option<String>,
    pub is_all_day: bool,
    pub is_completed: bool,
    pub is_flagged: bool,
    pub priority: String,
    pub recurrence_frequency: Option<String>,
    pub recurrence_interval: Option<i32>,
    pub custom_recurrence_unit: Option<String>,
    pub recurrence_end_date: Option<String>,
    pub remind_before_value: Option<i32>,
    pub remind_before_unit: Option<String>,
    pub tags: Vec<TagResponse>,
    #[serde(default)]
    pub subtasks: Vec<SubtaskResponse>,
    pub list_id: Option<String>,
    pub owner_id: Option<String>,
    /// 父任务 ID
    pub parent_id: Option<String>,
}

/// 子任务；`reminder_id` 为父任务 ID
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubtaskResponse {
    pub id: String,
    /// 父任务 ID
    pub reminder_id: String,
    pub title: String,
    pub is_completed: bool,
    pub sort_order: i32,
}

impl From<Reminder> for ReminderResponse {
    fn from(r: Reminder) -> Self {
        Self {
            id: r.id.to_string(),
            title: r.title,
            description: r.description,
            url: r.url,
            created_date: r.created_date.map(|d| d.format("%Y-%m-%d").to_string()),
            created_time: r.created_time.map(|t| t.format("%H:%M:%S").to_string()),
            end_date: r.end_date.map(|d| d.format("%Y-%m-%d").to_string()),
            // 与前端 TimePicker 统一为 HH:mm，避免 09:00 / 09:00:00 反复被当成变更
            end_time: r.end_time.map(|t| t.format("%H:%M").to_string()),
            is_all_day: r.is_all_day,
            is_completed: r.is_completed,
            is_flagged: r.is_flagged,
            priority: r.priority.as_str().to_string(),
            recurrence_frequency: r.recurrence_frequency,
            recurrence_interval: r.recurrence_interval,
            custom_recurrence_unit: r.custom_recurrence_unit,
            recurrence_end_date: r.recurrence_end_date.map(|d| d.format("%Y-%m-%d").to_string()),
            remind_before_value: r.remind_before_value,
            remind_before_unit: r.remind_before_unit,
            tags: Vec::new(),
            subtasks: Vec::new(),
            list_id: r.list_id.map(|id| id.to_string()),
            owner_id: r.owner_id.map(|id| id.to_string()),
            parent_id: r.parent_id.map(|id| id.to_string()),
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateReminderRequest {
    pub title: String,
    pub description: Option<String>,
    pub url: Option<String>,
    pub end_date: Option<String>,
    pub end_time: Option<String>,
    pub list_id: Option<String>,
    #[serde(default)]
    pub is_all_day: bool,
    #[serde(default)]
    pub is_flagged: bool,
    pub priority: Option<String>,
    pub recurrence_frequency: Option<String>,
    pub recurrence_interval: Option<i32>,
    pub custom_recurrence_unit: Option<String>,
    pub recurrence_end_date: Option<String>,
    pub remind_before_value: Option<i32>,
    pub remind_before_unit: Option<String>,
    pub tags: Option<Vec<String>>,
    pub owner_id: Option<String>,
    /// 父任务 ID
    pub parent_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateReminderRequest {
    pub id: String,
    pub title: Option<String>,
    pub description: Option<String>,
    pub url: Option<String>,
    pub end_date: Option<String>,
    pub end_time: Option<String>,
    pub is_completed: Option<bool>,
    pub is_flagged: Option<bool>,
    pub priority: Option<String>,
    pub list_id: Option<String>,
    pub owner_id: Option<String>,
    pub is_all_day: Option<bool>,
    pub recurrence_frequency: Option<String>,
    pub recurrence_interval: Option<i32>,
    pub custom_recurrence_unit: Option<String>,
    pub recurrence_end_date: Option<String>,
    pub remind_before_value: Option<i32>,
    pub remind_before_unit: Option<String>,
    pub tags: Option<Vec<String>>,
    /// 传空字符串可清空父任务
    pub parent_id: Option<String>,
}

/// 创建子任务；`reminder_id` 为父任务 ID
#[derive(Debug, Serialize, Deserialize)]
pub struct CreateSubtaskRequest {
    /// 父任务 ID
    pub reminder_id: String,
    pub title: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateSubtaskRequest {
    pub id: String,
    pub title: Option<String>,
    pub is_completed: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ListResponse {
    pub id: String,
    pub name: String,
    pub color: String,
    pub icon: String,
}

impl From<ReminderList> for ListResponse {
    fn from(l: ReminderList) -> Self {
        Self {
            id: l.id.to_string(),
            name: l.name,
            color: l.color,
            icon: l.icon,
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateListRequest {
    pub name: String,
    pub color: Option<String>,
    pub icon: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateListRequest {
    pub id: String,
    pub name: Option<String>,
    pub color: Option<String>,
    pub icon: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OwnerResponse {
    pub id: String,
    pub name: String,
    pub color: String,
}

impl From<Owner> for OwnerResponse {
    fn from(o: Owner) -> Self {
        Self {
            id: o.id.to_string(),
            name: o.name,
            color: o.color,
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateOwnerRequest {
    pub name: String,
    pub color: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateOwnerRequest {
    pub id: String,
    pub name: Option<String>,
    pub color: Option<String>,
}
