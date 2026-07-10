use rusqlite::{Connection, Result};
use uuid::Uuid;

pub const DEFAULT_LIST_ID: &str = "00000000-0000-0000-0000-000000000001";
pub const WORK_LIST_ID: &str = "00000000-0000-0000-0000-000000000002";
pub const PERSONAL_LIST_ID: &str = "00000000-0000-0000-0000-000000000003";
pub const DEFAULT_OWNER_ID: &str = "00000000-0000-0000-0000-000000000010";
pub const OWNER_2_ID: &str = "00000000-0000-0000-0000-000000000011";
pub const OWNER_3_ID: &str = "00000000-0000-0000-0000-000000000012";

pub fn init_schema(conn: &Connection) -> Result<()> {
    conn.execute(
        r#"CREATE TABLE IF NOT EXISTS reminder_lists (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            color TEXT NOT NULL DEFAULT '#007AFF',
            icon TEXT NOT NULL DEFAULT 'list'
        )"#,
        [],
    )?;

    conn.execute(
        r#"CREATE TABLE IF NOT EXISTS owners (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            color TEXT NOT NULL DEFAULT '#5856D6'
        )"#,
        [],
    )?;

    conn.execute(
        r#"CREATE TABLE IF NOT EXISTS reminders (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            due_date TEXT,
            due_time TEXT,
            is_completed INTEGER NOT NULL DEFAULT 0,
            priority TEXT NOT NULL DEFAULT 'none',
            list_id TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            url TEXT,
            is_all_day INTEGER NOT NULL DEFAULT 0,
            completion_date TEXT,
            alarm_at TEXT,
            recurrence_frequency TEXT,
            recurrence_interval INTEGER,
            location_address TEXT,
            location_latitude REAL,
            location_longitude REAL,
            location_radius REAL,
            location_proximity TEXT,
            owner_id TEXT,
            FOREIGN KEY (list_id) REFERENCES reminder_lists(id) ON DELETE SET NULL,
            FOREIGN KEY (owner_id) REFERENCES owners(id) ON DELETE SET NULL
        )"#,
        [],
    )?;

    migrate_schema(conn)?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_reminders_list_id ON reminders(list_id)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_reminders_due_date ON reminders(due_date)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_reminders_is_completed ON reminders(is_completed)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_reminders_due_date_completed ON reminders(due_date, is_completed)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_reminders_list_completed ON reminders(list_id, is_completed)",
        [],
    )?;

    Ok(())
}

fn migrate_schema(conn: &Connection) -> Result<()> {
    let columns = table_columns(conn, "reminders")?;
    let add_column = |name: &str, ddl: &str| -> Result<()> {
        if !columns.iter().any(|c| c == name) {
            conn.execute(ddl, [])?;
        }
        Ok(())
    };

    add_column("url", "ALTER TABLE reminders ADD COLUMN url TEXT")?;
    add_column(
        "is_all_day",
        "ALTER TABLE reminders ADD COLUMN is_all_day INTEGER NOT NULL DEFAULT 0",
    )?;
    add_column(
        "completion_date",
        "ALTER TABLE reminders ADD COLUMN completion_date TEXT",
    )?;
    add_column("alarm_at", "ALTER TABLE reminders ADD COLUMN alarm_at TEXT")?;
    add_column(
        "recurrence_frequency",
        "ALTER TABLE reminders ADD COLUMN recurrence_frequency TEXT",
    )?;
    add_column(
        "recurrence_interval",
        "ALTER TABLE reminders ADD COLUMN recurrence_interval INTEGER",
    )?;
    add_column(
        "location_address",
        "ALTER TABLE reminders ADD COLUMN location_address TEXT",
    )?;
    add_column(
        "location_latitude",
        "ALTER TABLE reminders ADD COLUMN location_latitude REAL",
    )?;
    add_column(
        "location_longitude",
        "ALTER TABLE reminders ADD COLUMN location_longitude REAL",
    )?;
    add_column(
        "location_radius",
        "ALTER TABLE reminders ADD COLUMN location_radius REAL",
    )?;
    add_column(
        "location_proximity",
        "ALTER TABLE reminders ADD COLUMN location_proximity TEXT",
    )?;
    add_column(
        "owner_id",
        "ALTER TABLE reminders ADD COLUMN owner_id TEXT REFERENCES owners(id) ON DELETE SET NULL",
    )?;

    Ok(())
}

fn table_columns(conn: &Connection, table: &str) -> Result<Vec<String>> {
    let mut stmt = conn.prepare(&format!("PRAGMA table_info({table})"))?;
    let columns = stmt
        .query_map([], |row| row.get::<_, String>(1))?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(columns)
}

pub fn insert_initial_data(conn: &Connection) -> Result<()> {
    let owner_count: i64 = conn.query_row("SELECT COUNT(*) FROM owners", [], |row| row.get(0))?;
    if owner_count == 0 {
        conn.execute(
            "INSERT INTO owners (id, name, color) VALUES (?, ?, ?)",
            (DEFAULT_OWNER_ID, "我", "#5856D6"),
        )?;
        conn.execute(
            "INSERT INTO owners (id, name, color) VALUES (?, ?, ?)",
            (OWNER_2_ID, "张三", "#FF9500"),
        )?;
        conn.execute(
            "INSERT INTO owners (id, name, color) VALUES (?, ?, ?)",
            (OWNER_3_ID, "李四", "#4CD964"),
        )?;
    }

    let list_count: i64 =
        conn.query_row("SELECT COUNT(*) FROM reminder_lists", [], |row| row.get(0))?;
    if list_count == 0 {
        conn.execute(
            "INSERT INTO reminder_lists (id, name, color, icon) VALUES (?, ?, ?, ?)",
            (DEFAULT_LIST_ID, "提醒事项", "#007AFF", "list"),
        )?;
        conn.execute(
            "INSERT INTO reminder_lists (id, name, color, icon) VALUES (?, ?, ?, ?)",
            (WORK_LIST_ID, "工作", "#FF9500", "briefcase"),
        )?;
        conn.execute(
            "INSERT INTO reminder_lists (id, name, color, icon) VALUES (?, ?, ?, ?)",
            (PERSONAL_LIST_ID, "个人", "#4CD964", "user"),
        )?;
    }

    let reminder_count: i64 =
        conn.query_row("SELECT COUNT(*) FROM reminders", [], |row| row.get(0))?;
    if reminder_count == 0 {
        use chrono::Local;
        let now = Local::now().to_rfc3339();
        let today = Local::now().date_naive().format("%Y-%m-%d").to_string();

        conn.execute(
            "INSERT INTO reminders (id, title, description, due_date, due_time, is_completed, priority, list_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                Uuid::new_v4().to_string(),
                "买酸奶",
                Some("记得买低糖的".to_string()),
                Some(today.clone()),
                Some("14:00:00".to_string()),
                0,
                "none",
                Some(DEFAULT_LIST_ID.to_string()),
                &now,
                &now,
            ),
        )?;
        conn.execute(
            "INSERT INTO reminders (id, title, description, due_date, due_time, is_completed, priority, list_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                Uuid::new_v4().to_string(),
                "完成项目设计",
                None::<String>,
                None::<String>,
                None::<String>,
                0,
                "medium",
                Some(DEFAULT_LIST_ID.to_string()),
                &now,
                &now,
            ),
        )?;
        conn.execute(
            "INSERT INTO reminders (id, title, description, due_date, due_time, is_completed, priority, list_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                Uuid::new_v4().to_string(),
                "参加会议",
                None::<String>,
                Some(today),
                Some("09:00:00".to_string()),
                0,
                "high",
                Some(WORK_LIST_ID.to_string()),
                &now,
                &now,
            ),
        )?;
    }

    Ok(())
}