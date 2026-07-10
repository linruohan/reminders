use crate::models::reminder::{
    LocationProximity, LocationTrigger, Priority, RecurrenceFrequency, RecurrenceRule, Reminder,
};
use chrono::{Local, NaiveDate, NaiveTime};
use rusqlite::{params, Connection, OptionalExtension, Result, Row};
use uuid::Uuid;

const REMINDER_COLUMNS: &str = "id, title, description, due_date, due_time, is_completed, priority, list_id, created_at, updated_at, url, is_all_day, completion_date, alarm_at, recurrence_frequency, recurrence_interval, location_address, location_latitude, location_longitude, location_radius, location_proximity, owner_id";

pub struct ReminderRepository<'a> {
    conn: &'a Connection,
}

impl<'a> ReminderRepository<'a> {
    pub fn new(conn: &'a Connection) -> Self {
        Self { conn }
    }

    pub fn get_all(&self) -> Result<Vec<Reminder>> {
        let sql = format!("SELECT {REMINDER_COLUMNS} FROM reminders ORDER BY created_at DESC");
        let mut stmt = self.conn.prepare(&sql)?;
        let rows = stmt.query_map([], Self::row_to_reminder)?;
        rows.collect()
    }

    pub fn get_by_id(&self, id: &Uuid) -> Result<Option<Reminder>> {
        let sql = format!("SELECT {REMINDER_COLUMNS} FROM reminders WHERE id = ?");
        let mut stmt = self.conn.prepare(&sql)?;
        stmt.query_row([id.to_string()], Self::row_to_reminder)
            .optional()
    }

    pub fn get_by_list_id(&self, list_id: &Uuid) -> Result<Vec<Reminder>> {
        let sql = format!(
            "SELECT {REMINDER_COLUMNS} FROM reminders WHERE list_id = ? ORDER BY created_at DESC"
        );
        let mut stmt = self.conn.prepare(&sql)?;
        let rows = stmt.query_map([list_id.to_string()], Self::row_to_reminder)?;
        rows.collect()
    }

    pub fn get_by_date(&self, date: &NaiveDate) -> Result<Vec<Reminder>> {
        let sql = format!(
            "SELECT {REMINDER_COLUMNS} FROM reminders WHERE due_date = ? AND is_completed = 0 ORDER BY created_at DESC"
        );
        let mut stmt = self.conn.prepare(&sql)?;
        let date_str = date.format("%Y-%m-%d").to_string();
        let rows = stmt.query_map([date_str], Self::row_to_reminder)?;
        rows.collect()
    }

    pub fn get_today(&self) -> Result<Vec<Reminder>> {
        let today = Local::now().date_naive();
        self.get_by_date(&today)
    }

    pub fn get_planned(&self) -> Result<Vec<Reminder>> {
        let sql = format!(
            "SELECT {REMINDER_COLUMNS} FROM reminders WHERE due_date IS NOT NULL AND is_completed = 0 ORDER BY created_at DESC"
        );
        let mut stmt = self.conn.prepare(&sql)?;
        let rows = stmt.query_map([], Self::row_to_reminder)?;
        rows.collect()
    }

    pub fn get_active(&self) -> Result<Vec<Reminder>> {
        let sql = format!(
            "SELECT {REMINDER_COLUMNS} FROM reminders WHERE is_completed = 0 ORDER BY created_at DESC"
        );
        let mut stmt = self.conn.prepare(&sql)?;
        let rows = stmt.query_map([], Self::row_to_reminder)?;
        rows.collect()
    }

    pub fn has_reminder_on_date(&self, date: &NaiveDate) -> Result<bool> {
        let date_str = date.format("%Y-%m-%d").to_string();
        let count: i64 = self.conn.query_row(
            "SELECT COUNT(*) FROM reminders WHERE due_date = ? AND is_completed = 0",
            [date_str],
            |row| row.get(0),
        )?;
        Ok(count > 0)
    }

    pub fn insert(&self, reminder: &Reminder) -> Result<()> {
        self.conn.execute(
            "INSERT INTO reminders (id, title, description, due_date, due_time, is_completed, priority, list_id, created_at, updated_at, url, is_all_day, completion_date, alarm_at, recurrence_frequency, recurrence_interval, location_address, location_latitude, location_longitude, location_radius, location_proximity, owner_id) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22)",
            params![
                reminder.id.to_string(),
                reminder.title,
                reminder.description,
                reminder.due_date.map(|d| d.format("%Y-%m-%d").to_string()),
                reminder.due_time.map(|t| t.format("%H:%M:%S").to_string()),
                reminder.is_completed as i32,
                Self::priority_to_str(&reminder.priority),
                reminder.list_id.map(|id| id.to_string()),
                reminder.created_at.to_rfc3339(),
                reminder.updated_at.to_rfc3339(),
                reminder.url,
                reminder.is_all_day as i32,
                reminder.completion_date.map(|d| d.to_rfc3339()),
                reminder.alarm_at.map(|d| d.to_rfc3339()),
                reminder.recurrence.as_ref().map(|r| Self::frequency_to_str(&r.frequency)),
                reminder.recurrence.as_ref().map(|r| r.interval as i64),
                reminder.location.as_ref().map(|l| l.address.as_str()),
                reminder.location.as_ref().and_then(|l| l.latitude),
                reminder.location.as_ref().and_then(|l| l.longitude),
                reminder.location.as_ref().map(|l| l.radius),
                reminder.location.as_ref().map(|l| Self::proximity_to_str(&l.proximity)),
                reminder.owner_id.map(|id| id.to_string()),
            ],
        )?;
        Ok(())
    }

    pub fn update(&self, reminder: &Reminder) -> Result<()> {
        let now = Local::now();
        self.conn.execute(
            "UPDATE reminders SET title = ?1, description = ?2, due_date = ?3, due_time = ?4, is_completed = ?5, priority = ?6, list_id = ?7, updated_at = ?8, url = ?9, is_all_day = ?10, completion_date = ?11, alarm_at = ?12, recurrence_frequency = ?13, recurrence_interval = ?14, location_address = ?15, location_latitude = ?16, location_longitude = ?17, location_radius = ?18, location_proximity = ?19, owner_id = ?20 WHERE id = ?21",
            params![
                reminder.title,
                reminder.description,
                reminder.due_date.map(|d| d.format("%Y-%m-%d").to_string()),
                reminder.due_time.map(|t| t.format("%H:%M:%S").to_string()),
                reminder.is_completed as i32,
                Self::priority_to_str(&reminder.priority),
                reminder.list_id.map(|id| id.to_string()),
                now.to_rfc3339(),
                reminder.url,
                reminder.is_all_day as i32,
                reminder.completion_date.map(|d| d.to_rfc3339()),
                reminder.alarm_at.map(|d| d.to_rfc3339()),
                reminder.recurrence.as_ref().map(|r| Self::frequency_to_str(&r.frequency)),
                reminder.recurrence.as_ref().map(|r| r.interval as i64),
                reminder.location.as_ref().map(|l| l.address.as_str()),
                reminder.location.as_ref().and_then(|l| l.latitude),
                reminder.location.as_ref().and_then(|l| l.longitude),
                reminder.location.as_ref().map(|l| l.radius),
                reminder.location.as_ref().map(|l| Self::proximity_to_str(&l.proximity)),
                reminder.owner_id.map(|id| id.to_string()),
                reminder.id.to_string(),
            ],
        )?;
        Ok(())
    }

    pub fn delete(&self, id: &Uuid) -> Result<()> {
        self.conn
            .execute("DELETE FROM reminders WHERE id = ?", [id.to_string()])?;
        Ok(())
    }

    fn row_to_reminder(row: &Row) -> Result<Reminder> {
        let id_str: String = row.get("id")?;
        let id = Uuid::parse_str(&id_str).unwrap_or_else(|_| Uuid::new_v4());

        let due_date_str: Option<String> = row.get("due_date")?;
        let due_date = due_date_str
            .as_deref()
            .and_then(|s| NaiveDate::parse_from_str(s, "%Y-%m-%d").ok());

        let due_time_str: Option<String> = row.get("due_time")?;
        let due_time = due_time_str
            .as_deref()
            .and_then(|s| NaiveTime::parse_from_str(s, "%H:%M:%S").ok());

        let is_completed: i32 = row.get("is_completed")?;
        let priority_str: String = row.get("priority")?;
        let list_id_str: Option<String> = row.get("list_id")?;
        let list_id = list_id_str.as_deref().and_then(|s| Uuid::parse_str(s).ok());

        let owner_id_str: Option<String> = row.get("owner_id").unwrap_or(None);
        let owner_id = owner_id_str
            .as_deref()
            .and_then(|s| Uuid::parse_str(s).ok());

        let created_at_str: String = row.get("created_at")?;
        let created_at = chrono::DateTime::parse_from_rfc3339(&created_at_str)
            .unwrap_or_else(|_| Local::now().into())
            .with_timezone(&Local);

        let updated_at_str: String = row.get("updated_at")?;
        let updated_at = chrono::DateTime::parse_from_rfc3339(&updated_at_str)
            .unwrap_or_else(|_| Local::now().into())
            .with_timezone(&Local);

        let url: Option<String> = row.get("url").unwrap_or(None);
        let is_all_day: i32 = row.get("is_all_day").unwrap_or(0);

        let completion_date = row
            .get::<_, Option<String>>("completion_date")
            .ok()
            .flatten()
            .and_then(|s| chrono::DateTime::parse_from_rfc3339(&s).ok())
            .map(|d| d.with_timezone(&Local));

        let alarm_at = row
            .get::<_, Option<String>>("alarm_at")
            .ok()
            .flatten()
            .and_then(|s| chrono::DateTime::parse_from_rfc3339(&s).ok())
            .map(|d| d.with_timezone(&Local));

        let recurrence = match (
            row.get::<_, Option<String>>("recurrence_frequency")
                .ok()
                .flatten(),
            row.get::<_, Option<i64>>("recurrence_interval")
                .ok()
                .flatten(),
        ) {
            (Some(freq), Some(interval)) => Some(RecurrenceRule {
                frequency: Self::str_to_frequency(&freq),
                interval: interval.max(1) as u32,
            }),
            _ => None,
        };

        let location = row
            .get::<_, Option<String>>("location_address")
            .ok()
            .flatten()
            .map(|address| LocationTrigger {
                address,
                latitude: row.get("location_latitude").ok().flatten(),
                longitude: row.get("location_longitude").ok().flatten(),
                radius: row.get("location_radius").ok().flatten().unwrap_or(100.0),
                proximity: row
                    .get::<_, Option<String>>("location_proximity")
                    .ok()
                    .flatten()
                    .map(|s| Self::str_to_proximity(&s))
                    .unwrap_or(LocationProximity::Arriving),
            });

        Ok(Reminder {
            id,
            title: row.get("title")?,
            description: row.get("description")?,
            url,
            due_date,
            due_time,
            is_all_day: is_all_day != 0,
            is_completed: is_completed != 0,
            completion_date,
            priority: Self::str_to_priority(&priority_str),
            alarm_at,
            recurrence,
            location,
            owner_id,
            list_id,
            created_at,
            updated_at,
        })
    }

    fn priority_to_str(priority: &Priority) -> &str {
        match priority {
            Priority::None => "none",
            Priority::High => "high",
            Priority::Medium => "medium",
            Priority::Low => "low",
        }
    }

    fn str_to_priority(s: &str) -> Priority {
        match s {
            "high" => Priority::High,
            "low" => Priority::Low,
            "medium" => Priority::Medium,
            _ => Priority::None,
        }
    }

    fn frequency_to_str(frequency: &RecurrenceFrequency) -> &str {
        match frequency {
            RecurrenceFrequency::Daily => "daily",
            RecurrenceFrequency::Weekly => "weekly",
            RecurrenceFrequency::Monthly => "monthly",
            RecurrenceFrequency::Yearly => "yearly",
        }
    }

    fn str_to_frequency(s: &str) -> RecurrenceFrequency {
        match s {
            "weekly" => RecurrenceFrequency::Weekly,
            "monthly" => RecurrenceFrequency::Monthly,
            "yearly" => RecurrenceFrequency::Yearly,
            _ => RecurrenceFrequency::Daily,
        }
    }

    fn proximity_to_str(proximity: &LocationProximity) -> &str {
        match proximity {
            LocationProximity::Arriving => "arriving",
            LocationProximity::Leaving => "leaving",
        }
    }

    fn str_to_proximity(s: &str) -> LocationProximity {
        match s {
            "leaving" => LocationProximity::Leaving,
            _ => LocationProximity::Arriving,
        }
    }
}
