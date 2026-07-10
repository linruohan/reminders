use crate::models::reminder::ReminderList;
use rusqlite::{params, Connection, OptionalExtension, Result, Row};
use uuid::Uuid;

pub struct ListRepository<'a> {
    conn: &'a Connection,
}

impl<'a> ListRepository<'a> {
    pub fn new(conn: &'a Connection) -> Self {
        Self { conn }
    }

    pub fn get_all(&self) -> Result<Vec<ReminderList>> {
        let mut stmt = self
            .conn
            .prepare("SELECT * FROM reminder_lists ORDER BY name")?;
        let lists = stmt.query_map([], Self::row_to_list)?.collect();
        lists
    }

    pub fn get_by_id(&self, id: &Uuid) -> Result<Option<ReminderList>> {
        let mut stmt = self
            .conn
            .prepare("SELECT * FROM reminder_lists WHERE id = ?")?;
        let id_str = id.to_string();
        stmt.query_row([id_str], Self::row_to_list).optional()
    }

    pub fn get_by_name(&self, name: &str) -> Result<Option<ReminderList>> {
        let mut stmt = self
            .conn
            .prepare("SELECT * FROM reminder_lists WHERE name = ?")?;
        stmt.query_row([name], Self::row_to_list).optional()
    }

    pub fn insert(&self, list: &ReminderList) -> Result<()> {
        self.conn.execute(
            "INSERT INTO reminder_lists (id, name, color, icon) VALUES (?, ?, ?, ?)",
            params![list.id.to_string(), list.name, list.color, list.icon,],
        )?;
        Ok(())
    }

    pub fn update(&self, list: &ReminderList) -> Result<()> {
        self.conn.execute(
            "UPDATE reminder_lists SET name = ?, color = ?, icon = ? WHERE id = ?",
            params![list.name, list.color, list.icon, list.id.to_string(),],
        )?;
        Ok(())
    }

    pub fn delete(&self, id: &Uuid) -> Result<()> {
        self.conn
            .execute("DELETE FROM reminder_lists WHERE id = ?", [id.to_string()])?;
        Ok(())
    }

    fn row_to_list(row: &Row) -> Result<ReminderList> {
        let id_str: String = row.get(0)?;
        let id = Uuid::parse_str(&id_str).unwrap_or(Uuid::new_v4());

        Ok(ReminderList {
            id,
            name: row.get(1)?,
            color: row.get(2)?,
            icon: row.get(3)?,
        })
    }
}
