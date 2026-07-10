use std::sync::{Arc, Mutex};

use chrono::{Local, NaiveDate, NaiveTime};
use rusqlite::{params, Connection, OptionalExtension, Result, Row};
use serde::{Deserialize, Serialize};
use tauri::{command, State};
use uuid::Uuid;

use crate::database::connection::Database;
use crate::models::owner::Owner;
use crate::models::reminder::{Priority, Reminder, ReminderList};

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

struct ReminderRepository {
    conn: Arc<Mutex<Connection>>,
}

impl ReminderRepository {
    fn new(conn: Arc<Mutex<Connection>>) -> Self {
        Self { conn }
    }

    fn get_all(&self) -> Result<Vec<Reminder>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, title, description, due_date, due_time, is_completed, priority, list_id, created_at, updated_at, url, is_all_day, completion_date, alarm_at, recurrence_frequency, recurrence_interval, location_address, location_latitude, location_longitude, location_radius, location_proximity, owner_id FROM reminders ORDER BY created_at DESC")?;
        let rows = stmt.query_map([], Self::row_to_reminder)?;
        rows.collect()
    }

    fn get_by_id(&self, id: &Uuid) -> Result<Option<Reminder>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, title, description, due_date, due_time, is_completed, priority, list_id, created_at, updated_at, url, is_all_day, completion_date, alarm_at, recurrence_frequency, recurrence_interval, location_address, location_latitude, location_longitude, location_radius, location_proximity, owner_id FROM reminders WHERE id = ?")?;
        stmt.query_row([id.to_string()], Self::row_to_reminder)
            .optional()
    }

    fn get_by_list_id(&self, list_id: &Uuid) -> Result<Vec<Reminder>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, title, description, due_date, due_time, is_completed, priority, list_id, created_at, updated_at, url, is_all_day, completion_date, alarm_at, recurrence_frequency, recurrence_interval, location_address, location_latitude, location_longitude, location_radius, location_proximity, owner_id FROM reminders WHERE list_id = ? ORDER BY created_at DESC")?;
        let rows = stmt.query_map([list_id.to_string()], Self::row_to_reminder)?;
        rows.collect()
    }

    fn get_today(&self) -> Result<Vec<Reminder>> {
        let today = Local::now().date_naive();
        let conn = self.conn.lock().unwrap();
        let date_str = today.format("%Y-%m-%d").to_string();
        let mut stmt = conn.prepare("SELECT id, title, description, due_date, due_time, is_completed, priority, list_id, created_at, updated_at, url, is_all_day, completion_date, alarm_at, recurrence_frequency, recurrence_interval, location_address, location_latitude, location_longitude, location_radius, location_proximity, owner_id FROM reminders WHERE due_date = ? AND is_completed = 0 ORDER BY created_at DESC")?;
        let rows = stmt.query_map([date_str], Self::row_to_reminder)?;
        rows.collect()
    }

    fn get_planned(&self) -> Result<Vec<Reminder>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, title, description, due_date, due_time, is_completed, priority, list_id, created_at, updated_at, url, is_all_day, completion_date, alarm_at, recurrence_frequency, recurrence_interval, location_address, location_latitude, location_longitude, location_radius, location_proximity, owner_id FROM reminders WHERE due_date IS NOT NULL AND is_completed = 0 ORDER BY created_at DESC")?;
        let rows = stmt.query_map([], Self::row_to_reminder)?;
        rows.collect()
    }

    fn get_active(&self) -> Result<Vec<Reminder>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, title, description, due_date, due_time, is_completed, priority, list_id, created_at, updated_at, url, is_all_day, completion_date, alarm_at, recurrence_frequency, recurrence_interval, location_address, location_latitude, location_longitude, location_radius, location_proximity, owner_id FROM reminders WHERE is_completed = 0 ORDER BY created_at DESC")?;
        let rows = stmt.query_map([], Self::row_to_reminder)?;
        rows.collect()
    }

    fn get_completed(&self) -> Result<Vec<Reminder>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, title, description, due_date, due_time, is_completed, priority, list_id, created_at, updated_at, url, is_all_day, completion_date, alarm_at, recurrence_frequency, recurrence_interval, location_address, location_latitude, location_longitude, location_radius, location_proximity, owner_id FROM reminders WHERE is_completed = 1 ORDER BY created_at DESC")?;
        let rows = stmt.query_map([], Self::row_to_reminder)?;
        rows.collect()
    }

    fn get_overdue(&self) -> Result<Vec<Reminder>> {
        let today = Local::now().date_naive();
        let conn = self.conn.lock().unwrap();
        let date_str = today.format("%Y-%m-%d").to_string();
        let mut stmt = conn.prepare("SELECT id, title, description, due_date, due_time, is_completed, priority, list_id, created_at, updated_at, url, is_all_day, completion_date, alarm_at, recurrence_frequency, recurrence_interval, location_address, location_latitude, location_longitude, location_radius, location_proximity, owner_id FROM reminders WHERE due_date < ? AND is_completed = 0 ORDER BY created_at DESC")?;
        let rows = stmt.query_map([date_str], Self::row_to_reminder)?;
        rows.collect()
    }

    fn insert(&self, reminder: &Reminder) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO reminders (id, title, description, due_date, due_time, is_completed, priority, list_id, created_at, updated_at, url, is_all_day, completion_date, alarm_at, recurrence_frequency, recurrence_interval, location_address, location_latitude, location_longitude, location_radius, location_proximity, owner_id) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22)",
            params![
                reminder.id.to_string(),
                reminder.title,
                reminder.description,
                reminder.due_date.map(|d| d.format("%Y-%m-%d").to_string()),
                reminder.due_time.map(|t| t.format("%H:%M:%S").to_string()),
                reminder.is_completed as i32,
                Self::priority_to_str(&reminder.priority),
                reminder.list_id.map(|id| id.to_string()),
                reminder.created_at.to_rfc3339(),
                reminder.updated_at.to_rfc3339(),
                reminder.url,
                reminder.is_all_day as i32,
                reminder.completion_date.map(|d| d.to_rfc3339()),
                reminder.alarm_at.map(|d| d.to_rfc3339()),
                None::<String>,
                None::<i64>,
                None::<String>,
                None::<f64>,
                None::<f64>,
                None::<f64>,
                None::<String>,
                reminder.owner_id.map(|id| id.to_string()),
            ],
        )?;
        Ok(())
    }

    fn update(&self, reminder: &Reminder) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let now = Local::now();
        conn.execute(
            "UPDATE reminders SET title = ?1, description = ?2, due_date = ?3, due_time = ?4, is_completed = ?5, priority = ?6, list_id = ?7, updated_at = ?8, url = ?9, is_all_day = ?10, completion_date = ?11, alarm_at = ?12, recurrence_frequency = ?13, recurrence_interval = ?14, location_address = ?15, location_latitude = ?16, location_longitude = ?17, location_radius = ?18, location_proximity = ?19, owner_id = ?20 WHERE id = ?21",
            params![
                reminder.title,
                reminder.description,
                reminder.due_date.map(|d| d.format("%Y-%m-%d").to_string()),
                reminder.due_time.map(|t| t.format("%H:%M:%S").to_string()),
                reminder.is_completed as i32,
                Self::priority_to_str(&reminder.priority),
                reminder.list_id.map(|id| id.to_string()),
                now.to_rfc3339(),
                reminder.url,
                reminder.is_all_day as i32,
                reminder.completion_date.map(|d| d.to_rfc3339()),
                reminder.alarm_at.map(|d| d.to_rfc3339()),
                None::<String>,
                None::<i64>,
                None::<String>,
                None::<f64>,
                None::<f64>,
                None::<f64>,
                None::<String>,
                reminder.owner_id.map(|id| id.to_string()),
                reminder.id.to_string(),
            ],
        )?;
        Ok(())
    }

    fn delete(&self, id: &Uuid) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM reminders WHERE id = ?", [id.to_string()])?;
        Ok(())
    }

    fn row_to_reminder(row: &Row) -> Result<Reminder> {
        let id_str: String = row.get("id")?;
        let id = Uuid::parse_str(&id_str).unwrap_or_else(|_| Uuid::new_v4());

        let due_date_str: Option<String> = row.get("due_date")?;
        let due_date = due_date_str
            .as_deref()
            .and_then(|s| NaiveDate::parse_from_str(s, "%Y-%m-%d").ok());

        let due_time_str: Option<String> = row.get("due_time")?;
        let due_time = due_time_str
            .as_deref()
            .and_then(|s| NaiveTime::parse_from_str(s, "%H:%M:%S").ok());

        let is_completed: i32 = row.get("is_completed")?;
        let priority_str: String = row.get("priority")?;
        let list_id_str: Option<String> = row.get("list_id")?;
        let list_id = list_id_str.as_deref().and_then(|s| Uuid::parse_str(s).ok());
        let owner_id_str: Option<String> = row.get("owner_id").unwrap_or(None);
        let owner_id = owner_id_str.as_deref().and_then(|s| Uuid::parse_str(s).ok());

        let created_at_str: String = row.get("created_at")?;
        let created_at = chrono::DateTime::parse_from_rfc3339(&created_at_str)
            .unwrap_or_else(|_| Local::now().into())
            .with_timezone(&Local);

        let updated_at_str: String = row.get("updated_at")?;
        let updated_at = chrono::DateTime::parse_from_rfc3339(&updated_at_str)
            .unwrap_or_else(|_| Local::now().into())
            .with_timezone(&Local);

        let url: Option<String> = row.get("url").unwrap_or(None);
        let is_all_day: i32 = row.get("is_all_day").unwrap_or(0);

        let completion_date = row
            .get::<_, Option<String>>("completion_date")
            .ok()
            .flatten()
            .and_then(|s| chrono::DateTime::parse_from_rfc3339(&s).ok())
            .map(|d| d.with_timezone(&Local));

        let alarm_at = row
            .get::<_, Option<String>>("alarm_at")
            .ok()
            .flatten()
            .and_then(|s| chrono::DateTime::parse_from_rfc3339(&s).ok())
            .map(|d| d.with_timezone(&Local));

        Ok(Reminder {
            id,
            title: row.get("title")?,
            description: row.get("description")?,
            url,
            due_date,
            due_time,
            is_all_day: is_all_day != 0,
            is_completed: is_completed != 0,
            completion_date,
            priority: Self::str_to_priority(&priority_str),
            alarm_at,
            recurrence: None,
            location: None,
            owner_id,
            list_id,
            created_at,
            updated_at,
        })
    }

    fn priority_to_str(priority: &Priority) -> &str {
        match priority {
            Priority::None => "none",
            Priority::High => "high",
            Priority::Medium => "medium",
            Priority::Low => "low",
        }
    }

    fn str_to_priority(s: &str) -> Priority {
        match s {
            "high" => Priority::High,
            "low" => Priority::Low,
            "medium" => Priority::Medium,
            _ => Priority::None,
        }
    }
}

struct ListRepository {
    conn: Arc<Mutex<Connection>>,
}

impl ListRepository {
    fn new(conn: Arc<Mutex<Connection>>) -> Self {
        Self { conn }
    }

    fn get_all(&self) -> Result<Vec<ReminderList>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, name, color, icon FROM reminder_lists ORDER BY name")?;
        let rows = stmt.query_map([], Self::row_to_list)?;
        rows.collect()
    }

    fn insert(&self, list: &ReminderList) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO reminder_lists (id, name, color, icon) VALUES (?, ?, ?, ?)",
            params![list.id.to_string(), list.name, list.color, list.icon],
        )?;
        Ok(())
    }

    fn delete(&self, id: &Uuid) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM reminder_lists WHERE id = ?", [id.to_string()])?;
        Ok(())
    }

    fn row_to_list(row: &Row) -> Result<ReminderList> {
        let id_str: String = row.get("id")?;
        let id = Uuid::parse_str(&id_str).unwrap_or_else(|_| Uuid::new_v4());

        Ok(ReminderList {
            id,
            name: row.get("name")?,
            color: row.get("color")?,
            icon: row.get("icon")?,
        })
    }
}

struct OwnerRepository {
    conn: Arc<Mutex<Connection>>,
}

impl OwnerRepository {
    fn new(conn: Arc<Mutex<Connection>>) -> Self {
        Self { conn }
    }

    fn get_all(&self) -> Result<Vec<Owner>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, name, color FROM owners ORDER BY name")?;
        let rows = stmt.query_map([], Self::row_to_owner)?;
        rows.collect()
    }

    fn insert(&self, owner: &Owner) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO owners (id, name, color) VALUES (?, ?, ?)",
            params![owner.id.to_string(), owner.name, owner.color],
        )?;
        Ok(())
    }

    fn delete(&self, id: &Uuid) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM owners WHERE id = ?", [id.to_string()])?;
        Ok(())
    }

    fn row_to_owner(row: &Row) -> Result<Owner> {
        let id_str: String = row.get("id")?;
        let id = Uuid::parse_str(&id_str).unwrap_or_else(|_| Uuid::new_v4());

        Ok(Owner {
            id,
            name: row.get("name")?,
            color: row.get("color")?,
        })
    }
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
