use tauri::{command, State};
use uuid::Uuid;

use crate::database::connection::Database;
use crate::models::owner::Owner;
use crate::repository::owner::OwnerRepository;

use super::dto::{CreateOwnerRequest, OwnerResponse, UpdateOwnerRequest};
use super::helpers::get_conn;

#[command]
pub fn get_all_owners(db: State<'_, Database>) -> Result<Vec<OwnerResponse>, String> {
    let repo = OwnerRepository::new(get_conn(&db));
    repo.get_all()
        .map(|owners| owners.into_iter().map(Into::into).collect())
        .map_err(|e| e.to_string())
}

#[command]
pub fn create_owner(
    db: State<'_, Database>,
    request: CreateOwnerRequest,
) -> Result<OwnerResponse, String> {
    let mut owner = Owner::new(request.name);
    if let Some(color) = request.color {
        owner = owner.with_color(color);
    }
    let repo = OwnerRepository::new(get_conn(&db));
    repo.insert(&owner).map_err(|e| e.to_string())?;
    Ok(owner.into())
}

#[command]
pub fn delete_owner(db: State<'_, Database>, id: String) -> Result<(), String> {
    let repo = OwnerRepository::new(get_conn(&db));
    let id = Uuid::parse_str(&id).map_err(|e| e.to_string())?;
    repo.delete(&id).map_err(|e| e.to_string())
}

#[command]
pub fn update_owner(
    db: State<'_, Database>,
    request: UpdateOwnerRequest,
) -> Result<OwnerResponse, String> {
    let repo = OwnerRepository::new(get_conn(&db));
    let id = Uuid::parse_str(&request.id).map_err(|e| e.to_string())?;
    let mut owner = repo
        .get_by_id(&id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Owner not found".to_string())?;
    if let Some(name) = request.name {
        owner.name = name;
    }
    if let Some(color) = request.color {
        owner.color = color;
    }
    repo.update(&owner).map_err(|e| e.to_string())?;
    Ok(owner.into())
}
