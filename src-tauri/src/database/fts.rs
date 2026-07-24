//! 提醒全文搜索（FTS5）：索引标题 / 备注 / URL / 标签名

use rusqlite::{params, Connection, Result};

pub fn ensure_fts(conn: &Connection) -> Result<()> {
    conn.execute(
        r#"CREATE VIRTUAL TABLE IF NOT EXISTS reminders_fts USING fts5(
            reminder_id UNINDEXED,
            title,
            description,
            url,
            tags,
            tokenize = 'unicode61'
        )"#,
        [],
    )?;

    let done: bool = conn
        .query_row(
            "SELECT 1 FROM schema_migrations WHERE id = 'reminders_fts_v1'",
            [],
            |_| Ok(true),
        )
        .unwrap_or(false);

    if !done {
        conn.execute(
            r#"CREATE TABLE IF NOT EXISTS schema_migrations (
                id TEXT PRIMARY KEY,
                applied_at TEXT NOT NULL
            )"#,
            [],
        )?;
        // 全量重建索引
        conn.execute("DELETE FROM reminders_fts", [])?;
        let mut stmt = conn.prepare(
            "SELECT id, IFNULL(title,''), IFNULL(description,''), IFNULL(url,'') FROM reminders",
        )?;
        let rows = stmt.query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
            ))
        })?;
        for row in rows {
            let (id, title, description, url) = row?;
            let tags = tag_blob(conn, &id)?;
            conn.execute(
                "INSERT INTO reminders_fts(reminder_id, title, description, url, tags) VALUES (?1, ?2, ?3, ?4, ?5)",
                params![id, title, description, url, tags],
            )?;
        }
        conn.execute(
            "INSERT OR IGNORE INTO schema_migrations (id, applied_at) VALUES ('reminders_fts_v1', datetime('now'))",
            [],
        )?;
    }

    Ok(())
}

fn tag_blob(conn: &Connection, reminder_id: &str) -> Result<String> {
    let mut stmt = conn.prepare(
        "SELECT t.name FROM tags t INNER JOIN reminder_tags rt ON t.id = rt.tag_id WHERE rt.reminder_id = ?",
    )?;
    let names = stmt.query_map([reminder_id], |row| row.get::<_, String>(0))?;
    let mut parts = Vec::new();
    for name in names {
        parts.push(name?);
    }
    Ok(parts.join(" "))
}

pub fn upsert_reminder(conn: &Connection, reminder_id: &str) -> Result<()> {
    let (title, description, url): (String, String, String) = conn.query_row(
        "SELECT IFNULL(title,''), IFNULL(description,''), IFNULL(url,'') FROM reminders WHERE id = ?",
        [reminder_id],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
    )?;
    let tags = tag_blob(conn, reminder_id)?;
    conn.execute(
        "DELETE FROM reminders_fts WHERE reminder_id = ?",
        [reminder_id],
    )?;
    conn.execute(
        "INSERT INTO reminders_fts(reminder_id, title, description, url, tags) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![reminder_id, title, description, url, tags],
    )?;
    Ok(())
}

pub fn delete_reminder(conn: &Connection, reminder_id: &str) -> Result<()> {
    conn.execute(
        "DELETE FROM reminders_fts WHERE reminder_id = ?",
        [reminder_id],
    )?;
    Ok(())
}

/// 将用户输入转为 FTS5 MATCH 表达式；无法构建时返回 None（调用方回退 LIKE）
pub fn build_match_query(raw: &str) -> Option<String> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return None;
    }
    // 去掉 FTS 特殊字符，按空白切词；无空白时整段作为短语（利于中文）
    let sanitized: String = trimmed
        .chars()
        .map(|c| match c {
            '"' | '*' | '(' | ')' | ':' | '^' => ' ',
            _ => c,
        })
        .collect();
    let terms: Vec<String> = sanitized
        .split_whitespace()
        .filter(|t| !t.is_empty())
        .map(|t| format!("\"{}\"", t.replace('"', "")))
        .collect();
    if terms.is_empty() {
        let phrase = sanitized.replace('"', "").trim().to_string();
        if phrase.is_empty() {
            return None;
        }
        return Some(format!("\"{phrase}\""));
    }
    Some(terms.join(" AND "))
}
