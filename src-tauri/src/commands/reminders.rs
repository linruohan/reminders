use chrono::Local;
use tauri::{command, State};
use uuid::Uuid;

use crate::database::connection::Database;
use crate::models::reminder::{Priority, Reminder};
use crate::recurrence::next_due_date;
use crate::repository::reminder::ReminderRepository;

use super::dto::{CreateReminderRequest, ReminderResponse, UpdateReminderRequest};
use super::helpers::{
    get_conn, get_reminder_tags_internal, get_reminder_with_tags, insert_reminder_row,
    map_reminders_with_tags, parse_date, parse_priority, parse_time,
    sync_reminder_tags_in_tx,
};

#[command]
pub fn get_all_reminders(db: State<'_, Database>) -> Result<Vec<ReminderResponse>, String> {
    let repo = ReminderRepository::new(get_conn(&db));
    repo.get_all()
        .map_err(|e| e.to_string())
        .and_then(|reminders| map_reminders_with_tags(reminders, &db))
}

#[command]
pub fn get_reminders_by_filter(
    db: State<'_, Database>,
    filter: String,
) -> Result<Vec<ReminderResponse>, String> {
    let repo = ReminderRepository::new(get_conn(&db));
    let reminders = match filter.as_str() {
        "today" => repo.get_today(),
        "planned" => repo.get_planned(),
        "overdue" => repo.get_overdue(),
        "completed" => repo.get_completed(),
        "urgent" => repo.get_urgent(),
        "flagged" => repo.get_flagged(),
        "all" => repo.get_all(),
        _ => repo.get_active(),
    };
    reminders
        .map_err(|e| e.to_string())
        .and_then(|rs| map_reminders_with_tags(rs, &db))
}

#[command]
pub fn get_reminders_by_list(
    db: State<'_, Database>,
    list_id: String,
) -> Result<Vec<ReminderResponse>, String> {
    let repo = ReminderRepository::new(get_conn(&db));
    let id = Uuid::parse_str(&list_id).map_err(|e| e.to_string())?;
    repo.get_by_list_id(&id)
        .map_err(|e| e.to_string())
        .and_then(|reminders| map_reminders_with_tags(reminders, &db))
}

#[command]
pub fn get_reminders_by_owner(
    db: State<'_, Database>,
    owner_id: String,
) -> Result<Vec<ReminderResponse>, String> {
    let repo = ReminderRepository::new(get_conn(&db));
    let id = Uuid::parse_str(&owner_id).map_err(|e| e.to_string())?;
    repo.get_by_owner_id(&id)
        .map_err(|e| e.to_string())
        .and_then(|reminders| map_reminders_with_tags(reminders, &db))
}

#[command]
pub fn get_reminders_by_tag(
    db: State<'_, Database>,
    tag_name: String,
) -> Result<Vec<ReminderResponse>, String> {
    let repo = ReminderRepository::new(get_conn(&db));
    repo.get_by_tag_name(&tag_name)
        .map_err(|e| e.to_string())
        .and_then(|reminders| map_reminders_with_tags(reminders, &db))
}

#[command]
pub fn get_reminders_by_date_range(
    db: State<'_, Database>,
    start_date: String,
    end_date: String,
) -> Result<Vec<ReminderResponse>, String> {
    let repo = ReminderRepository::new(get_conn(&db));
    repo.get_by_date_range(&start_date, &end_date)
        .map_err(|e| e.to_string())
        .and_then(|reminders| map_reminders_with_tags(reminders, &db))
}

#[command]
pub fn get_reminder_by_id(
    db: State<'_, Database>,
    id: String,
) -> Result<Option<ReminderResponse>, String> {
    let repo = ReminderRepository::new(get_conn(&db));
    let id = Uuid::parse_str(&id).map_err(|e| e.to_string())?;
    repo.get_by_id(&id)
        .map_err(|e| e.to_string())?
        .map(|r| get_reminder_with_tags(r, &db))
        .transpose()
}

#[command]
pub fn search_reminders(
    db: State<'_, Database>,
    query: String,
) -> Result<Vec<ReminderResponse>, String> {
    let repo = ReminderRepository::new(get_conn(&db));
    repo.search(&query)
        .map_err(|e| e.to_string())
        .and_then(|reminders| map_reminders_with_tags(reminders, &db))
}

#[command]
pub fn create_reminder(
    db: State<'_, Database>,
    request: CreateReminderRequest,
) -> Result<ReminderResponse, String> {
    let mut reminder = Reminder::new(request.title);

    let now = Local::now();
    reminder.created_date = Some(now.date_naive());
    reminder.created_time = Some(now.time());

    if let Some(desc) = request.description {
        reminder = reminder.with_description(desc);
    }
    if let Some(list_id) = request.list_id.as_deref().and_then(|s| Uuid::parse_str(s).ok()) {
        reminder = reminder.with_list_id(list_id);
    }
    if request.is_all_day {
        reminder = reminder.with_is_all_day();
    }
    if let Some(url) = request.url {
        reminder.url = Some(url);
    }
    if let Some(d) = request.end_date.as_deref().and_then(parse_date) {
        reminder.end_date = Some(d);
    }
    if let Some(t) = request.end_time.as_deref().and_then(parse_time) {
        reminder.end_time = Some(t);
    }
    if request.is_flagged {
        reminder.is_flagged = true;
    }
    if let Some(p) = request.priority.as_deref() {
        reminder.priority = parse_priority(p);
    }
    if let Some(owner) = request.owner_id.as_deref().and_then(|s| {
        if s.is_empty() {
            None
        } else {
            Uuid::parse_str(s).ok()
        }
    }) {
        reminder.owner_id = Some(owner);
    }

    reminder.recurrence_frequency = request.recurrence_frequency;
    reminder.recurrence_interval = request.recurrence_interval;
    reminder.custom_recurrence_unit = request.custom_recurrence_unit;
    if let Some(d) = request.recurrence_end_date.as_deref().and_then(parse_date) {
        reminder.recurrence_end_date = Some(d);
    }
    reminder.remind_before_value = request.remind_before_value;
    reminder.remind_before_unit = request.remind_before_unit;

    let reminder_id = reminder.id.to_string();
    let conn = get_conn(&db);
    let mut conn_guard = conn.lock().map_err(|e| e.to_string())?;
    let tx = conn_guard.transaction().map_err(|e| e.to_string())?;
    insert_reminder_row(&tx, &reminder)?;
    if let Some(tag_names) = request.tags {
        sync_reminder_tags_in_tx(&tx, &reminder_id, &tag_names)?;
    }
    tx.commit().map_err(|e| e.to_string())?;
    drop(conn_guard);

    let mut resp: ReminderResponse = reminder.into();
    resp.tags = get_reminder_tags_internal(get_conn(&db), &reminder_id)?;
    Ok(resp)
}

#[command]
pub fn update_reminder(
    db: State<'_, Database>,
    request: UpdateReminderRequest,
) -> Result<ReminderResponse, String> {
    let repo = ReminderRepository::new(get_conn(&db));
    let id = Uuid::parse_str(&request.id).map_err(|e| e.to_string())?;

    let mut reminder = repo
        .get_by_id(&id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Reminder not found".to_string())?;
    let reminder_id = reminder.id.to_string();
    let was_completed = reminder.is_completed;

    if let Some(title) = request.title {
        reminder.title = title;
    }
    if let Some(description) = request.description {
        reminder.description = if description.is_empty() {
            None
        } else {
            Some(description)
        };
    }
    if let Some(url) = request.url {
        reminder.url = if url.is_empty() { None } else { Some(url) };
    }
    if let Some(s) = request.end_date {
        reminder.end_date = if s.is_empty() { None } else { parse_date(&s) };
    }
    if let Some(s) = request.end_time {
        reminder.end_time = if s.is_empty() { None } else { parse_time(&s) };
    }
    if let Some(is_completed) = request.is_completed {
        reminder.is_completed = is_completed;
        reminder.completion_date = if is_completed {
            Some(Local::now())
        } else {
            None
        };
    }
    if let Some(is_flagged) = request.is_flagged {
        reminder.is_flagged = is_flagged;
    }
    if let Some(s) = request.priority {
        reminder.priority = if s.is_empty() {
            Priority::None
        } else {
            parse_priority(&s)
        };
    }
    if let Some(s) = request.list_id {
        reminder.list_id = if s.is_empty() {
            None
        } else {
            Uuid::parse_str(&s).ok()
        };
    }
    if let Some(s) = request.owner_id {
        reminder.owner_id = if s.is_empty() {
            None
        } else {
            Uuid::parse_str(&s).ok()
        };
    }
    if let Some(is_all_day) = request.is_all_day {
        reminder.is_all_day = is_all_day;
    }
    if let Some(rf) = request.recurrence_frequency {
        reminder.recurrence_frequency = if rf.is_empty() { None } else { Some(rf) };
    }
    if let Some(ri) = request.recurrence_interval {
        reminder.recurrence_interval = Some(ri);
    }
    if let Some(cru) = request.custom_recurrence_unit {
        reminder.custom_recurrence_unit = if cru.is_empty() { None } else { Some(cru) };
    }
    if let Some(s) = request.recurrence_end_date {
        reminder.recurrence_end_date = if s.is_empty() { None } else { parse_date(&s) };
    }
    if let Some(rbv) = request.remind_before_value {
        reminder.remind_before_value = if rbv < 0 { None } else { Some(rbv) };
    }
    if let Some(rbu) = request.remind_before_unit {
        if rbu.is_empty() {
            reminder.remind_before_unit = None;
            reminder.remind_before_value = None;
        } else {
            reminder.remind_before_unit = Some(rbu);
        }
    }

    let conn = get_conn(&db);
    let mut conn_guard = conn.lock().map_err(|e| e.to_string())?;
    let tx = conn_guard.transaction().map_err(|e| e.to_string())?;

    ReminderRepository::update_on_conn(&tx, &reminder).map_err(|e| e.to_string())?;

    if let Some(tag_names) = request.tags {
        sync_reminder_tags_in_tx(&tx, &reminder_id, &tag_names)?;
    }

    tx.commit().map_err(|e| e.to_string())?;
    drop(conn_guard);

    let becoming_completed = !was_completed && reminder.is_completed;
    if becoming_completed {
        maybe_spawn_next_occurrence(&db, &reminder)?;
    }

    let mut resp: ReminderResponse = reminder.into();
    resp.tags = get_reminder_tags_internal(get_conn(&db), &reminder_id)?;
    Ok(resp)
}

#[command]
pub fn delete_reminder(db: State<'_, Database>, id: String) -> Result<(), String> {
    let repo = ReminderRepository::new(get_conn(&db));
    let id = Uuid::parse_str(&id).map_err(|e| e.to_string())?;
    repo.delete(&id).map_err(|e| e.to_string())
}

#[command]
pub fn toggle_reminder_completed(
    db: State<'_, Database>,
    id: String,
) -> Result<ReminderResponse, String> {
    let repo = ReminderRepository::new(get_conn(&db));
    let id = Uuid::parse_str(&id).map_err(|e| e.to_string())?;

    let mut reminder = repo
        .get_by_id(&id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Reminder not found".to_string())?;

    let becoming_completed = !reminder.is_completed;
    reminder.is_completed = becoming_completed;
    reminder.completion_date = if becoming_completed {
        Some(Local::now())
    } else {
        None
    };

    repo.update(&reminder).map_err(|e| e.to_string())?;

    if becoming_completed {
        maybe_spawn_next_occurrence(&db, &reminder)?;
    }

    get_reminder_with_tags(reminder, &db)
}

fn maybe_spawn_next_occurrence(
    db: &State<'_, Database>,
    reminder: &Reminder,
) -> Result<(), String> {
    if let Some(freq) = reminder.recurrence_frequency.clone() {
        let base_date = reminder
            .end_date
            .unwrap_or_else(|| Local::now().date_naive());
        if let Some(next_date) = next_due_date(
            base_date,
            &freq,
            reminder.recurrence_interval,
            reminder.custom_recurrence_unit.as_deref(),
            reminder.recurrence_end_date,
        ) {
            spawn_next_occurrence(db, reminder, next_date)?;
        }
    }
    Ok(())
}

fn spawn_next_occurrence(
    db: &State<'_, Database>,
    source: &Reminder,
    next_date: chrono::NaiveDate,
) -> Result<(), String> {
    let now = Local::now();
    let mut next = Reminder::new(source.title.clone());
    next.description = source.description.clone();
    next.url = source.url.clone();
    next.created_date = Some(now.date_naive());
    next.created_time = Some(now.time());
    next.end_date = Some(next_date);
    next.end_time = source.end_time;
    next.is_all_day = source.is_all_day;
    next.is_completed = false;
    next.is_flagged = source.is_flagged;
    next.priority = source.priority.clone();
    next.list_id = source.list_id;
    next.owner_id = source.owner_id;
    next.recurrence_frequency = source.recurrence_frequency.clone();
    next.recurrence_interval = source.recurrence_interval;
    next.custom_recurrence_unit = source.custom_recurrence_unit.clone();
    next.recurrence_end_date = source.recurrence_end_date;
    next.remind_before_value = source.remind_before_value;
    next.remind_before_unit = source.remind_before_unit.clone();

    let source_id = source.id.to_string();
    let next_id = next.id.to_string();
    let tag_names = get_reminder_tags_internal(get_conn(db), &source_id)?
        .into_iter()
        .map(|t| t.name)
        .collect::<Vec<_>>();

    let conn = get_conn(db);
    let mut conn_guard = conn.lock().map_err(|e| e.to_string())?;
    let tx = conn_guard.transaction().map_err(|e| e.to_string())?;
    insert_reminder_row(&tx, &next)?;
    if !tag_names.is_empty() {
        sync_reminder_tags_in_tx(&tx, &next_id, &tag_names)?;
    }
    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}
