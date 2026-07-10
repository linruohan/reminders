use std::path::PathBuf;

use tauri::Builder;

use crate::commands::*;
use crate::database::connection::Database;

mod commands;
mod database;
mod models;

fn main() {
    let db_path = PathBuf::from("reminders.db");
    
    let db = Database::open(&db_path)
        .expect("Failed to open database");
    
    Builder::default()
        .manage(db)
        .invoke_handler(tauri::generate_handler![
            get_all_reminders,
            get_reminders_by_filter,
            get_reminders_by_list,
            get_reminder_by_id,
            create_reminder,
            update_reminder,
            delete_reminder,
            toggle_reminder_completed,
            get_all_lists,
            create_list,
            delete_list,
            get_all_owners,
            create_owner,
            delete_owner,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
