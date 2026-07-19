use rusqlite::{Connection, Result};
use std::path::Path;
use std::sync::{Arc, Mutex};

use super::schema;

pub struct Database {
    conn: Arc<Mutex<Connection>>,
}

impl Database {
    pub fn open(db_path: &Path) -> Result<Self> {
        let conn = Connection::open(db_path)?;
        conn.execute("PRAGMA foreign_keys = ON", [])?;
        // 启用 WAL 模式：允许并发读取，提升多连接场景下的性能
        // PRAGMA journal_mode 会返回结果，需要用 query_row
        let _: String = conn.query_row("PRAGMA journal_mode = WAL", [], |row| row.get(0))?;
        conn.execute("PRAGMA synchronous = NORMAL", [])?;
        schema::init_schema(&conn)?;
        schema::insert_initial_data(&conn)?;
        Ok(Self {
            conn: Arc::new(Mutex::new(conn)),
        })
    }

    pub fn conn(&self) -> Arc<Mutex<Connection>> {
        self.conn.clone()
    }
}

impl Clone for Database {
    fn clone(&self) -> Self {
        Self {
            conn: self.conn.clone(),
        }
    }
}

unsafe impl Send for Database {}
unsafe impl Sync for Database {}
