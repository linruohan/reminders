use std::path::PathBuf;

use tauri::{AppHandle, Builder, Manager};

use crate::commands::*;
use crate::database::connection::Database;

mod commands;
mod database;
mod models;
mod repository;

fn get_data_dir(app_handle: &AppHandle) -> PathBuf {
    app_handle
        .path()
        .data_dir()
        .unwrap_or_else(|_| PathBuf::from("."))
}

fn main() {
    let context = tauri::generate_context!();
    
    Builder::default()
        .setup(|app| {
            let db_path = get_data_dir(&app.handle()).join("reminders.db");
            let db = Database::open(&db_path).expect("Failed to open database");
            app.manage(db);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_all_reminders,
            get_reminders_by_filter,
            get_reminders_by_list,
            get_reminder_by_id,
            search_reminders,
            create_reminder,
            update_reminder,
            delete_reminder,
            toggle_reminder_completed,
            get_all_lists,
            create_list,
            update_list,
            delete_list,
            get_all_owners,
            create_owner,
            update_owner,
            delete_owner,
            get_reminder_tags,
            get_all_tags,
            search_tags,
        ])
        .run(context)
        .expect("error while running tauri application");
}