use std::sync::{Arc, Mutex};

use rusqlite::{params, Connection, Result, Row};
use uuid::Uuid;

use crate::models::owner::Owner;

pub struct OwnerRepository {
    conn: Arc<Mutex<Connection>>,
}

impl OwnerRepository {
    pub fn new(conn: Arc<Mutex<Connection>>) -> Self {
        Self { conn }
    }

    pub fn get_all(&self) -> Result<Vec<Owner>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, name, color FROM owners ORDER BY name")?;
        let rows = stmt.query_map([], Self::row_to_owner)?;
        rows.collect()
    }

    pub fn insert(&self, owner: &Owner) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO owners (id, name, color) VALUES (?, ?, ?)",
            params![owner.id.to_string(), owner.name, owner.color],
        )?;
        Ok(())
    }

    pub fn delete(&self, id: &Uuid) -> Result<()> {
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