use tauri::{command, State};

use crate::database::connection::Database;
use crate::database::fts;

use super::dto::TagResponse;
use super::helpers::{get_conn, get_reminder_tags_internal};

#[command]
pub fn get_reminder_tags(
    db: State<'_, Database>,
    reminder_id: String,
) -> Result<Vec<TagResponse>, String> {
    get_reminder_tags_internal(get_conn(&db), &reminder_id)
}

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
pub fn search_tags(db: State<'_, Database>, query: String) -> Result<Vec<TagResponse>, String> {
    let conn = get_conn(&db);
    let conn = conn.lock().map_err(|e| e.to_string())?;
    let like = format!("%{query}%");
    let mut stmt = conn
        .prepare("SELECT id, name FROM tags WHERE name LIKE ? ORDER BY name LIMIT 20")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([like], |row| {
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

    // 同步 FTS 中受影响提醒的标签文本
    let mut stmt = conn
        .prepare("SELECT reminder_id FROM reminder_tags WHERE tag_id = ?")
        .map_err(|e| e.to_string())?;
    let reminder_ids: Vec<String> = stmt
        .query_map([&id], |row| row.get(0))
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    for reminder_id in reminder_ids {
        fts::upsert_reminder(&conn, &reminder_id).map_err(|e| e.to_string())?;
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

    let mut stmt = conn
        .prepare("SELECT reminder_id FROM reminder_tags WHERE tag_id = ?")
        .map_err(|e| e.to_string())?;
    let reminder_ids: Vec<String> = stmt
        .query_map([&id], |row| row.get(0))
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    let deleted = conn
        .execute("DELETE FROM tags WHERE id = ?", [&id])
        .map_err(|e| e.to_string())?;
    if deleted == 0 {
        return Err("标签不存在".to_string());
    }

    // reminder_tags 经 ON DELETE CASCADE 清除后，刷新 FTS
    for reminder_id in reminder_ids {
        fts::upsert_reminder(&conn, &reminder_id).map_err(|e| e.to_string())?;
    }

    Ok(())
}
