use tauri::{command, State};
use uuid::Uuid;

use crate::database::connection::Database;
use crate::repository::subtask::SubtaskRepository;

use super::dto::{CreateSubtaskRequest, SubtaskResponse, UpdateSubtaskRequest};
use super::helpers::get_conn;

fn to_response(s: crate::models::subtask::Subtask) -> SubtaskResponse {
    SubtaskResponse {
        id: s.id.to_string(),
        reminder_id: s.reminder_id.to_string(),
        title: s.title,
        is_completed: s.is_completed,
        sort_order: s.sort_order,
    }
}

#[command]
pub fn get_subtasks(
    db: State<'_, Database>,
    reminder_id: String,
) -> Result<Vec<SubtaskResponse>, String> {
    let repo = SubtaskRepository::new(get_conn(&db));
    let id = Uuid::parse_str(&reminder_id).map_err(|e| e.to_string())?;
    repo.list_by_reminder(&id)
        .map(|items| items.into_iter().map(to_response).collect())
        .map_err(|e| e.to_string())
}

#[command]
pub fn create_subtask(
    db: State<'_, Database>,
    request: CreateSubtaskRequest,
) -> Result<SubtaskResponse, String> {
    let title = request.title.trim();
    if title.is_empty() {
        return Err("子任务标题不能为空".to_string());
    }
    let repo = SubtaskRepository::new(get_conn(&db));
    let reminder_id = Uuid::parse_str(&request.reminder_id).map_err(|e| e.to_string())?;
    repo.create(&reminder_id, title)
        .map(to_response)
        .map_err(|e| e.to_string())
}

#[command]
pub fn update_subtask(
    db: State<'_, Database>,
    request: UpdateSubtaskRequest,
) -> Result<SubtaskResponse, String> {
    if let Some(ref title) = request.title {
        if title.trim().is_empty() {
            return Err("子任务标题不能为空".to_string());
        }
    }
    let repo = SubtaskRepository::new(get_conn(&db));
    let id = Uuid::parse_str(&request.id).map_err(|e| e.to_string())?;
    let updated = repo
        .update(
            &id,
            request.title.as_deref(),
            request.is_completed,
        )
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Subtask not found".to_string())?;
    Ok(to_response(updated))
}

#[command]
pub fn delete_subtask(db: State<'_, Database>, id: String) -> Result<(), String> {
    let repo = SubtaskRepository::new(get_conn(&db));
    let id = Uuid::parse_str(&id).map_err(|e| e.to_string())?;
    let ok = repo.delete(&id).map_err(|e| e.to_string())?;
    if !ok {
        return Err("Subtask not found".to_string());
    }
    Ok(())
}
