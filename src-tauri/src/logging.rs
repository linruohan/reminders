use std::fs::{self, File, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use chrono::Local;

const MAX_LOG_BYTES: u64 = 5 * 1024 * 1024;

static LOG_FILE: Mutex<Option<File>> = Mutex::new(None);

/// Windows: `%LOCALAPPDATA%\reminders\run.log`
/// Linux: `~/.config/reminders/run.log`（尊重 `XDG_CONFIG_HOME`）
pub fn log_path() -> PathBuf {
    #[cfg(windows)]
    {
        let local = std::env::var_os("LOCALAPPDATA")
            .map(PathBuf::from)
            .or_else(|| {
                std::env::var_os("USERPROFILE")
                    .map(|p| PathBuf::from(p).join("AppData").join("Local"))
            })
            .unwrap_or_else(|| PathBuf::from("."));
        local.join("reminders").join("run.log")
    }
    #[cfg(not(windows))]
    {
        let config = std::env::var_os("XDG_CONFIG_HOME")
            .map(PathBuf::from)
            .or_else(|| {
                std::env::var_os("HOME").map(|h| PathBuf::from(h).join(".config"))
            })
            .unwrap_or_else(|| PathBuf::from("."));
        config.join("reminders").join("run.log")
    }
}

pub fn init() {
    let path = log_path();
    if let Some(dir) = path.parent() {
        if let Err(e) = fs::create_dir_all(dir) {
            eprintln!("failed to create log dir {}: {e}", dir.display());
            return;
        }
    }
    maybe_rotate(&path);

    match OpenOptions::new().create(true).append(true).open(&path) {
        Ok(file) => {
            if let Ok(mut guard) = LOG_FILE.lock() {
                *guard = Some(file);
            }
            write_line("INFO", &format!("log file: {}", path.display()));
        }
        Err(e) => {
            eprintln!("failed to open log file {}: {e}", path.display());
        }
    }

    std::panic::set_hook(Box::new(|info| {
        let loc = info
            .location()
            .map(|l| format!("{}:{}:{}", l.file(), l.line(), l.column()))
            .unwrap_or_else(|| "unknown".into());
        let msg = if let Some(s) = info.payload().downcast_ref::<&str>() {
            (*s).to_string()
        } else if let Some(s) = info.payload().downcast_ref::<String>() {
            s.clone()
        } else {
            "Box<dyn Any>".into()
        };
        write_line("ERROR", &format!("panic at {loc}: {msg}"));
    }));
}

pub fn write_line(level: &str, msg: &str) {
    let ts = Local::now().format("%Y-%m-%d %H:%M:%S");
    let line = format!("{ts} [{level}] {msg}\n");
    if let Ok(mut guard) = LOG_FILE.lock() {
        if let Some(file) = guard.as_mut() {
            let _ = file.write_all(line.as_bytes());
            let _ = file.flush();
        }
    }
    #[cfg(debug_assertions)]
    eprint!("{line}");
}

fn maybe_rotate(path: &Path) {
    let Ok(meta) = fs::metadata(path) else {
        return;
    };
    if meta.len() < MAX_LOG_BYTES {
        return;
    }
    let bak = path.with_file_name("run.log.1");
    let _ = fs::remove_file(&bak);
    let _ = fs::rename(path, &bak);
}

#[macro_export]
macro_rules! app_log {
    (info, $($arg:tt)*) => {
        $crate::logging::write_line("INFO", &format!($($arg)*))
    };
    (warn, $($arg:tt)*) => {
        $crate::logging::write_line("WARN", &format!($($arg)*))
    };
    (error, $($arg:tt)*) => {
        $crate::logging::write_line("ERROR", &format!($($arg)*))
    };
}
