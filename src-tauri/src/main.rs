#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::path::PathBuf;

use tauri::{AppHandle, Builder, Manager, WindowEvent};

use crate::commands::*;
use crate::database::connection::Database;

mod commands;
mod database;
mod logging;
mod models;
mod notification_scheduler;
mod recurrence;
mod repository;
mod tray;

fn get_data_dir(app_handle: &AppHandle) -> PathBuf {
    app_handle
        .path()
        .data_dir()
        .unwrap_or_else(|_| PathBuf::from("."))
}

fn main() {
    logging::init();
    app_log!(info, "reminders starting v{}", env!("CARGO_PKG_VERSION"));

    let context = tauri::generate_context!();

    Builder::default()
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            let db_path = get_data_dir(&app.handle()).join("reminders.db");
            app_log!(info, "opening database: {}", db_path.display());
            let db = match Database::open(&db_path) {
                Ok(db) => db,
                Err(e) => {
                    app_log!(error, "failed to open database {}: {e}", db_path.display());
                    panic!("Failed to open database: {e}");
                }
            };
            app.manage(db);
            notification_scheduler::start(app.handle().clone());
            if let Err(e) = tray::setup(app) {
                app_log!(error, "failed to create system tray: {e}");
                panic!("Failed to create system tray: {e}");
            }
            app_log!(info, "app setup complete");
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                // 关闭键 / Alt+F4：隐藏到托盘，进程继续跑以便收到期通知
                app_log!(info, "window close requested, hiding to tray");
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_all_reminders,
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
            get_all_tags,
            rename_tag,
            delete_tag,
            create_subtask,
            update_subtask,
            delete_subtask,
        ])
        .run(context)
        .unwrap_or_else(|e| {
            app_log!(error, "error while running tauri application: {e}");
            panic!("error while running tauri application: {e}");
        });
}
