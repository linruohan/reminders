use tauri::{command, State};

use crate::database::connection::Database;

use super::dto::TagResponse;
use super::helpers::get_conn;

#[command]
pub fn get_all_tags(db: State<'_, Database>) -> Result<Vec<TagResponse>, String> {
    let conn = get_conn(&db);
    let conn = conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, name FROM tags ORDER BY name")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(TagResponse {
                id: row.get(0)?,
                name: row.get(1)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

#[command]
pub fn rename_tag(
    db: State<'_, Database>,
    id: String,
    name: String,
) -> Result<TagResponse, String> {
    let new_name = name.trim().to_string();
    if new_name.is_empty() {
        return Err("标签名不能为空".to_string());
    }

    let conn = get_conn(&db);
    let conn = conn.lock().map_err(|e| e.to_string())?;

    let exists: bool = conn
        .query_row(
            "SELECT 1 FROM tags WHERE name = ? AND id != ? LIMIT 1",
            rusqlite::params![new_name, id],
            |_| Ok(true),
        )
        .unwrap_or(false);
    if exists {
        return Err("标签名已存在".to_string());
    }

    let updated = conn
        .execute(
            "UPDATE tags SET name = ? WHERE id = ?",
            rusqlite::params![new_name, id],
        )
        .map_err(|e| e.to_string())?;
    if updated == 0 {
        return Err("标签不存在".to_string());
    }

    Ok(TagResponse {
        id,
        name: new_name,
    })
}

#[command]
pub fn delete_tag(db: State<'_, Database>, id: String) -> Result<(), String> {
    let conn = get_conn(&db);
    let conn = conn.lock().map_err(|e| e.to_string())?;

    let deleted = conn
        .execute("DELETE FROM tags WHERE id = ?", [&id])
        .map_err(|e| e.to_string())?;
    if deleted == 0 {
        return Err("标签不存在".to_string());
    }

    Ok(())
}
