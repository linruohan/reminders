use std::sync::{Arc, Mutex};

use chrono::{Local, NaiveDate, NaiveTime};
use rusqlite::{Connection, Result};
use serde::{Deserialize, Serialize};
use tauri::{command, State};
use uuid::Uuid;

use crate::database::connection::Database;
use crate::models::owner::Owner;
use crate::models::reminder::{Priority, Reminder, ReminderList};
use crate::repository::list::ListRepository;
use crate::repository::owner::OwnerRepository;
use crate::repository::reminder::ReminderRepository;

fn get_conn(db: State<'_, Database>) -> Arc<Mutex<Connection>> {
    db.conn()
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ReminderResponse {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub url: Option<String>,
    pub due_date: Option<String>,
    pub due_time: Option<String>,
    pub is_all_day: bool,
    pub is_completed: bool,
    pub priority: String,
    pub list_id: Option<String>,
    pub owner_id: Option<String>,
}

impl From<Reminder> for ReminderResponse {
    fn from(r: Reminder) -> Self {
        Self {
            id: r.id.to_string(),
            title: r.title,
            description: r.description,
            url: r.url,
            due_date: r.due_date.map(|d| d.format("%Y-%m-%d").to_string()),
            due_time: r.due_time.map(|t| t.format("%H:%M").to_string()),
            is_all_day: r.is_all_day,
            is_completed: r.is_completed,
            priority: match r.priority {
                Priority::None => "none".to_string(),
                Priority::High => "high".to_string(),
                Priority::Medium => "medium".to_string(),
                Priority::Low => "low".to_string(),
            },
            list_id: r.list_id.map(|id| id.to_string()),
            owner_id: r.owner_id.map(|id| id.to_string()),
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateReminderRequest {
    pub title: String,
    pub description: Option<String>,
    pub due_date: Option<String>,
    pub due_time: Option<String>,
    pub list_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateReminderRequest {
    pub id: String,
    pub title: Option<String>,
    pub description: Option<String>,
    pub due_date: Option<String>,
    pub due_time: Option<String>,
    pub is_completed: Option<bool>,
    pub priority: Option<String>,
    pub list_id: Option<String>,
    pub owner_id: Option<String>,
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

#[command]
pub fn get_all_reminders(db: State<'_, Database>) -> Result<Vec<ReminderResponse>, String> {
    let repo = ReminderRepository::new(get_conn(db));
    repo.get_all()
        .map(|reminders| reminders.into_iter().map(Into::into).collect())
        .map_err(|e| e.to_string())
}

#[command]
pub fn get_reminders_by_filter(db: State<'_, Database>, filter: String) -> Result<Vec<ReminderResponse>, String> {
    let repo = ReminderRepository::new(get_conn(db));
    let reminders = match filter.as_str() {
        "today" => repo.get_today(),
        "planned" => repo.get_planned(),
        "overdue" => repo.get_overdue(),
        "completed" => repo.get_completed(),
        "all" => repo.get_all(),
        _ => repo.get_active(),
    };
    reminders
        .map(|reminders| reminders.into_iter().map(Into::into).collect())
        .map_err(|e| e.to_string())
}

#[command]
pub fn get_reminders_by_list(db: State<'_, Database>, list_id: String) -> Result<Vec<ReminderResponse>, String> {
    let repo = ReminderRepository::new(get_conn(db));
    let id = Uuid::parse_str(&list_id).map_err(|e| e.to_string())?;
    repo.get_by_list_id(&id)
        .map(|reminders| reminders.into_iter().map(Into::into).collect())
        .map_err(|e| e.to_string())
}

#[command]
pub fn get_reminder_by_id(db: State<'_, Database>, id: String) -> Result<Option<ReminderResponse>, String> {
    let repo = ReminderRepository::new(get_conn(db));
    let id = Uuid::parse_str(&id).map_err(|e| e.to_string())?;
    repo.get_by_id(&id)
        .map(|reminder| reminder.map(Into::into))
        .map_err(|e| e.to_string())
}

#[command]
pub fn create_reminder(db: State<'_, Database>, request: CreateReminderRequest) -> Result<ReminderResponse, String> {
    let mut reminder = Reminder::new(request.title);
    
    if let Some(date_str) = request.due_date {
        if let Ok(date) = NaiveDate::parse_from_str(&date_str, "%Y-%m-%d") {
            reminder = reminder.with_due_date(date);
        }
    }
    
    if let Some(time_str) = request.due_time {
        if let Ok(time) = NaiveTime::parse_from_str(&time_str, "%H:%M") {
            reminder = reminder.with_due_time(time);
        }
    }
    
    if let Some(desc) = request.description {
        reminder = reminder.with_description(desc);
    }
    
    if let Some(list_id_str) = request.list_id {
        if let Ok(list_id) = Uuid::parse_str(&list_id_str) {
            reminder = reminder.with_list_id(list_id);
        }
    }
    
    let repo = ReminderRepository::new(get_conn(db));
    repo.insert(&reminder).map_err(|e| e.to_string())?;
    Ok(reminder.into())
}

#[command]
pub fn update_reminder(db: State<'_, Database>, request: UpdateReminderRequest) -> Result<ReminderResponse, String> {
    let repo = ReminderRepository::new(get_conn(db));
    let id = Uuid::parse_str(&request.id).map_err(|e| e.to_string())?;
    
    let mut reminder = repo.get_by_id(&id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Reminder not found".to_string())?;
    
    if let Some(title) = request.title {
        reminder.title = title;
    }
    if let Some(description) = request.description {
        reminder.description = if description.is_empty() { None } else { Some(description) };
    }
    if let Some(date_str) = request.due_date {
        if date_str.is_empty() {
            reminder.due_date = None;
        } else if let Ok(date) = NaiveDate::parse_from_str(&date_str, "%Y-%m-%d") {
            reminder.due_date = Some(date);
        }
    }
    if let Some(time_str) = request.due_time {
        if time_str.is_empty() {
            reminder.due_time = None;
        } else if let Ok(time) = NaiveTime::parse_from_str(&time_str, "%H:%M") {
            reminder.due_time = Some(time);
        }
    }
    if let Some(is_completed) = request.is_completed {
        reminder.is_completed = is_completed;
        if is_completed {
            reminder.completion_date = Some(Local::now());
        } else {
            reminder.completion_date = None;
        }
    }
    if let Some(priority_str) = request.priority {
        reminder.priority = match priority_str.as_str() {
            "high" => Priority::High,
            "medium" => Priority::Medium,
            "low" => Priority::Low,
            _ => Priority::None,
        };
    }
    if let Some(list_id_str) = request.list_id {
        if list_id_str.is_empty() {
            reminder.list_id = None;
        } else if let Ok(list_id) = Uuid::parse_str(&list_id_str) {
            reminder.list_id = Some(list_id);
        }
    }
    if let Some(owner_id_str) = request.owner_id {
        if owner_id_str.is_empty() {
            reminder.owner_id = None;
        } else if let Ok(owner_id) = Uuid::parse_str(&owner_id_str) {
            reminder.owner_id = Some(owner_id);
        }
    }
    
    repo.update(&reminder).map_err(|e| e.to_string())?;
    Ok(reminder.into())
}

#[command]
pub fn delete_reminder(db: State<'_, Database>, id: String) -> Result<(), String> {
    let repo = ReminderRepository::new(get_conn(db));
    let id = Uuid::parse_str(&id).map_err(|e| e.to_string())?;
    repo.delete(&id).map_err(|e| e.to_string())
}

#[command]
pub fn toggle_reminder_completed(db: State<'_, Database>, id: String) -> Result<ReminderResponse, String> {
    let repo = ReminderRepository::new(get_conn(db));
    let id = Uuid::parse_str(&id).map_err(|e| e.to_string())?;
    
    let mut reminder = repo.get_by_id(&id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Reminder not found".to_string())?;
    
    reminder.is_completed = !reminder.is_completed;
    if reminder.is_completed {
        reminder.completion_date = Some(Local::now());
    } else {
        reminder.completion_date = None;
    }
    
    repo.update(&reminder).map_err(|e| e.to_string())?;
    Ok(reminder.into())
}

#[command]
pub fn get_all_lists(db: State<'_, Database>) -> Result<Vec<ListResponse>, String> {
    let repo = ListRepository::new(get_conn(db));
    repo.get_all()
        .map(|lists| lists.into_iter().map(Into::into).collect())
        .map_err(|e| e.to_string())
}

#[command]
pub fn create_list(db: State<'_, Database>, request: CreateListRequest) -> Result<ListResponse, String> {
    let mut list = ReminderList::new(request.name);
    
    if let Some(color) = request.color {
        list = list.with_color(color);
    }
    if let Some(icon) = request.icon {
        list = list.with_icon(icon);
    }
    
    let repo = ListRepository::new(get_conn(db));
    repo.insert(&list).map_err(|e| e.to_string())?;
    Ok(list.into())
}

#[command]
pub fn delete_list(db: State<'_, Database>, id: String) -> Result<(), String> {
    let repo = ListRepository::new(get_conn(db));
    let id = Uuid::parse_str(&id).map_err(|e| e.to_string())?;
    repo.delete(&id).map_err(|e| e.to_string())
}

#[command]
pub fn get_all_owners(db: State<'_, Database>) -> Result<Vec<OwnerResponse>, String> {
    let repo = OwnerRepository::new(get_conn(db));
    repo.get_all()
        .map(|owners| owners.into_iter().map(Into::into).collect())
        .map_err(|e| e.to_string())
}

#[command]
pub fn search_reminders(db: State<'_, Database>, query: String) -> Result<Vec<ReminderResponse>, String> {
    let repo = ReminderRepository::new(get_conn(db));
    repo.search(&query)
        .map(|reminders| reminders.into_iter().map(Into::into).collect())
        .map_err(|e| e.to_string())
}

#[command]
pub fn create_owner(db: State<'_, Database>, request: CreateOwnerRequest) -> Result<OwnerResponse, String> {
    let mut owner = Owner::new(request.name);
    
    if let Some(color) = request.color {
        owner = owner.with_color(color);
    }
    
    let repo = OwnerRepository::new(get_conn(db));
    repo.insert(&owner).map_err(|e| e.to_string())?;
    Ok(owner.into())
}

#[command]
pub fn delete_owner(db: State<'_, Database>, id: String) -> Result<(), String> {
    let repo = OwnerRepository::new(get_conn(db));
    let id = Uuid::parse_str(&id).map_err(|e| e.to_string())?;
    repo.delete(&id).map_err(|e| e.to_string())
}
