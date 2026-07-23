use tauri::{command, State};

use crate::database::connection::Database;

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
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
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
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}
