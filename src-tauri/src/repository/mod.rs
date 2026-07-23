pub mod list;
pub mod owner;
pub mod reminder;

use std::sync::{Arc, Mutex, MutexGuard};

use rusqlite::{Connection, Result};

/// 获取数据库连接锁；poison 时返回可传播的 rusqlite 错误，避免线程 panic
pub(crate) fn lock_conn(conn: &Arc<Mutex<Connection>>) -> Result<MutexGuard<'_, Connection>> {
    conn.lock().map_err(|e| {
        rusqlite::Error::InvalidParameterName(format!("database mutex poisoned: {e}"))
    })
}
