use std::sync::{Arc, Mutex};

use chrono::{Local, NaiveDate, NaiveTime};
use rusqlite::{params, Connection, OptionalExtension, Result, Row};
use uuid::Uuid;

use crate::models::reminder::{Priority, Reminder};
use super::lock_conn;

const REMINDER_FIELDS: &str = "id, title, description, created_date, created_time, end_date, end_time, is_all_day, is_completed, is_flagged, priority, list_id, created_at, updated_at, url, completion_date, recurrence_frequency, recurrence_interval, custom_recurrence_unit, recurrence_end_date, remind_before_value, remind_before_unit, owner_id, parent_id";

pub struct ReminderRepository {
    conn: Arc<Mutex<Connection>>,
}

impl ReminderRepository {
    pub fn new(conn: Arc<Mutex<Connection>>) -> Self {
        Self { conn }
    }

    pub fn get_all(&self) -> Result<Vec<Reminder>> {
        let conn = lock_conn(&self.conn)?;
        let query = format!("SELECT {REMINDER_FIELDS} FROM reminders ORDER BY created_at DESC");
        let mut stmt = conn.prepare(&query)?;
        let rows = stmt.query_map([], Self::row_to_reminder)?;
        rows.collect()
    }

    pub fn get_by_id(&self, id: &Uuid) -> Result<Option<Reminder>> {
        let conn = lock_conn(&self.conn)?;
        let query = format!("SELECT {REMINDER_FIELDS} FROM reminders WHERE id = ?");
        let mut stmt = conn.prepare(&query)?;
        stmt.query_row([id.to_string()], Self::row_to_reminder)
            .optional()
    }

    pub fn get_by_list_id(&self, list_id: &Uuid) -> Result<Vec<Reminder>> {
        let conn = lock_conn(&self.conn)?;
        let query = format!("SELECT {REMINDER_FIELDS} FROM reminders WHERE list_id = ? ORDER BY created_at DESC");
        let mut stmt = conn.prepare(&query)?;
        let rows = stmt.query_map([list_id.to_string()], Self::row_to_reminder)?;
        rows.collect()
    }

    pub fn get_today(&self) -> Result<Vec<Reminder>> {
        let today = Local::now().date_naive();
        let conn = lock_conn(&self.conn)?;
        let date_str = today.format("%Y-%m-%d").to_string();
        // 今天：逾期未完成 + 截止日期为今天的未完成（无截止日期不纳入）
        let query = format!(
            "SELECT {REMINDER_FIELDS} FROM reminders WHERE end_date IS NOT NULL AND end_date <= ? AND is_completed = 0 ORDER BY end_date ASC, created_at DESC"
        );
        let mut stmt = conn.prepare(&query)?;
        let rows = stmt.query_map([date_str], Self::row_to_reminder)?;
        rows.collect()
    }

    pub fn get_planned(&self) -> Result<Vec<Reminder>> {
        let today = Local::now().date_naive();
        let conn = lock_conn(&self.conn)?;
        let date_str = today.format("%Y-%m-%d").to_string();
        let query = format!(
            "SELECT {REMINDER_FIELDS} FROM reminders WHERE end_date IS NOT NULL AND end_date > ? AND is_completed = 0 ORDER BY end_date ASC, end_time IS NULL, end_time ASC, created_at DESC"
        );
        let mut stmt = conn.prepare(&query)?;
        let rows = stmt.query_map([date_str], Self::row_to_reminder)?;
        rows.collect()
    }

    pub fn get_active(&self) -> Result<Vec<Reminder>> {
        let conn = lock_conn(&self.conn)?;
        let query = format!("SELECT {REMINDER_FIELDS} FROM reminders WHERE is_completed = 0 ORDER BY created_at DESC");
        let mut stmt = conn.prepare(&query)?;
        let rows = stmt.query_map([], Self::row_to_reminder)?;
        rows.collect()
    }

    pub fn get_completed(&self) -> Result<Vec<Reminder>> {
        let conn = lock_conn(&self.conn)?;
        let query = format!("SELECT {REMINDER_FIELDS} FROM reminders WHERE is_completed = 1 ORDER BY created_at DESC");
        let mut stmt = conn.prepare(&query)?;
        let rows = stmt.query_map([], Self::row_to_reminder)?;
        rows.collect()
    }

    pub fn get_urgent(&self) -> Result<Vec<Reminder>> {
        let conn = lock_conn(&self.conn)?;
        let query = format!("SELECT {REMINDER_FIELDS} FROM reminders WHERE priority = 'high' AND is_completed = 0 ORDER BY created_at DESC");
        let mut stmt = conn.prepare(&query)?;
        let rows = stmt.query_map([], Self::row_to_reminder)?;
        rows.collect()
    }

    pub fn get_flagged(&self) -> Result<Vec<Reminder>> {
        let conn = lock_conn(&self.conn)?;
        let query = format!("SELECT {REMINDER_FIELDS} FROM reminders WHERE is_flagged = 1 AND is_completed = 0 ORDER BY created_at DESC");
        let mut stmt = conn.prepare(&query)?;
        let rows = stmt.query_map([], Self::row_to_reminder)?;
        rows.collect()
    }

    pub fn get_by_owner_id(&self, owner_id: &Uuid) -> Result<Vec<Reminder>> {
        let conn = lock_conn(&self.conn)?;
        let query = format!(
            "SELECT {REMINDER_FIELDS} FROM reminders WHERE owner_id = ? AND is_completed = 0 ORDER BY created_at DESC"
        );
        let mut stmt = conn.prepare(&query)?;
        let rows = stmt.query_map([owner_id.to_string()], Self::row_to_reminder)?;
        rows.collect()
    }

    /// 按截止日期闭区间查询（含已完成，供日历渲染）
    pub fn get_by_date_range(&self, start: &str, end: &str) -> Result<Vec<Reminder>> {
        let conn = lock_conn(&self.conn)?;
        let query = format!(
            "SELECT {REMINDER_FIELDS} FROM reminders \
             WHERE end_date IS NOT NULL AND end_date >= ?1 AND end_date <= ?2 \
             ORDER BY end_date ASC, end_time ASC, created_at DESC"
        );
        let mut stmt = conn.prepare(&query)?;
        let rows = stmt.query_map(params![start, end], Self::row_to_reminder)?;
        rows.collect()
    }

    pub fn get_by_tag_name(&self, tag_name: &str) -> Result<Vec<Reminder>> {
        let conn = lock_conn(&self.conn)?;
        let query = format!(
            "SELECT {REMINDER_FIELDS} FROM reminders WHERE id IN ( \
               SELECT rt.reminder_id FROM reminder_tags rt \
               INNER JOIN tags t ON rt.tag_id = t.id \
               WHERE t.name = ?1 \
             ) AND is_completed = 0 ORDER BY created_at DESC"
        );
        let mut stmt = conn.prepare(&query)?;
        let rows = stmt.query_map([tag_name], Self::row_to_reminder)?;
        rows.collect()
    }

    pub fn search(&self, query: &str) -> Result<Vec<Reminder>> {
        let conn = lock_conn(&self.conn)?;
        let like_query = format!("%{}%", query);

        if let Some(fts_q) = crate::database::fts::build_match_query(query) {
            let query_sql = format!(
                "SELECT {REMINDER_FIELDS} FROM reminders WHERE id IN ( \
                   SELECT reminder_id FROM reminders_fts WHERE reminders_fts MATCH ?1 \
                 ) OR id IN ( \
                   SELECT r.id FROM reminders r \
                   LEFT JOIN reminder_tags rt ON r.id = rt.reminder_id \
                   LEFT JOIN tags t ON rt.tag_id = t.id \
                   WHERE r.title LIKE ?2 OR IFNULL(r.description,'') LIKE ?2 OR IFNULL(r.url,'') LIKE ?2 OR IFNULL(t.name,'') LIKE ?2 \
                 ) ORDER BY created_at DESC"
            );
            if let Ok(mut stmt) = conn.prepare(&query_sql) {
                if let Ok(rows) = stmt.query_map(params![fts_q, like_query], Self::row_to_reminder) {
                    return rows.collect();
                }
            }
        }

        let query_sql = format!(
            "SELECT {REMINDER_FIELDS} FROM reminders WHERE id IN ( \
               SELECT r.id FROM reminders r \
               LEFT JOIN reminder_tags rt ON r.id = rt.reminder_id \
               LEFT JOIN tags t ON rt.tag_id = t.id \
               WHERE r.title LIKE ?1 OR IFNULL(r.description,'') LIKE ?1 OR IFNULL(r.url,'') LIKE ?1 OR IFNULL(t.name,'') LIKE ?1 \
             ) ORDER BY created_at DESC"
        );
        let mut stmt = conn.prepare(&query_sql)?;
        let rows = stmt.query_map([&like_query], Self::row_to_reminder)?;
        rows.collect()
    }

    /// Update a reminder row on an existing connection / transaction (no lock).
    pub fn update_on_conn(conn: &Connection, reminder: &Reminder) -> Result<()> {
        let now = Local::now();
        conn.execute(
            "UPDATE reminders SET title = ?1, description = ?2, created_date = ?3, created_time = ?4, end_date = ?5, end_time = ?6, is_all_day = ?7, is_completed = ?8, is_flagged = ?9, priority = ?10, list_id = ?11, updated_at = ?12, url = ?13, completion_date = ?14, recurrence_frequency = ?15, recurrence_interval = ?16, custom_recurrence_unit = ?17, recurrence_end_date = ?18, remind_before_value = ?19, remind_before_unit = ?20, owner_id = ?21, parent_id = ?22 WHERE id = ?23",
            params![
                reminder.title,
                reminder.description,
                reminder.created_date.map(|d| d.format("%Y-%m-%d").to_string()),
                reminder.created_time.map(|t| t.format("%H:%M:%S").to_string()),
                reminder.end_date.map(|d| d.format("%Y-%m-%d").to_string()),
                reminder.end_time.map(|t| t.format("%H:%M:%S").to_string()),
                reminder.is_all_day as i32,
                reminder.is_completed as i32,
                reminder.is_flagged as i32,
                Self::priority_to_str(&reminder.priority),
                reminder.list_id.map(|id| id.to_string()),
                now.to_rfc3339(),
                reminder.url,
                reminder.completion_date.map(|d| d.to_rfc3339()),
                reminder.recurrence_frequency,
                reminder.recurrence_interval,
                reminder.custom_recurrence_unit,
                reminder.recurrence_end_date.map(|d| d.format("%Y-%m-%d").to_string()),
                reminder.remind_before_value,
                reminder.remind_before_unit,
                reminder.owner_id.map(|id| id.to_string()),
                reminder.parent_id.map(|id| id.to_string()),
                reminder.id.to_string(),
            ],
        )?;
        let _ = crate::database::fts::upsert_reminder(conn, &reminder.id.to_string());
        Ok(())
    }

    pub fn update(&self, reminder: &Reminder) -> Result<()> {
        let conn = lock_conn(&self.conn)?;
        Self::update_on_conn(&conn, reminder)
    }

    pub fn delete(&self, id: &Uuid) -> Result<()> {
        let conn = lock_conn(&self.conn)?;
        let id_str = id.to_string();
        let _ = crate::database::fts::delete_reminder(&conn, &id_str);
        conn.execute("DELETE FROM reminders WHERE id = ?", [id_str])?;
        Ok(())
    }

    fn row_to_reminder(row: &Row) -> Result<Reminder> {
        let id_str: String = row.get("id")?;
        let id = Uuid::parse_str(&id_str).map_err(|e| rusqlite::Error::InvalidParameterName(e.to_string()))?;

        let created_date_str: Option<String> = row.get("created_date")?;
        let created_date = created_date_str
            .as_deref()
            .and_then(|s| NaiveDate::parse_from_str(s, "%Y-%m-%d").ok());

        let created_time_str: Option<String> = row.get("created_time")?;
        let created_time = created_time_str
            .as_deref()
            .and_then(|s| NaiveTime::parse_from_str(s, "%H:%M:%S").ok());

        let end_date_str: Option<String> = row.get("end_date").unwrap_or(None);
        let end_date = end_date_str
            .as_deref()
            .and_then(|s| NaiveDate::parse_from_str(s, "%Y-%m-%d").ok());

        let end_time_str: Option<String> = row.get("end_time").unwrap_or(None);
        let end_time = end_time_str
            .as_deref()
            .and_then(|s| NaiveTime::parse_from_str(s, "%H:%M:%S").ok());

        let is_completed: i32 = row.get("is_completed")?;
        let is_flagged: i32 = row.get("is_flagged").unwrap_or(0);
        let priority_str: String = row.get("priority")?;
        let list_id_str: Option<String> = row.get("list_id")?;
        let list_id = list_id_str.as_deref().and_then(|s| Uuid::parse_str(s).ok());
        let owner_id_str: Option<String> = row.get("owner_id").unwrap_or(None);
        let owner_id = owner_id_str.as_deref().and_then(|s| Uuid::parse_str(s).ok());
        let parent_id_str: Option<String> = row.get("parent_id").unwrap_or(None);
        let parent_id = parent_id_str.as_deref().and_then(|s| Uuid::parse_str(s).ok());

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

        let recurrence_end_date_str: Option<String> = row.get("recurrence_end_date").unwrap_or(None);
        let recurrence_end_date = recurrence_end_date_str
            .as_deref()
            .and_then(|s| NaiveDate::parse_from_str(s, "%Y-%m-%d").ok());

        Ok(Reminder {
            id,
            title: row.get("title")?,
            description: row.get("description")?,
            url,
            created_date,
            created_time,
            end_date,
            end_time,
            is_all_day: is_all_day != 0,
            is_completed: is_completed != 0,
            completion_date,
            priority: Self::str_to_priority(&priority_str),
            is_flagged: is_flagged != 0,
            recurrence_frequency: row.get("recurrence_frequency").unwrap_or(None),
            recurrence_interval: row.get("recurrence_interval").unwrap_or(None),
            custom_recurrence_unit: row.get("custom_recurrence_unit").unwrap_or(None),
            recurrence_end_date,
            remind_before_value: row.get("remind_before_value").unwrap_or(None),
            remind_before_unit: row.get("remind_before_unit").unwrap_or(None),
            owner_id,
            list_id,
            parent_id,
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