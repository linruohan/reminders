use tauri::{command, State};

use crate::database::connection::Database;
use crate::models::owner::Owner;
use crate::repository::owner::OwnerRepository;

use super::dto::{CreateOwnerRequest, OwnerResponse, UpdateOwnerRequest};
use super::helpers::{get_conn, parse_uuid};

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
    let name = request.name.trim().to_string();
    if name.is_empty() {
        return Err("负责人名称不能为空".to_string());
    }
    let mut owner = Owner::new(name);
    if let Some(color) = request.color {
        owner = owner.with_color(color);
    }
    let repo = OwnerRepository::new(get_conn(&db));
    // 同名责任人直接复用已有记录，重复请求不会插入第二行
    let saved = repo.find_or_create(&owner).map_err(|e| e.to_string())?;
    Ok(saved.into())
}

#[command]
pub fn delete_owner(db: State<'_, Database>, id: String) -> Result<(), String> {
    let repo = OwnerRepository::new(get_conn(&db));
    let id = parse_uuid(&id)?;
    repo.delete(&id).map_err(|e| e.to_string())
}

#[command]
pub fn update_owner(
    db: State<'_, Database>,
    request: UpdateOwnerRequest,
) -> Result<OwnerResponse, String> {
    let repo = OwnerRepository::new(get_conn(&db));
    let id = parse_uuid(&request.id)?;
    let mut owner = repo
        .get_by_id(&id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Owner not found".to_string())?;
    if let Some(name) = request.name {
        let name = name.trim().to_string();
        if name.is_empty() {
            return Err("负责人名称不能为空".to_string());
        }
        owner.name = name;
    }
    if let Some(color) = request.color {
        owner.color = color;
    }
    repo.update(&owner).map_err(|e| {
        let msg = e.to_string();
        if msg.contains("UNIQUE constraint failed") {
            "已存在同名负责人".to_string()
        } else {
            msg
        }
    })?;
    Ok(owner.into())
}
