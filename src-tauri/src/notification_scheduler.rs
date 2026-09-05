//! 桌面端通知调度：官方插件的 schedule 仅支持移动端，
//! 这里用后台轮询 + 即时 show 实现提前提醒 / 到期提醒。

use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};

use chrono::{Duration as ChronoDuration, Local, Months, NaiveDateTime, TimeZone};
use tauri::{AppHandle, Manager};
use tauri_plugin_notification::NotificationExt;

use crate::database::connection::Database;
use crate::models::reminder::Reminder;
use crate::repository::reminder::ReminderRepository;

const POLL_SECS: u64 = 20;
/// 通知窗口：到达触发时间后多久内仍可弹出（秒）
/// 放大窗口以覆盖睡眠/卡顿后的补扫；去重 key 防止重复弹
const FIRE_WINDOW_SECS: i64 = 600;
/// 已通知记录保留时长，超时淘汰，避免重复弹与无限增长
const NOTIFIED_TTL: Duration = Duration::from_secs(24 * 60 * 60);
const NOTIFIED_SOFT_MAX: usize = 400;

type NotifiedMap = HashMap<String, Instant>;

pub fn start(app: AppHandle) {
    crate::app_log!(info, "notification scheduler started");
    let notified: Arc<Mutex<NotifiedMap>> = Arc::new(Mutex::new(HashMap::new()));

    thread::spawn(move || {
        let _ = app.notification().request_permission();

        // 启动后立即扫一次，补发休眠/关闭前错过的通知
        if let Some(db) = app.try_state::<Database>() {
            if let Err(e) = tick(&app, &db, &notified) {
                crate::app_log!(error, "[notification] initial tick error: {e}");
            }
        }

        loop {
            thread::sleep(Duration::from_secs(POLL_SECS));
            if let Some(db) = app.try_state::<Database>() {
                if let Err(e) = tick(&app, &db, &notified) {
                    crate::app_log!(error, "[notification] tick error: {e}");
                }
            }
        }
    });
}

fn tick(
    app: &AppHandle,
    db: &Database,
    notified: &Arc<Mutex<NotifiedMap>>,
) -> Result<(), String> {
    let repo = ReminderRepository::new(db.conn());
    let active = repo.get_active().map_err(|e| e.to_string())?;
    let now = Local::now();

    let mut guard = notified.lock().map_err(|e| e.to_string())?;
    prune_notified(&mut guard);

    for reminder in active {
        if let Some((key, title, body)) = due_notification(&reminder, now) {
            if guard.contains_key(&key) {
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
                    crate::app_log!(info, "[notification] shown: {title} — {body}");
                    guard.insert(key, Instant::now());
                }
                Err(e) => {
                    crate::app_log!(error, "[notification] show failed: {e}");
                }
            }
        }
    }

    Ok(())
}

/// 按时间戳淘汰过期 key；超量时再丢掉最旧的一半余量
fn prune_notified(map: &mut NotifiedMap) {
    let now = Instant::now();
    map.retain(|_, stamped| now.duration_since(*stamped) < NOTIFIED_TTL);

    if map.len() <= NOTIFIED_SOFT_MAX {
        return;
    }

    let mut entries: Vec<(String, Instant)> = map.iter().map(|(k, v)| (k.clone(), *v)).collect();
    entries.sort_by_key(|(_, t)| *t);
    let keep = NOTIFIED_SOFT_MAX / 2;
    let drop_n = entries.len().saturating_sub(keep);
    for (k, _) in entries.into_iter().take(drop_n) {
        map.remove(&k);
    }
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
    let is_early = reminder.remind_before_value.is_some();
    let title = if is_early {
        "即将到期".to_string()
    } else {
        "提醒事项".to_string()
    };

    let due_label = if reminder.is_all_day || reminder.end_time.is_none() {
        due.format("%m月%d日").to_string()
    } else {
        due.format("%m月%d日 %H:%M").to_string()
    };

    let body = match reminder.description.as_ref().filter(|s| !s.is_empty()) {
        Some(desc) => format!("{} · {} — {}", reminder.title, due_label, desc),
        None => format!("{} · {}", reminder.title, due_label),
    };

    Some((key, title, body))
}

fn due_datetime(reminder: &Reminder) -> Option<chrono::DateTime<Local>> {
    let date = reminder.end_date?;
    // 全天提醒：当天 09:00；有具体时间则用截止时间
    let time = reminder.end_time.unwrap_or_else(|| {
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
    let v = value.max(0) as u32;
    match unit {
        "minutes" => due - ChronoDuration::minutes(v as i64),
        "hours" => due - ChronoDuration::hours(v as i64),
        "days" => due - ChronoDuration::days(v as i64),
        "weeks" => due - ChronoDuration::weeks(v as i64),
        "months" => due.checked_sub_months(Months::new(v)).unwrap_or(due),
        "years" => due.checked_sub_months(Months::new(v.saturating_mul(12))).unwrap_or(due),
        _ => due,
    }
}
