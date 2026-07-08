use crate::models::owner::Owner;
use rusqlite::{params, Connection, OptionalExtension, Result, Row};
use uuid::Uuid;

pub struct OwnerRepository<'a> {
    conn: &'a Connection,
}

impl<'a> OwnerRepository<'a> {
    pub fn new(conn: &'a Connection) -> Self {
        Self { conn }
    }

    pub fn get_all(&self) -> Result<Vec<Owner>> {
        let mut stmt = self
            .conn
            .prepare("SELECT id, name, color FROM owners ORDER BY name")?;
        let owners = stmt.query_map([], Self::row_to_owner)?.collect();
        owners
    }

    pub fn get_by_id(&self, id: &Uuid) -> Result<Option<Owner>> {
        let mut stmt = self
            .conn
            .prepare("SELECT id, name, color FROM owners WHERE id = ?")?;
        stmt.query_row([id.to_string()], Self::row_to_owner)
            .optional()
    }

    pub fn insert(&self, owner: &Owner) -> Result<()> {
        self.conn.execute(
            "INSERT INTO owners (id, name, color) VALUES (?, ?, ?)",
            params![owner.id.to_string(), owner.name, owner.color],
        )?;
        Ok(())
    }

    pub fn update(&self, owner: &Owner) -> Result<()> {
        self.conn.execute(
            "UPDATE owners SET name = ?, color = ? WHERE id = ?",
            params![owner.name, owner.color, owner.id.to_string()],
        )?;
        Ok(())
    }

    pub fn delete(&self, id: &Uuid) -> Result<()> {
        self.conn.execute(
            "UPDATE reminders SET owner_id = NULL WHERE owner_id = ?",
            [id.to_string()],
        )?;
        self.conn
            .execute("DELETE FROM owners WHERE id = ?", [id.to_string()])?;
        Ok(())
    }

    fn row_to_owner(row: &Row) -> Result<Owner> {
        let id_str: String = row.get(0)?;
        let id = Uuid::parse_str(&id_str).unwrap_or_else(|_| Uuid::new_v4());

        Ok(Owner {
            id,
            name: row.get(1)?,
            color: row.get(2)?,
        })
    }
}
