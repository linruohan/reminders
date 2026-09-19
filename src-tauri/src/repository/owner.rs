use std::sync::{Arc, Mutex};

use rusqlite::{Connection, OptionalExtension, Result, Row, params};
use uuid::Uuid;

use super::lock_conn;
use crate::models::owner::Owner;

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

    /// 按名称查找责任人；不存在时在同一事务内插入。
    /// 依赖 owners(name) 唯一索引，保证并发/重复请求也只产生一条记录。
    pub fn find_or_create(&self, owner: &Owner) -> Result<Owner> {
        let mut conn = lock_conn(&self.conn)?;
        let tx = conn.transaction()?;
        if let Some(existing) = tx
            .query_row(
                "SELECT id, name, color FROM owners WHERE name = ?1",
                params![owner.name],
                Self::row_to_owner,
            )
            .optional()?
        {
            return Ok(existing);
        }
        tx.execute(
            "INSERT INTO owners (id, name, color) VALUES (?, ?, ?)",
            params![owner.id.to_string(), owner.name, owner.color],
        )?;
        tx.commit()?;
        Ok(owner.clone())
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
        let id = Uuid::parse_str(&id_str)
            .map_err(|e| rusqlite::Error::InvalidParameterName(e.to_string()))?;

        Ok(Owner {
            id,
            name: row.get("name")?,
            color: row.get("color")?,
        })
    }
}
