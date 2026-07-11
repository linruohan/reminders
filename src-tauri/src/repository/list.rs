use std::sync::{Arc, Mutex};

use rusqlite::{params, Connection, OptionalExtension, Result, Row};
use uuid::Uuid;

use crate::models::reminder::ReminderList;

pub struct ListRepository {
    conn: Arc<Mutex<Connection>>,
}

impl ListRepository {
    pub fn new(conn: Arc<Mutex<Connection>>) -> Self {
        Self { conn }
    }

    pub fn get_all(&self) -> Result<Vec<ReminderList>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, name, color, icon FROM reminder_lists ORDER BY name")?;
        let rows = stmt.query_map([], Self::row_to_list)?;
        rows.collect()
    }

    pub fn insert(&self, list: &ReminderList) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO reminder_lists (id, name, color, icon) VALUES (?, ?, ?, ?)",
            params![list.id.to_string(), list.name, list.color, list.icon],
        )?;
        Ok(())
    }

    pub fn delete(&self, id: &Uuid) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM reminder_lists WHERE id = ?", [id.to_string()])?;
        Ok(())
    }

    pub fn update(&self, list: &ReminderList) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE reminder_lists SET name = ?, color = ?, icon = ? WHERE id = ?",
            params![list.name, list.color, list.icon, list.id.to_string()],
        )?;
        Ok(())
    }

    pub fn get_by_id(&self, id: &Uuid) -> Result<Option<ReminderList>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, name, color, icon FROM reminder_lists WHERE id = ?")?;
        stmt.query_row([id.to_string()], Self::row_to_list)
            .optional()
    }

    fn row_to_list(row: &Row) -> Result<ReminderList> {
        let id_str: String = row.get("id")?;
        let id = Uuid::parse_str(&id_str).map_err(|e| rusqlite::Error::InvalidParameterName(e.to_string()))?;

        Ok(ReminderList {
            id,
            name: row.get("name")?,
            color: row.get("color")?,
            icon: row.get("icon")?,
        })
    }
}