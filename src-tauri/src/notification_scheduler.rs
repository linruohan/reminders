//! 桌面端通知调度：官方插件的 schedule 仅支持移动端，
//! 这里用后台轮询 + 即时 show 实现提前提醒 / 到期提醒。

use std::collections::HashSet;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;

use chrono::{Duration as ChronoDuration, Local, NaiveDateTime, TimeZone};
use tauri::{AppHandle, Manager};
use tauri_plugin_notification::NotificationExt;

use crate::database::connection::Database;
use crate::models::reminder::Reminder;
use crate::repository::reminder::ReminderRepository;

const POLL_SECS: u64 = 20;
/// 通知窗口：到达触发时间后多久内仍可弹出（秒）
const FIRE_WINDOW_SECS: i64 = 90;

pub fn start(app: AppHandle) {
    let notified: Arc<Mutex<HashSet<String>>> = Arc::new(Mutex::new(HashSet::new()));

    thread::spawn(move || {
        // 首次请求权限（桌面端通常直接 Granted）
        let _ = app.notification().request_permission();

        loop {
            thread::sleep(Duration::from_secs(POLL_SECS));
            if let Some(db) = app.try_state::<Database>() {
                if let Err(e) = tick(&app, &db, &notified) {
                    eprintln!("[notification] tick error: {e}");
                }
            }
        }
    });
}

fn tick(
    app: &AppHandle,
    db: &Database,
    notified: &Arc<Mutex<HashSet<String>>>,
) -> Result<(), String> {
    let repo = ReminderRepository::new(db.conn());
    let active = repo.get_active().map_err(|e| e.to_string())?;
    let now = Local::now();

    let mut guard = notified.lock().map_err(|e| e.to_string())?;

    for reminder in active {
        if let Some((key, title, body)) = due_notification(&reminder, now) {
            if guard.contains(&key) {
                continue;
            }
            match app
                .notification()
                .builder()
                .title(&title)
                .body(&body)
                .show()
            {
                Ok(()) => {
                    guard.insert(key);
                }
                Err(e) => {
                    eprintln!("[notification] show failed: {e}");
                }
            }
        }
    }

    // 防止集合无限增长：只保留近期 key
    if guard.len() > 500 {
        guard.clear();
    }

    Ok(())
}

/// 若当前应弹出通知，返回 (去重 key, title, body)
fn due_notification(
    reminder: &Reminder,
    now: chrono::DateTime<Local>,
) -> Option<(String, String, String)> {
    let due = due_datetime(reminder)?;
    let notify_at = if let (Some(value), Some(unit)) = (
        reminder.remind_before_value,
        reminder.remind_before_unit.as_deref(),
    ) {
        subtract_remind(due, value, unit)
    } else {
        due
    };

    let delta = (now - notify_at).num_seconds();
    if delta < 0 || delta > FIRE_WINDOW_SECS {
        return None;
    }

    let key = format!("{}@{}", reminder.id, notify_at.timestamp());
    let title = if reminder.remind_before_value.is_some() {
        "即将到期".to_string()
    } else {
        "提醒事项".to_string()
    };
    let body = if let Some(desc) = reminder.description.as_ref().filter(|s| !s.is_empty()) {
        format!("{} — {}", reminder.title, desc)
    } else {
        reminder.title.clone()
    };

    Some((key, title, body))
}

fn due_datetime(reminder: &Reminder) -> Option<chrono::DateTime<Local>> {
    let date = reminder.end_date?;
    let time = reminder.end_time.unwrap_or_else(|| {
        // 全日或仅日期：默认当天 09:00
        chrono::NaiveTime::from_hms_opt(9, 0, 0).unwrap()
    });
    let naive = NaiveDateTime::new(date, time);
    Local.from_local_datetime(&naive).single()
}

fn subtract_remind(
    due: chrono::DateTime<Local>,
    value: i32,
    unit: &str,
) -> chrono::DateTime<Local> {
    let v = value.max(0) as i64;
    match unit {
        "minutes" => due - ChronoDuration::minutes(v),
        "hours" => due - ChronoDuration::hours(v),
        "days" => due - ChronoDuration::days(v),
        "weeks" => due - ChronoDuration::weeks(v),
        "months" => due - ChronoDuration::days(v * 30),
        "years" => due - ChronoDuration::days(v * 365),
        _ => due,
    }
}
