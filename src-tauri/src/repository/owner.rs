use std::sync::{Arc, Mutex};

use rusqlite::{params, Connection, OptionalExtension, Result, Row};
use uuid::Uuid;

use crate::models::owner::Owner;
use super::lock_conn;

pub struct OwnerRepository {
    conn: Arc<Mutex<Connection>>,
}

impl OwnerRepository {
    pub fn new(conn: Arc<Mutex<Connection>>) -> Self {
        Self { conn }
    }

    pub fn get_all(&self) -> Result<Vec<Owner>> {
        let conn = lock_conn(&self.conn)?;
        let mut stmt = conn.prepare("SELECT id, name, color FROM owners ORDER BY name")?;
        let rows = stmt.query_map([], Self::row_to_owner)?;
        rows.collect()
    }

    pub fn insert(&self, owner: &Owner) -> Result<()> {
        let conn = lock_conn(&self.conn)?;
        conn.execute(
            "INSERT INTO owners (id, name, color) VALUES (?, ?, ?)",
            params![owner.id.to_string(), owner.name, owner.color],
        )?;
        Ok(())
    }

    pub fn delete(&self, id: &Uuid) -> Result<()> {
        let conn = lock_conn(&self.conn)?;
        conn.execute("DELETE FROM owners WHERE id = ?", [id.to_string()])?;
        Ok(())
    }

    pub fn update(&self, owner: &Owner) -> Result<()> {
        let conn = lock_conn(&self.conn)?;
        conn.execute(
            "UPDATE owners SET name = ?, color = ? WHERE id = ?",
            params![owner.name, owner.color, owner.id.to_string()],
        )?;
        Ok(())
    }

    pub fn get_by_id(&self, id: &Uuid) -> Result<Option<Owner>> {
        let conn = lock_conn(&self.conn)?;
        let mut stmt = conn.prepare("SELECT id, name, color FROM owners WHERE id = ?")?;
        stmt.query_row([id.to_string()], Self::row_to_owner)
            .optional()
    }

    fn row_to_owner(row: &Row) -> Result<Owner> {
        let id_str: String = row.get("id")?;
        let id = Uuid::parse_str(&id_str).map_err(|e| rusqlite::Error::InvalidParameterName(e.to_string()))?;

        Ok(Owner {
            id,
            name: row.get("name")?,
            color: row.get("color")?,
        })
    }
}