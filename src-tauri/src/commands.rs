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

fn get_conn(db: &State<'_, Database>) -> Arc<Mutex<Connection>> {
    db.conn()
}

fn parse_date(s: &str) -> Option<NaiveDate> {
    NaiveDate::parse_from_str(s, "%Y-%m-%d").ok()
}

fn parse_time(s: &str) -> Option<NaiveTime> {
    NaiveTime::parse_from_str(s, "%H:%M").ok()
}

fn parse_priority(s: &str) -> Priority {
    match s {
        "high" => Priority::High,
        "medium" => Priority::Medium,
        "low" => Priority::Low,
        _ => Priority::None,
    }
}

/// 在已有事务中同步标签（不创建新事务）
/// 使用 UPSERT 模式避免竞态条件，保证数据一致性
fn sync_reminder_tags_in_tx(tx: &rusqlite::Transaction, reminder_id: &str, tag_names: &[String]) -> Result<(), String> {
    tx.execute(
        "DELETE FROM reminder_tags WHERE reminder_id = ?",
        rusqlite::params![reminder_id],
    )
    .map_err(|e| e.to_string())?;
    for name in tag_names {
        let tag_id = Uuid::new_v4().to_string();
        tx.execute(
            "INSERT OR IGNORE INTO tags (id, name) VALUES (?, ?)",
            rusqlite::params![tag_id, name],
        )
        .map_err(|e| e.to_string())?;
        let existing_id: String = tx
            .query_row(
                "SELECT id FROM tags WHERE name = ?",
                rusqlite::params![name],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?;
        tx.execute(
            "INSERT OR IGNORE INTO reminder_tags (reminder_id, tag_id) VALUES (?, ?)",
            rusqlite::params![reminder_id, existing_id],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// 获取单个提醒及其标签
fn get_reminder_with_tags(reminder: Reminder, db: &State<'_, Database>) -> Result<ReminderResponse, String> {
    let mut resp: ReminderResponse = reminder.into();
    resp.tags = get_reminder_tags_internal(get_conn(db), &resp.id)?;
    Ok(resp)
}

/// 批量获取提醒及其标签，使用 JOIN 查询避免 N+1 问题
fn map_reminders_with_tags(reminders: Vec<Reminder>, db: &State<'_, Database>) -> Result<Vec<ReminderResponse>, String> {
    if reminders.is_empty() {
        return Ok(Vec::new());
    }

    let conn = get_conn(db);
    let conn_guard = conn.lock().unwrap();

    // 构建 ID 列表用于 IN 查询
    let ids: Vec<String> = reminders.iter().map(|r| r.id.to_string()).collect();
    let placeholders: Vec<&str> = ids.iter().map(|_| "?").collect();
    let sql = format!(
        "SELECT rt.reminder_id, t.id, t.name FROM reminder_tags rt \
         JOIN tags t ON rt.tag_id = t.id \
         WHERE rt.reminder_id IN ({})",
        placeholders.join(",")
    );

    let mut stmt = conn_guard.prepare(&sql).map_err(|e| e.to_string())?;
    let rows = stmt.query_map(rusqlite::params_from_iter(ids.iter()), |row| {
        Ok((
            row.get::<_, String>(0)?,
            TagResponse {
                id: row.get(1)?,
                name: row.get(2)?,
            },
        ))
    }).map_err(|e| e.to_string())?;

    // 按 reminder_id 分组标签
    let mut tags_by_reminder: std::collections::HashMap<String, Vec<TagResponse>> = std::collections::HashMap::new();
    for row_result in rows {
        if let Ok((reminder_id, tag)) = row_result {
            tags_by_reminder.entry(reminder_id).or_default().push(tag);
        }
    }

    // 构建响应
    Ok(reminders.into_iter().map(|r| {
        let mut resp: ReminderResponse = r.into();
        resp.tags = tags_by_reminder.remove(&resp.id).unwrap_or_default();
        resp
    }).collect())
}

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
    pub due_date: Option<String>,
    pub due_time: Option<String>,
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
            end_date: r.end_date.map(|d| d.format("%Y-%m-%d").to_string()),
            end_time: r.end_time.map(|t| t.format("%H:%M").to_string()),
            is_all_day: r.is_all_day,
            is_completed: r.is_completed,
            is_flagged: r.is_flagged,
            priority: match r.priority {
                Priority::None => "none".to_string(),
                Priority::High => "high".to_string(),
                Priority::Medium => "medium".to_string(),
                Priority::Low => "low".to_string(),
            },
            recurrence_frequency: r.recurrence_frequency,
            recurrence_interval: r.recurrence_interval,
            custom_recurrence_unit: r.custom_recurrence_unit,
            recurrence_end_date: r.recurrence_end_date.map(|d| d.format("%Y-%m-%d").to_string()),
            remind_before_value: r.remind_before_value,
            remind_before_unit: r.remind_before_unit,
            tags: Vec::new(),
            list_id: r.list_id.map(|id| id.to_string()),
            owner_id: r.owner_id.map(|id| id.to_string()),
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateReminderRequest {
    pub title: String,
    pub description: Option<String>,
    pub url: Option<String>,
    pub due_date: Option<String>,
    pub due_time: Option<String>,
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
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateReminderRequest {
    pub id: String,
    pub title: Option<String>,
    pub description: Option<String>,
    pub url: Option<String>,
    pub due_date: Option<String>,
    pub due_time: Option<String>,
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

#[command]
pub fn get_all_reminders(db: State<'_, Database>) -> Result<Vec<ReminderResponse>, String> {
    let repo = ReminderRepository::new(get_conn(&db));
    repo.get_all()
        .map_err(|e| e.to_string())
        .and_then(|reminders| map_reminders_with_tags(reminders, &db))
}

#[command]
pub fn get_reminders_by_filter(db: State<'_, Database>, filter: String) -> Result<Vec<ReminderResponse>, String> {
    let repo = ReminderRepository::new(get_conn(&db));
    let reminders = match filter.as_str() {
        "today" => repo.get_today(),
        "planned" => repo.get_planned(),
        "overdue" => repo.get_overdue(),
        "completed" => repo.get_completed(),
        "urgent" => repo.get_urgent(),
        "flagged" => repo.get_flagged(),
        "all" => repo.get_all(),
        _ => repo.get_active(),
    };
    reminders
        .map_err(|e| e.to_string())
        .and_then(|rs| map_reminders_with_tags(rs, &db))
}

#[command]
pub fn get_reminders_by_list(db: State<'_, Database>, list_id: String) -> Result<Vec<ReminderResponse>, String> {
    let repo = ReminderRepository::new(get_conn(&db));
    let id = Uuid::parse_str(&list_id).map_err(|e| e.to_string())?;
    repo.get_by_list_id(&id)
        .map_err(|e| e.to_string())
        .and_then(|reminders| map_reminders_with_tags(reminders, &db))
}

#[command]
pub fn get_reminder_by_id(db: State<'_, Database>, id: String) -> Result<Option<ReminderResponse>, String> {
    let repo = ReminderRepository::new(get_conn(&db));
    let id = Uuid::parse_str(&id).map_err(|e| e.to_string())?;
    repo.get_by_id(&id)
        .map_err(|e| e.to_string())?
        .map(|r| get_reminder_with_tags(r, &db))
        .transpose()
}

#[command]
pub fn create_reminder(db: State<'_, Database>, request: CreateReminderRequest) -> Result<ReminderResponse, String> {
    let mut reminder = Reminder::new(request.title);

    if let Some(d) = request.due_date.as_deref().and_then(parse_date) {
        reminder = reminder.with_due_date(d);
    }

    if let Some(t) = request.due_time.as_deref().and_then(parse_time) {
        reminder = reminder.with_due_time(t);
    }

    if let Some(desc) = request.description {
        reminder = reminder.with_description(desc);
    }

    if let Some(list_id) = request.list_id.as_deref().and_then(|s| Uuid::parse_str(s).ok()) {
        reminder = reminder.with_list_id(list_id);
    }

    if request.is_all_day {
        reminder = reminder.with_is_all_day();
    }

    if let Some(url) = request.url {
        reminder.url = Some(url);
    }

    if let Some(d) = request.end_date.as_deref().and_then(parse_date) {
        reminder.end_date = Some(d);
    }

    if let Some(t) = request.end_time.as_deref().and_then(parse_time) {
        reminder.end_time = Some(t);
    }

    if request.is_flagged {
        reminder.is_flagged = true;
    }

    if let Some(p) = request.priority.as_deref() {
        reminder.priority = parse_priority(p);
    }

    reminder.recurrence_frequency = request.recurrence_frequency;
    reminder.recurrence_interval = request.recurrence_interval;
    reminder.custom_recurrence_unit = request.custom_recurrence_unit;

    if let Some(d) = request.recurrence_end_date.as_deref().and_then(parse_date) {
        reminder.recurrence_end_date = Some(d);
    }

    reminder.remind_before_value = request.remind_before_value;
    reminder.remind_before_unit = request.remind_before_unit;

    let reminder_id = reminder.id.to_string();
    let conn = get_conn(&db);
    let mut conn_guard = conn.lock().unwrap();
    
    // 使用事务保证原子性：主表插入 + 标签同步
    let tx = conn_guard.transaction().map_err(|e| e.to_string())?;
    
    // 插入主表
    tx.execute(
        "INSERT INTO reminders (id, title, description, due_date, due_time, end_date, end_time, is_all_day, is_completed, is_flagged, priority, list_id, created_at, updated_at, url, completion_date, recurrence_frequency, recurrence_interval, custom_recurrence_unit, recurrence_end_date, remind_before_value, remind_before_unit, location_address, location_latitude, location_longitude, location_radius, location_proximity, owner_id) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23, ?24, ?25, ?26, ?27, ?28)",
        rusqlite::params![
            reminder.id.to_string(),
            reminder.title,
            reminder.description,
            reminder.due_date.map(|d| d.format("%Y-%m-%d").to_string()),
            reminder.due_time.map(|t| t.format("%H:%M:%S").to_string()),
            reminder.end_date.map(|d| d.format("%Y-%m-%d").to_string()),
            reminder.end_time.map(|t| t.format("%H:%M:%S").to_string()),
            reminder.is_all_day as i32,
            reminder.is_completed as i32,
            reminder.is_flagged as i32,
            match reminder.priority {
                Priority::None => "none",
                Priority::High => "high",
                Priority::Medium => "medium",
                Priority::Low => "low",
            },
            reminder.list_id.map(|id| id.to_string()),
            reminder.created_at.to_rfc3339(),
            reminder.updated_at.to_rfc3339(),
            reminder.url,
            reminder.completion_date.map(|d| d.to_rfc3339()),
            reminder.recurrence_frequency,
            reminder.recurrence_interval,
            reminder.custom_recurrence_unit,
            reminder.recurrence_end_date.map(|d| d.format("%Y-%m-%d").to_string()),
            reminder.remind_before_value,
            reminder.remind_before_unit,
            None::<String>,
            None::<f64>,
            None::<f64>,
            None::<f64>,
            None::<String>,
            reminder.owner_id.map(|id| id.to_string()),
        ],
    ).map_err(|e| e.to_string())?;
    
    // 同步标签（在事务中）
    if let Some(tag_names) = request.tags {
        sync_reminder_tags_in_tx(&tx, &reminder_id, &tag_names)?;
    }
    
    tx.commit().map_err(|e| e.to_string())?;

    let mut resp: ReminderResponse = reminder.into();
    resp.tags = get_reminder_tags_internal(get_conn(&db), &reminder_id)?;
    Ok(resp)
}

#[command]
pub fn update_reminder(db: State<'_, Database>, request: UpdateReminderRequest) -> Result<ReminderResponse, String> {
    let repo = ReminderRepository::new(get_conn(&db));
    let id = Uuid::parse_str(&request.id).map_err(|e| e.to_string())?;
    
    let mut reminder = repo.get_by_id(&id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Reminder not found".to_string())?;
    let reminder_id = reminder.id.to_string();
    
    if let Some(title) = request.title {
        reminder.title = title;
    }
    if let Some(description) = request.description {
        reminder.description = if description.is_empty() { None } else { Some(description) };
    }
    if let Some(url) = request.url {
        reminder.url = if url.is_empty() { None } else { Some(url) };
    }
    if let Some(s) = request.due_date {
        reminder.due_date = if s.is_empty() { None } else { parse_date(&s) };
    }
    if let Some(s) = request.due_time {
        reminder.due_time = if s.is_empty() { None } else { parse_time(&s) };
    }
    if let Some(s) = request.end_date {
        reminder.end_date = if s.is_empty() { None } else { parse_date(&s) };
    }
    if let Some(s) = request.end_time {
        reminder.end_time = if s.is_empty() { None } else { parse_time(&s) };
    }
    if let Some(is_completed) = request.is_completed {
        reminder.is_completed = is_completed;
        reminder.completion_date = if is_completed { Some(Local::now()) } else { None };
    }
    if let Some(is_flagged) = request.is_flagged {
        reminder.is_flagged = is_flagged;
    }
    if let Some(s) = request.priority {
        reminder.priority = if s.is_empty() { Priority::None } else { parse_priority(&s) };
    }
    if let Some(s) = request.list_id {
        reminder.list_id = if s.is_empty() { None } else { Uuid::parse_str(&s).ok() };
    }
    if let Some(s) = request.owner_id {
        reminder.owner_id = if s.is_empty() { None } else { Uuid::parse_str(&s).ok() };
    }
    if let Some(is_all_day) = request.is_all_day {
        reminder.is_all_day = is_all_day;
    }
    if let Some(rf) = request.recurrence_frequency {
        reminder.recurrence_frequency = if rf.is_empty() { None } else { Some(rf) };
    }
    reminder.recurrence_interval = request.recurrence_interval;
    if let Some(cru) = request.custom_recurrence_unit {
        reminder.custom_recurrence_unit = if cru.is_empty() { None } else { Some(cru) };
    }
    if let Some(s) = request.recurrence_end_date {
        reminder.recurrence_end_date = if s.is_empty() { None } else { parse_date(&s) };
    }
    reminder.remind_before_value = request.remind_before_value;
    if let Some(rbu) = request.remind_before_unit {
        reminder.remind_before_unit = if rbu.is_empty() { None } else { Some(rbu) };
    }

    // 使用事务保证原子性：更新主表 + 同步标签
    let conn = get_conn(&db);
    let mut conn_guard = conn.lock().unwrap();
    let tx = conn_guard.transaction().map_err(|e| e.to_string())?;
    
    // 更新主表
    tx.execute(
        "UPDATE reminders SET title = ?1, description = ?2, due_date = ?3, due_time = ?4, end_date = ?5, end_time = ?6, is_all_day = ?7, is_completed = ?8, is_flagged = ?9, priority = ?10, list_id = ?11, updated_at = ?12, url = ?13, completion_date = ?14, recurrence_frequency = ?15, recurrence_interval = ?16, custom_recurrence_unit = ?17, recurrence_end_date = ?18, remind_before_value = ?19, remind_before_unit = ?20, location_address = ?21, location_latitude = ?22, location_longitude = ?23, location_radius = ?24, location_proximity = ?25, owner_id = ?26 WHERE id = ?27",
        rusqlite::params![
            reminder.title,
            reminder.description,
            reminder.due_date.map(|d| d.format("%Y-%m-%d").to_string()),
            reminder.due_time.map(|t| t.format("%H:%M:%S").to_string()),
            reminder.end_date.map(|d| d.format("%Y-%m-%d").to_string()),
            reminder.end_time.map(|t| t.format("%H:%M:%S").to_string()),
            reminder.is_all_day as i32,
            reminder.is_completed as i32,
            reminder.is_flagged as i32,
            match reminder.priority {
                Priority::None => "none",
                Priority::High => "high",
                Priority::Medium => "medium",
                Priority::Low => "low",
            },
            reminder.list_id.map(|id| id.to_string()),
            Local::now().to_rfc3339(),
            reminder.url,
            reminder.completion_date.map(|d| d.to_rfc3339()),
            reminder.recurrence_frequency,
            reminder.recurrence_interval,
            reminder.custom_recurrence_unit,
            reminder.recurrence_end_date.map(|d| d.format("%Y-%m-%d").to_string()),
            reminder.remind_before_value,
            reminder.remind_before_unit,
            None::<String>,
            None::<f64>,
            None::<f64>,
            None::<f64>,
            None::<String>,
            reminder.owner_id.map(|id| id.to_string()),
            reminder.id.to_string(),
        ],
    ).map_err(|e| e.to_string())?;
    
    // 同步标签（在事务中）
    if let Some(tag_names) = request.tags {
        sync_reminder_tags_in_tx(&tx, &reminder_id, &tag_names)?;
    }
    
    tx.commit().map_err(|e| e.to_string())?;

    let mut resp: ReminderResponse = reminder.into();
    resp.tags = get_reminder_tags_internal(get_conn(&db), &reminder_id)?;
    Ok(resp)
}

#[command]
pub fn delete_reminder(db: State<'_, Database>, id: String) -> Result<(), String> {
    let repo = ReminderRepository::new(get_conn(&db));
    let id = Uuid::parse_str(&id).map_err(|e| e.to_string())?;
    repo.delete(&id).map_err(|e| e.to_string())
}

#[command]
pub fn toggle_reminder_completed(db: State<'_, Database>, id: String) -> Result<ReminderResponse, String> {
    let repo = ReminderRepository::new(get_conn(&db));
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
    get_reminder_with_tags(reminder, &db)
}

#[command]
pub fn get_all_lists(db: State<'_, Database>) -> Result<Vec<ListResponse>, String> {
    let repo = ListRepository::new(get_conn(&db));
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
    
    let repo = ListRepository::new(get_conn(&db));
    repo.insert(&list).map_err(|e| e.to_string())?;
    Ok(list.into())
}

#[command]
pub fn delete_list(db: State<'_, Database>, id: String) -> Result<(), String> {
    let repo = ListRepository::new(get_conn(&db));
    let id = Uuid::parse_str(&id).map_err(|e| e.to_string())?;
    repo.delete(&id).map_err(|e| e.to_string())
}

#[command]
pub fn update_list(db: State<'_, Database>, request: UpdateListRequest) -> Result<ListResponse, String> {
    let repo = ListRepository::new(get_conn(&db));
    let id = Uuid::parse_str(&request.id).map_err(|e| e.to_string())?;
    
    let mut list = repo.get_by_id(&id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "List not found".to_string())?;
    
    if let Some(name) = request.name {
        list.name = name;
    }
    if let Some(color) = request.color {
        list.color = color;
    }
    if let Some(icon) = request.icon {
        list.icon = icon;
    }
    
    repo.update(&list).map_err(|e| e.to_string())?;
    Ok(list.into())
}

#[command]
pub fn get_all_owners(db: State<'_, Database>) -> Result<Vec<OwnerResponse>, String> {
    let repo = OwnerRepository::new(get_conn(&db));
    repo.get_all()
        .map(|owners| owners.into_iter().map(Into::into).collect())
        .map_err(|e| e.to_string())
}

#[command]
pub fn search_reminders(db: State<'_, Database>, query: String) -> Result<Vec<ReminderResponse>, String> {
    let repo = ReminderRepository::new(get_conn(&db));
    repo.search(&query)
        .map_err(|e| e.to_string())
        .and_then(|reminders| map_reminders_with_tags(reminders, &db))
}

fn get_reminder_tags_internal(conn: Arc<Mutex<Connection>>, reminder_id: &str) -> Result<Vec<TagResponse>, String> {
    let conn = conn.lock().unwrap();
    let mut stmt = conn.prepare(
        "SELECT t.id, t.name FROM tags t INNER JOIN reminder_tags rt ON t.id = rt.tag_id WHERE rt.reminder_id = ?"
    ).map_err(|e| e.to_string())?;
    let rows = stmt.query_map([reminder_id], |row| {
        Ok(TagResponse {
            id: row.get(0)?,
            name: row.get(1)?,
        })
    }).map_err(|e| e.to_string())?;
    Ok(rows.filter_map(|r| r.ok()).collect())
}

#[command]
pub fn get_reminder_tags(db: State<'_, Database>, reminder_id: String) -> Result<Vec<TagResponse>, String> {
    get_reminder_tags_internal(get_conn(&db), &reminder_id)
}

#[command]
pub fn get_all_tags(db: State<'_, Database>) -> Result<Vec<TagResponse>, String> {
    let conn = get_conn(&db);
    let conn = conn.lock().unwrap();
    let mut stmt = conn.prepare("SELECT id, name FROM tags ORDER BY name").map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |row| {
        Ok(TagResponse {
            id: row.get(0)?,
            name: row.get(1)?,
        })
    }).map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[command]
pub fn search_tags(db: State<'_, Database>, query: String) -> Result<Vec<TagResponse>, String> {
    let conn = get_conn(&db);
    let conn = conn.lock().unwrap();
    let like = format!("%{}%", query);
    let mut stmt = conn.prepare("SELECT id, name FROM tags WHERE name LIKE ? ORDER BY name LIMIT 20")
        .map_err(|e| e.to_string())?;
    let rows = stmt.query_map([like], |row| {
        Ok(TagResponse {
            id: row.get(0)?,
            name: row.get(1)?,
        })
    }).map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[command]
pub fn create_owner(db: State<'_, Database>, request: CreateOwnerRequest) -> Result<OwnerResponse, String> {
    let mut owner = Owner::new(request.name);
    
    if let Some(color) = request.color {
        owner = owner.with_color(color);
    }
    
    let repo = OwnerRepository::new(get_conn(&db));
    repo.insert(&owner).map_err(|e| e.to_string())?;
    Ok(owner.into())
}

#[command]
pub fn delete_owner(db: State<'_, Database>, id: String) -> Result<(), String> {
    let repo = OwnerRepository::new(get_conn(&db));
    let id = Uuid::parse_str(&id).map_err(|e| e.to_string())?;
    repo.delete(&id).map_err(|e| e.to_string())
}

#[command]
pub fn update_owner(db: State<'_, Database>, request: UpdateOwnerRequest) -> Result<OwnerResponse, String> {
    let repo = OwnerRepository::new(get_conn(&db));
    let id = Uuid::parse_str(&request.id).map_err(|e| e.to_string())?;
    
    let mut owner = repo.get_by_id(&id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Owner not found".to_string())?;
    
    if let Some(name) = request.name {
        owner.name = name;
    }
    if let Some(color) = request.color {
        owner.color = color;
    }
    
    repo.update(&owner).map_err(|e| e.to_string())?;
    Ok(owner.into())
}
