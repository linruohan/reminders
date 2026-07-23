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
            created_date TEXT,
            created_time TEXT,
            end_date TEXT,
            end_time TEXT,
            is_all_day INTEGER NOT NULL DEFAULT 0,
            is_completed INTEGER NOT NULL DEFAULT 0,
            is_flagged INTEGER NOT NULL DEFAULT 0,
            priority TEXT NOT NULL DEFAULT 'none',
            list_id TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            url TEXT,
            completion_date TEXT,
            recurrence_frequency TEXT,
            recurrence_interval INTEGER,
            custom_recurrence_unit TEXT,
            recurrence_end_date TEXT,
            remind_before_value INTEGER,
            remind_before_unit TEXT,
            owner_id TEXT,
            FOREIGN KEY (list_id) REFERENCES reminder_lists(id) ON DELETE SET NULL,
            FOREIGN KEY (owner_id) REFERENCES owners(id) ON DELETE SET NULL
        )"#,
        [],
    )?;

    conn.execute(
        r#"CREATE TABLE IF NOT EXISTS tags (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL UNIQUE
        )"#,
        [],
    )?;

    conn.execute(
        r#"CREATE TABLE IF NOT EXISTS reminder_tags (
            reminder_id TEXT NOT NULL,
            tag_id TEXT NOT NULL,
            PRIMARY KEY (reminder_id, tag_id),
            FOREIGN KEY (reminder_id) REFERENCES reminders(id) ON DELETE CASCADE,
            FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
        )"#,
        [],
    )?;

    migrate_schema(conn)?;

    // 查询主路径：end_date / list / 完成态 / 旗标 / 优先级
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_reminders_end_date_completed ON reminders(end_date, is_completed)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_reminders_list_completed ON reminders(list_id, is_completed)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_reminders_is_completed ON reminders(is_completed)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_reminders_flagged_completed ON reminders(is_flagged, is_completed)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_reminders_priority_completed ON reminders(priority, is_completed)",
        [],
    )?;

    Ok(())
}

fn migrate_schema(conn: &Connection) -> Result<()> {
    // 确保 tags 和 reminder_tags 表存在（旧数据库可能缺少这两张表）
    conn.execute(
        r#"CREATE TABLE IF NOT EXISTS tags (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL UNIQUE
        )"#,
        [],
    )?;
    conn.execute(
        r#"CREATE TABLE IF NOT EXISTS reminder_tags (
            reminder_id TEXT NOT NULL,
            tag_id TEXT NOT NULL,
            PRIMARY KEY (reminder_id, tag_id),
            FOREIGN KEY (reminder_id) REFERENCES reminders(id) ON DELETE CASCADE,
            FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
        )"#,
        [],
    )?;

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
    add_column(
        "recurrence_frequency",
        "ALTER TABLE reminders ADD COLUMN recurrence_frequency TEXT",
    )?;
    add_column(
        "recurrence_interval",
        "ALTER TABLE reminders ADD COLUMN recurrence_interval INTEGER",
    )?;
    add_column(
        "owner_id",
        "ALTER TABLE reminders ADD COLUMN owner_id TEXT REFERENCES owners(id) ON DELETE SET NULL",
    )?;
    add_column(
        "end_date",
        "ALTER TABLE reminders ADD COLUMN end_date TEXT",
    )?;
    add_column(
        "end_time",
        "ALTER TABLE reminders ADD COLUMN end_time TEXT",
    )?;
    add_column(
        "is_flagged",
        "ALTER TABLE reminders ADD COLUMN is_flagged INTEGER NOT NULL DEFAULT 0",
    )?;
    add_column(
        "custom_recurrence_unit",
        "ALTER TABLE reminders ADD COLUMN custom_recurrence_unit TEXT",
    )?;
    add_column(
        "recurrence_end_date",
        "ALTER TABLE reminders ADD COLUMN recurrence_end_date TEXT",
    )?;
    add_column(
        "remind_before_value",
        "ALTER TABLE reminders ADD COLUMN remind_before_value INTEGER",
    )?;
    add_column(
        "remind_before_unit",
        "ALTER TABLE reminders ADD COLUMN remind_before_unit TEXT",
    )?;

    // 重命名 due_date/due_time → created_date/created_time
    // 语义变更：创建时自动记录，用户不再手动设置
    let cols = table_columns(conn, "reminders")?;
    if cols.iter().any(|c| c == "due_date") && !cols.iter().any(|c| c == "created_date") {
        conn.execute("ALTER TABLE reminders RENAME COLUMN due_date TO created_date", [])?;
    }
    if cols.iter().any(|c| c == "due_time") && !cols.iter().any(|c| c == "created_time") {
        conn.execute("ALTER TABLE reminders RENAME COLUMN due_time TO created_time", [])?;
    }

    // 一次性：将迁移前存于 created_* 的截止日期回填到 end_*
    conn.execute(
        r#"CREATE TABLE IF NOT EXISTS schema_migrations (
            id TEXT PRIMARY KEY,
            applied_at TEXT NOT NULL
        )"#,
        [],
    )?;
    let backfill_done: bool = conn
        .query_row(
            "SELECT 1 FROM schema_migrations WHERE id = 'backfill_end_date_from_created'",
            [],
            |_| Ok(true),
        )
        .unwrap_or(false);
    if !backfill_done {
        conn.execute(
            "UPDATE reminders SET end_date = created_date, end_time = created_time \
             WHERE end_date IS NULL AND created_date IS NOT NULL",
            [],
        )?;
        conn.execute(
            "INSERT INTO schema_migrations (id, applied_at) VALUES ('backfill_end_date_from_created', datetime('now'))",
            [],
        )?;
    }

    // 一次性：丢弃以 created_date 为主的旧索引，改为 end_date 复合索引
    let index_cleanup_done: bool = conn
        .query_row(
            "SELECT 1 FROM schema_migrations WHERE id = 'indexes_end_date_v1'",
            [],
            |_| Ok(true),
        )
        .unwrap_or(false);
    if !index_cleanup_done {
        for idx in [
            "idx_reminders_created_date",
            "idx_reminders_created_date_completed",
            "idx_reminders_list_id",
            "idx_reminders_end_date",
        ] {
            conn.execute(&format!("DROP INDEX IF EXISTS {idx}"), [])?;
        }
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_reminders_end_date_completed ON reminders(end_date, is_completed)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_reminders_flagged_completed ON reminders(is_flagged, is_completed)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_reminders_priority_completed ON reminders(priority, is_completed)",
            [],
        )?;
        conn.execute(
            "INSERT INTO schema_migrations (id, applied_at) VALUES ('indexes_end_date_v1', datetime('now'))",
            [],
        )?;
    }

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
        let created_time = Local::now().time().format("%H:%M:%S").to_string();

        // created_* = 记录创建戳；end_* = 用户截止日期（驱动今天/计划/逾期与日历）
        conn.execute(
            "INSERT INTO reminders (id, title, description, created_date, created_time, end_date, end_time, is_all_day, is_completed, priority, list_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                Uuid::new_v4().to_string(),
                "买酸奶",
                Some("记得买低糖的".to_string()),
                Some(today.clone()),
                Some(created_time.clone()),
                Some(today.clone()),
                Some("14:00:00".to_string()),
                0,
                0,
                "none",
                Some(DEFAULT_LIST_ID.to_string()),
                &now,
                &now,
            ),
        )?;
        conn.execute(
            "INSERT INTO reminders (id, title, description, created_date, created_time, end_date, end_time, is_all_day, is_completed, priority, list_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                Uuid::new_v4().to_string(),
                "完成项目设计",
                None::<String>,
                Some(today.clone()),
                Some(created_time.clone()),
                None::<String>,
                None::<String>,
                0,
                0,
                "medium",
                Some(DEFAULT_LIST_ID.to_string()),
                &now,
                &now,
            ),
        )?;
        conn.execute(
            "INSERT INTO reminders (id, title, description, created_date, created_time, end_date, end_time, is_all_day, is_completed, priority, list_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                Uuid::new_v4().to_string(),
                "参加会议",
                None::<String>,
                Some(today.clone()),
                Some(created_time),
                Some(today),
                Some("09:00:00".to_string()),
                0,
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