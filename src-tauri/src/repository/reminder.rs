use std::sync::{Arc, Mutex};

use chrono::{Local, NaiveDate, NaiveTime};
use rusqlite::{params, Connection, OptionalExtension, Result, Row};
use uuid::Uuid;

use crate::models::reminder::{Priority, Reminder};

const REMINDER_FIELDS: &str = "id, title, description, due_date, due_time, is_completed, priority, list_id, created_at, updated_at, url, is_all_day, completion_date, alarm_at, recurrence_frequency, recurrence_interval, location_address, location_latitude, location_longitude, location_radius, location_proximity, owner_id";

pub struct ReminderRepository {
    conn: Arc<Mutex<Connection>>,
}

impl ReminderRepository {
    pub fn new(conn: Arc<Mutex<Connection>>) -> Self {
        Self { conn }
    }

    pub fn get_all(&self) -> Result<Vec<Reminder>> {
        let conn = self.conn.lock().unwrap();
        let query = format!("SELECT {REMINDER_FIELDS} FROM reminders ORDER BY created_at DESC");
        let mut stmt = conn.prepare(&query)?;
        let rows = stmt.query_map([], Self::row_to_reminder)?;
        rows.collect()
    }

    pub fn get_by_id(&self, id: &Uuid) -> Result<Option<Reminder>> {
        let conn = self.conn.lock().unwrap();
        let query = format!("SELECT {REMINDER_FIELDS} FROM reminders WHERE id = ?");
        let mut stmt = conn.prepare(&query)?;
        stmt.query_row([id.to_string()], Self::row_to_reminder)
            .optional()
    }

    pub fn get_by_list_id(&self, list_id: &Uuid) -> Result<Vec<Reminder>> {
        let conn = self.conn.lock().unwrap();
        let query = format!("SELECT {REMINDER_FIELDS} FROM reminders WHERE list_id = ? ORDER BY created_at DESC");
        let mut stmt = conn.prepare(&query)?;
        let rows = stmt.query_map([list_id.to_string()], Self::row_to_reminder)?;
        rows.collect()
    }

    pub fn get_today(&self) -> Result<Vec<Reminder>> {
        let today = Local::now().date_naive();
        let conn = self.conn.lock().unwrap();
        let date_str = today.format("%Y-%m-%d").to_string();
        let query = format!("SELECT {REMINDER_FIELDS} FROM reminders WHERE due_date = ? AND is_completed = 0 ORDER BY created_at DESC");
        let mut stmt = conn.prepare(&query)?;
        let rows = stmt.query_map([date_str], Self::row_to_reminder)?;
        rows.collect()
    }

    pub fn get_planned(&self) -> Result<Vec<Reminder>> {
        let conn = self.conn.lock().unwrap();
        let query = format!("SELECT {REMINDER_FIELDS} FROM reminders WHERE due_date IS NOT NULL AND is_completed = 0 ORDER BY created_at DESC");
        let mut stmt = conn.prepare(&query)?;
        let rows = stmt.query_map([], Self::row_to_reminder)?;
        rows.collect()
    }

    pub fn get_active(&self) -> Result<Vec<Reminder>> {
        let conn = self.conn.lock().unwrap();
        let query = format!("SELECT {REMINDER_FIELDS} FROM reminders WHERE is_completed = 0 ORDER BY created_at DESC");
        let mut stmt = conn.prepare(&query)?;
        let rows = stmt.query_map([], Self::row_to_reminder)?;
        rows.collect()
    }

    pub fn get_completed(&self) -> Result<Vec<Reminder>> {
        let conn = self.conn.lock().unwrap();
        let query = format!("SELECT {REMINDER_FIELDS} FROM reminders WHERE is_completed = 1 ORDER BY created_at DESC");
        let mut stmt = conn.prepare(&query)?;
        let rows = stmt.query_map([], Self::row_to_reminder)?;
        rows.collect()
    }

    pub fn get_overdue(&self) -> Result<Vec<Reminder>> {
        let today = Local::now().date_naive();
        let conn = self.conn.lock().unwrap();
        let date_str = today.format("%Y-%m-%d").to_string();
        let query = format!("SELECT {REMINDER_FIELDS} FROM reminders WHERE due_date < ? AND is_completed = 0 ORDER BY created_at DESC");
        let mut stmt = conn.prepare(&query)?;
        let rows = stmt.query_map([date_str], Self::row_to_reminder)?;
        rows.collect()
    }

    pub fn get_urgent(&self) -> Result<Vec<Reminder>> {
        let conn = self.conn.lock().unwrap();
        let query = format!("SELECT {REMINDER_FIELDS} FROM reminders WHERE priority = 'high' AND is_completed = 0 ORDER BY created_at DESC");
        let mut stmt = conn.prepare(&query)?;
        let rows = stmt.query_map([], Self::row_to_reminder)?;
        rows.collect()
    }

    pub fn get_flagged(&self) -> Result<Vec<Reminder>> {
        let conn = self.conn.lock().unwrap();
        let query = format!("SELECT {REMINDER_FIELDS} FROM reminders WHERE priority IN ('high', 'medium') AND is_completed = 0 ORDER BY created_at DESC");
        let mut stmt = conn.prepare(&query)?;
        let rows = stmt.query_map([], Self::row_to_reminder)?;
        rows.collect()
    }

    pub fn search(&self, query: &str) -> Result<Vec<Reminder>> {
        let conn = self.conn.lock().unwrap();
        let like_query = format!("%{}%", query);
        let query_sql = format!("SELECT {REMINDER_FIELDS} FROM reminders WHERE title LIKE ? OR description LIKE ? OR url LIKE ? ORDER BY created_at DESC");
        let mut stmt = conn.prepare(&query_sql)?;
        let rows = stmt.query_map([&like_query, &like_query, &like_query], Self::row_to_reminder)?;
        rows.collect()
    }

    pub fn insert(&self, reminder: &Reminder) -> Result<()> {
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

    pub fn update(&self, reminder: &Reminder) -> Result<()> {
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

    pub fn delete(&self, id: &Uuid) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM reminders WHERE id = ?", [id.to_string()])?;
        Ok(())
    }

    fn row_to_reminder(row: &Row) -> Result<Reminder> {
        let id_str: String = row.get("id")?;
        let id = Uuid::parse_str(&id_str).map_err(|e| rusqlite::Error::InvalidParameterName(e.to_string()))?;

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