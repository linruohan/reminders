use std::sync::{Arc, Mutex};

use chrono::Local;
use rusqlite::{params, Connection, Result};
use uuid::Uuid;

use crate::models::subtask::Subtask;
use super::lock_conn;

pub struct SubtaskRepository {
    conn: Arc<Mutex<Connection>>,
}

impl SubtaskRepository {
    pub fn new(conn: Arc<Mutex<Connection>>) -> Self {
        Self { conn }
    }

    pub fn create(&self, reminder_id: &Uuid, title: &str) -> Result<Subtask> {
        let conn = lock_conn(&self.conn)?;
        let id = Uuid::new_v4();
        let now = Local::now().to_rfc3339();
        let next_order: i32 = conn
            .query_row(
                "SELECT COALESCE(MAX(sort_order), -1) + 1 FROM subtasks WHERE reminder_id = ?",
                [reminder_id.to_string()],
                |row| row.get(0),
            )
            .unwrap_or(0);

        conn.execute(
            "INSERT INTO subtasks (id, reminder_id, title, is_completed, sort_order, created_at, updated_at) \
             VALUES (?1, ?2, ?3, 0, ?4, ?5, ?6)",
            params![
                id.to_string(),
                reminder_id.to_string(),
                title.trim(),
                next_order,
                now,
                now,
            ],
        )?;

        Ok(Subtask {
            id,
            reminder_id: *reminder_id,
            title: title.trim().to_string(),
            is_completed: false,
            sort_order: next_order,
        })
    }

    pub fn update(
        &self,
        id: &Uuid,
        title: Option<&str>,
        is_completed: Option<bool>,
    ) -> Result<Option<Subtask>> {
        let conn = lock_conn(&self.conn)?;
        let existing = match Self::get_by_id_on_conn(&conn, id)? {
            Some(s) => s,
            None => return Ok(None),
        };

        let new_title = title.map(|t| t.trim().to_string()).unwrap_or(existing.title);
        let new_completed = is_completed.unwrap_or(existing.is_completed);
        let now = Local::now().to_rfc3339();

        conn.execute(
            "UPDATE subtasks SET title = ?1, is_completed = ?2, updated_at = ?3 WHERE id = ?4",
            params![new_title, new_completed as i32, now, id.to_string()],
        )?;

        Ok(Some(Subtask {
            id: existing.id,
            reminder_id: existing.reminder_id,
            title: new_title,
            is_completed: new_completed,
            sort_order: existing.sort_order,
        }))
    }

    pub fn delete(&self, id: &Uuid) -> Result<bool> {
        let conn = lock_conn(&self.conn)?;
        let n = conn.execute("DELETE FROM subtasks WHERE id = ?", [id.to_string()])?;
        Ok(n > 0)
    }

    fn get_by_id_on_conn(conn: &Connection, id: &Uuid) -> Result<Option<Subtask>> {
        let mut stmt = conn.prepare(
            "SELECT id, reminder_id, title, is_completed, sort_order FROM subtasks WHERE id = ?",
        )?;
        let mut rows = stmt.query_map([id.to_string()], Self::row_to_subtask)?;
        match rows.next() {
            Some(Ok(s)) => Ok(Some(s)),
            Some(Err(e)) => Err(e),
            None => Ok(None),
        }
    }

    fn row_to_subtask(row: &rusqlite::Row<'_>) -> Result<Subtask> {
        let id = Uuid::parse_str(&row.get::<_, String>(0)?)
            .map_err(|e| rusqlite::Error::InvalidParameterName(e.to_string()))?;
        let reminder_id = Uuid::parse_str(&row.get::<_, String>(1)?)
            .map_err(|e| rusqlite::Error::InvalidParameterName(e.to_string()))?;
        Ok(Subtask {
            id,
            reminder_id,
            title: row.get(2)?,
            is_completed: row.get::<_, i32>(3)? != 0,
            sort_order: row.get(4)?,
        })
    }
}
