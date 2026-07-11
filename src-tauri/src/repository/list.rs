use std::sync::{Arc, Mutex};

use rusqlite::{params, Connection, Result, Row};
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