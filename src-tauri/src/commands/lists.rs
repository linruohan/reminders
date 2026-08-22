use tauri::{command, State};

use crate::database::connection::Database;
use crate::models::reminder::ReminderList;
use crate::repository::list::ListRepository;

use super::dto::{CreateListRequest, ListResponse, UpdateListRequest};
use super::helpers::{get_conn, parse_uuid};

#[command]
pub fn get_all_lists(db: State<'_, Database>) -> Result<Vec<ListResponse>, String> {
    let repo = ListRepository::new(get_conn(&db));
    repo.get_all()
        .map(|lists| lists.into_iter().map(Into::into).collect())
        .map_err(|e| e.to_string())
}

#[command]
pub fn create_list(
    db: State<'_, Database>,
    request: CreateListRequest,
) -> Result<ListResponse, String> {
    let mut list = ReminderList::new(request.name);
    if let Some(color) = request.color {
        list = list.with_color(color);
    }
    if let Some(icon) = request.icon {
        list = list.with_icon(icon);
    }
    let repo = ListRepository::new(get_conn(&db));
    repo.insert(&list).map_err(|e| e.to_string())?;
    Ok(list.into())
}

#[command]
pub fn delete_list(db: State<'_, Database>, id: String) -> Result<(), String> {
    let repo = ListRepository::new(get_conn(&db));
    let id = parse_uuid(&id)?;
    repo.delete(&id).map_err(|e| e.to_string())
}

#[command]
pub fn update_list(
    db: State<'_, Database>,
    request: UpdateListRequest,
) -> Result<ListResponse, String> {
    let repo = ListRepository::new(get_conn(&db));
    let id = parse_uuid(&request.id)?;
    let mut list = repo
        .get_by_id(&id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "List not found".to_string())?;
    if let Some(name) = request.name {
        list.name = name;
    }
    if let Some(color) = request.color {
        list.color = color;
    }
    if let Some(icon) = request.icon {
        list.icon = icon;
    }
    repo.update(&list).map_err(|e| e.to_string())?;
    Ok(list.into())
}
