use std::sync::{Arc, Mutex};

use chrono::{NaiveDate, NaiveTime};
use rusqlite::Connection;
use tauri::State;
use uuid::Uuid;

use crate::database::connection::Database;
use crate::models::reminder::Reminder;

use super::dto::{ReminderResponse, SubtaskResponse, TagResponse};

pub(crate) fn get_conn(db: &State<'_, Database>) -> Arc<Mutex<Connection>> {
    db.conn()
}

pub(crate) fn parse_date(s: &str) -> Option<NaiveDate> {
    NaiveDate::parse_from_str(s, "%Y-%m-%d").ok()
}

pub(crate) fn parse_time(s: &str) -> Option<NaiveTime> {
    NaiveTime::parse_from_str(s, "%H:%M:%S")
        .or_else(|_| NaiveTime::parse_from_str(s, "%H:%M"))
        .ok()
}

pub(crate) fn parse_uuid(s: &str) -> Result<Uuid, String> {
    Uuid::parse_str(s).map_err(|e| e.to_string())
}

pub(crate) fn parse_optional_uuid(s: &str) -> Option<Uuid> {
    if s.is_empty() {
        None
    } else {
        Uuid::parse_str(s).ok()
    }
}

/// 在已有事务中同步标签（不创建新事务）
pub(crate) fn sync_reminder_tags_in_tx(
    tx: &rusqlite::Transaction,
    reminder_id: &str,
    tag_names: &[String],
) -> Result<(), String> {
    tx.execute(
        "DELETE FROM reminder_tags WHERE reminder_id = ?",
        rusqlite::params![reminder_id],
    )
    .map_err(|e| e.to_string())?;
    for name in tag_names {
        let tag_id = Uuid::new_v4().to_string();
        tx.execute(
            "INSERT OR IGNORE INTO tags (id, name) VALUES (?, ?)",
            rusqlite::params![tag_id, name],
        )
        .map_err(|e| e.to_string())?;
        let existing_id: String = tx
            .query_row(
                "SELECT id FROM tags WHERE name = ?",
                rusqlite::params![name],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?;
        tx.execute(
            "INSERT OR IGNORE INTO reminder_tags (reminder_id, tag_id) VALUES (?, ?)",
            rusqlite::params![reminder_id, existing_id],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

pub(crate) fn get_reminder_tags_internal(
    conn: Arc<Mutex<Connection>>,
    reminder_id: &str,
) -> Result<Vec<TagResponse>, String> {
    let conn = conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT t.id, t.name FROM tags t INNER JOIN reminder_tags rt ON t.id = rt.tag_id WHERE rt.reminder_id = ?",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([reminder_id], |row| {
            Ok(TagResponse {
                id: row.get(0)?,
                name: row.get(1)?,
            })
        })
        .map_err(|e| e.to_string())?;
    Ok(rows.filter_map(|r| r.ok()).collect())
}

pub(crate) fn get_reminder_with_tags(
    reminder: Reminder,
    db: &State<'_, Database>,
) -> Result<ReminderResponse, String> {
    let mut resp: ReminderResponse = reminder.into();
    resp.tags = get_reminder_tags_internal(get_conn(db), &resp.id)?;
    resp.subtasks = get_reminder_subtasks_internal(get_conn(db), &resp.id)?;
    Ok(resp)
}

fn map_subtask_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<SubtaskResponse> {
    Ok(SubtaskResponse {
        id: row.get(0)?,
        reminder_id: row.get(1)?,
        title: row.get(2)?,
        is_completed: row.get::<_, i32>(3)? != 0,
        sort_order: row.get(4)?,
    })
}

pub(crate) fn get_reminder_subtasks_internal(
    conn: Arc<Mutex<Connection>>,
    reminder_id: &str,
) -> Result<Vec<SubtaskResponse>, String> {
    let conn = conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, reminder_id, title, is_completed, sort_order FROM subtasks \
             WHERE reminder_id = ? ORDER BY sort_order ASC, created_at ASC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([reminder_id], map_subtask_row)
        .map_err(|e| e.to_string())?;
    Ok(rows.filter_map(|r| r.ok()).collect())
}

/// 批量获取提醒及其标签、子任务，使用 JOIN 查询避免 N+1
pub(crate) fn map_reminders_with_tags(
    reminders: Vec<Reminder>,
    db: &State<'_, Database>,
) -> Result<Vec<ReminderResponse>, String> {
    if reminders.is_empty() {
        return Ok(Vec::new());
    }

    let conn = get_conn(db);
    let conn_guard = conn.lock().map_err(|e| e.to_string())?;

    let ids: Vec<String> = reminders.iter().map(|r| r.id.to_string()).collect();
    let placeholders: Vec<&str> = ids.iter().map(|_| "?").collect();
    let in_clause = placeholders.join(",");

    let tags_sql = format!(
        "SELECT rt.reminder_id, t.id, t.name FROM reminder_tags rt \
         JOIN tags t ON rt.tag_id = t.id \
         WHERE rt.reminder_id IN ({in_clause})"
    );

    let mut tags_stmt = conn_guard.prepare(&tags_sql).map_err(|e| e.to_string())?;
    let tag_rows = tags_stmt
        .query_map(rusqlite::params_from_iter(ids.iter()), |row| {
            Ok((
                row.get::<_, String>(0)?,
                TagResponse {
                    id: row.get(1)?,
                    name: row.get(2)?,
                },
            ))
        })
        .map_err(|e| e.to_string())?;

    let mut tags_by_reminder: std::collections::HashMap<String, Vec<TagResponse>> =
        std::collections::HashMap::new();
    for row_result in tag_rows {
        if let Ok((reminder_id, tag)) = row_result {
            tags_by_reminder.entry(reminder_id).or_default().push(tag);
        }
    }

    let subtasks_sql = format!(
        "SELECT id, reminder_id, title, is_completed, sort_order FROM subtasks \
         WHERE reminder_id IN ({in_clause}) ORDER BY sort_order ASC, created_at ASC"
    );
    let mut sub_stmt = conn_guard.prepare(&subtasks_sql).map_err(|e| e.to_string())?;
    let sub_rows = sub_stmt
        .query_map(rusqlite::params_from_iter(ids.iter()), map_subtask_row)
        .map_err(|e| e.to_string())?;

    let mut subtasks_by_reminder: std::collections::HashMap<String, Vec<SubtaskResponse>> =
        std::collections::HashMap::new();
    for row_result in sub_rows {
        if let Ok(sub) = row_result {
            subtasks_by_reminder
                .entry(sub.reminder_id.clone())
                .or_default()
                .push(sub);
        }
    }

    Ok(reminders
        .into_iter()
        .map(|r| {
            let mut resp: ReminderResponse = r.into();
            resp.tags = tags_by_reminder.remove(&resp.id).unwrap_or_default();
            resp.subtasks = subtasks_by_reminder.remove(&resp.id).unwrap_or_default();
            resp
        })
        .collect())
}

pub(crate) fn insert_reminder_row(
    tx: &rusqlite::Transaction,
    reminder: &Reminder,
) -> Result<(), String> {
    tx.execute(
        "INSERT INTO reminders (id, title, description, created_date, created_time, end_date, end_time, is_all_day, is_completed, is_flagged, priority, list_id, created_at, updated_at, url, completion_date, recurrence_frequency, recurrence_interval, custom_recurrence_unit, recurrence_end_date, remind_before_value, remind_before_unit, owner_id, parent_id) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23, ?24)",
        rusqlite::params![
            reminder.id.to_string(),
            reminder.title,
            reminder.description,
            reminder.created_date.map(|d| d.format("%Y-%m-%d").to_string()),
            reminder.created_time.map(|t| t.format("%H:%M:%S").to_string()),
            reminder.end_date.map(|d| d.format("%Y-%m-%d").to_string()),
            reminder.end_time.map(|t| t.format("%H:%M:%S").to_string()),
            reminder.is_all_day as i32,
            reminder.is_completed as i32,
            reminder.is_flagged as i32,
            reminder.priority.as_str(),
            reminder.list_id.map(|id| id.to_string()),
            reminder.created_at.to_rfc3339(),
            reminder.updated_at.to_rfc3339(),
            reminder.url,
            reminder.completion_date.map(|d| d.to_rfc3339()),
            reminder.recurrence_frequency,
            reminder.recurrence_interval,
            reminder.custom_recurrence_unit,
            reminder.recurrence_end_date.map(|d| d.format("%Y-%m-%d").to_string()),
            reminder.remind_before_value,
            reminder.remind_before_unit,
            reminder.owner_id.map(|id| id.to_string()),
            reminder.parent_id.map(|id| id.to_string()),
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}
