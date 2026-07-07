use rusqlite::{Connection, Result};

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
        r#"CREATE TABLE IF NOT EXISTS reminders (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            due_date TEXT,
            due_time TEXT,
            is_completed INTEGER NOT NULL DEFAULT 0,
            priority TEXT NOT NULL DEFAULT 'medium',
            list_id TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (list_id) REFERENCES reminder_lists(id) ON DELETE CASCADE
        )"#,
        [],
    )?;

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

    Ok(())
}

pub fn insert_initial_data(conn: &Connection) -> Result<()> {
    let list_count: i64 =
        conn.query_row("SELECT COUNT(*) FROM reminder_lists", [], |row| row.get(0))?;
    if list_count == 0 {
        conn.execute(
            "INSERT INTO reminder_lists (id, name, color, icon) VALUES (?, ?, ?, ?)",
            (
                &"default-list".to_string(),
                &"提醒事项".to_string(),
                &"#007AFF".to_string(),
                &"list".to_string(),
            ),
        )?;
        conn.execute(
            "INSERT INTO reminder_lists (id, name, color, icon) VALUES (?, ?, ?, ?)",
            (
                &"work-list".to_string(),
                &"工作".to_string(),
                &"#FF9500".to_string(),
                &"briefcase".to_string(),
            ),
        )?;
        conn.execute(
            "INSERT INTO reminder_lists (id, name, color, icon) VALUES (?, ?, ?, ?)",
            (
                &"personal-list".to_string(),
                &"个人".to_string(),
                &"#4CD964".to_string(),
                &"user".to_string(),
            ),
        )?;
    }

    let reminder_count: i64 =
        conn.query_row("SELECT COUNT(*) FROM reminders", [], |row| row.get(0))?;
    if reminder_count == 0 {
        use chrono::Local;
        let now = Local::now().to_rfc3339();
        conn.execute(
            "INSERT INTO reminders (id, title, description, due_date, due_time, is_completed, priority, list_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (&"reminder-1".to_string(), &"完成项目设计".to_string(), &None::<String>, &None::<String>, &None::<String>, &0, &"medium".to_string(), &Some("default-list".to_string()), &now, &now),
        )?;
        conn.execute(
            "INSERT INTO reminders (id, title, description, due_date, due_time, is_completed, priority, list_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (&"reminder-2".to_string(), &"购买生活用品".to_string(), &None::<String>, &None::<String>, &None::<String>, &0, &"low".to_string(), &Some("default-list".to_string()), &now, &now),
        )?;
        conn.execute(
            "INSERT INTO reminders (id, title, description, due_date, due_time, is_completed, priority, list_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (&"reminder-3".to_string(), &"参加会议".to_string(), &None::<String>, &None::<String>, &None::<String>, &0, &"high".to_string(), &Some("work-list".to_string()), &now, &now),
        )?;
    }

    Ok(())
}
