use crate::models::reminder::{Priority, Reminder};
use chrono::{Local, NaiveDate, NaiveTime};
use rusqlite::{params, Connection, OptionalExtension, Result, Row};
use uuid::Uuid;

pub struct ReminderRepository<'a> {
    conn: &'a Connection,
}

impl<'a> ReminderRepository<'a> {
    pub fn new(conn: &'a Connection) -> Self {
        Self { conn }
    }

    pub fn get_all(&self) -> Result<Vec<Reminder>> {
        let mut stmt = self
            .conn
            .prepare("SELECT * FROM reminders ORDER BY created_at DESC")?;
        let reminders = stmt
            .query_map([], Self::row_to_reminder)?
            .collect();
        reminders
    }

    pub fn get_by_id(&self, id: &Uuid) -> Result<Option<Reminder>> {
        let mut stmt = self.conn.prepare("SELECT * FROM reminders WHERE id = ?")?;
        let id_str = id.to_string();
        stmt.query_row([id_str], Self::row_to_reminder)
            .optional()
    }

    pub fn get_by_list_id(&self, list_id: &Uuid) -> Result<Vec<Reminder>> {
        let mut stmt = self
            .conn
            .prepare("SELECT * FROM reminders WHERE list_id = ? ORDER BY created_at DESC")?;
        let list_id_str = list_id.to_string();
        let reminders = stmt
            .query_map([list_id_str], Self::row_to_reminder)?
            .collect();
        reminders
    }

    pub fn get_by_date(&self, date: &NaiveDate) -> Result<Vec<Reminder>> {
        let mut stmt = self.conn.prepare("SELECT * FROM reminders WHERE due_date = ? AND is_completed = 0 ORDER BY created_at DESC")?;
        let date_str = date.format("%Y-%m-%d").to_string();
        let reminders = stmt
            .query_map([date_str], Self::row_to_reminder)?
            .collect();
        reminders
    }

    pub fn get_today(&self) -> Result<Vec<Reminder>> {
        let today = Local::now().date_naive();
        let mut stmt = self.conn.prepare("SELECT * FROM reminders WHERE due_date = ? AND is_completed = 0 ORDER BY created_at DESC")?;
        let date_str = today.format("%Y-%m-%d").to_string();
        let reminders = stmt
            .query_map([date_str], Self::row_to_reminder)?
            .collect();
        reminders
    }

    pub fn get_planned(&self) -> Result<Vec<Reminder>> {
        let mut stmt = self.conn.prepare("SELECT * FROM reminders WHERE due_date IS NOT NULL AND is_completed = 0 ORDER BY created_at DESC")?;
        let reminders = stmt
            .query_map([], Self::row_to_reminder)?
            .collect();
        reminders
    }

    pub fn get_active(&self) -> Result<Vec<Reminder>> {
        let mut stmt = self
            .conn
            .prepare("SELECT * FROM reminders WHERE is_completed = 0 ORDER BY created_at DESC")?;
        let reminders = stmt
            .query_map([], Self::row_to_reminder)?
            .collect();
        reminders
    }

    pub fn has_reminder_on_date(&self, date: &NaiveDate) -> Result<bool> {
        let date_str = date.format("%Y-%m-%d").to_string();
        let count: i64 = self.conn.query_row(
            "SELECT COUNT(*) FROM reminders WHERE due_date = ? AND is_completed = 0",
            [date_str],
            |row| row.get(0),
        )?;
        Ok(count > 0)
    }

    pub fn insert(&self, reminder: &Reminder) -> Result<()> {
        self.conn.execute(
            "INSERT INTO reminders (id, title, description, due_date, due_time, is_completed, priority, list_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
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
            ],
        )?;
        Ok(())
    }

    pub fn update(&self, reminder: &Reminder) -> Result<()> {
        let now = Local::now();
        self.conn.execute(
            "UPDATE reminders SET title = ?, description = ?, due_date = ?, due_time = ?, is_completed = ?, priority = ?, list_id = ?, updated_at = ? WHERE id = ?",
            params![
                reminder.title,
                reminder.description,
                reminder.due_date.map(|d| d.format("%Y-%m-%d").to_string()),
                reminder.due_time.map(|t| t.format("%H:%M:%S").to_string()),
                reminder.is_completed as i32,
                Self::priority_to_str(&reminder.priority),
                reminder.list_id.map(|id| id.to_string()),
                now.to_rfc3339(),
                reminder.id.to_string(),
            ],
        )?;
        Ok(())
    }

    pub fn delete(&self, id: &Uuid) -> Result<()> {
        self.conn
            .execute("DELETE FROM reminders WHERE id = ?", [id.to_string()])?;
        Ok(())
    }

    fn row_to_reminder(row: &Row) -> Result<Reminder> {
        let id_str: String = row.get(0)?;
        let id = Uuid::parse_str(&id_str).unwrap_or(Uuid::new_v4());

        let due_date_str: Option<String> = row.get(3)?;
        let due_date = due_date_str
            .as_deref()
            .and_then(|s| NaiveDate::parse_from_str(s, "%Y-%m-%d").ok());

        let due_time_str: Option<String> = row.get(4)?;
        let due_time = due_time_str
            .as_deref()
            .and_then(|s| NaiveTime::parse_from_str(s, "%H:%M:%S").ok());

        let is_completed: i32 = row.get(5)?;

        let priority_str: String = row.get(6)?;
        let priority = Self::str_to_priority(&priority_str);

        let list_id_str: Option<String> = row.get(7)?;
        let list_id = list_id_str.as_deref().and_then(|s| Uuid::parse_str(s).ok());

        let created_at_str: String = row.get(8)?;
        let created_at = chrono::DateTime::parse_from_rfc3339(&created_at_str)
            .unwrap_or_else(|_| Local::now().into())
            .with_timezone(&Local);

        let updated_at_str: String = row.get(9)?;
        let updated_at = chrono::DateTime::parse_from_rfc3339(&updated_at_str)
            .unwrap_or_else(|_| Local::now().into())
            .with_timezone(&Local);

        Ok(Reminder {
            id,
            title: row.get(1)?,
            description: row.get(2)?,
            due_date,
            due_time,
            is_completed: is_completed != 0,
            priority,
            list_id,
            created_at,
            updated_at,
        })
    }

    fn priority_to_str(priority: &Priority) -> &str {
        match priority {
            Priority::High => "high",
            Priority::Medium => "medium",
            Priority::Low => "low",
        }
    }

    fn str_to_priority(s: &str) -> Priority {
        match s {
            "high" => Priority::High,
            "low" => Priority::Low,
            _ => Priority::Medium,
        }
    }
}
