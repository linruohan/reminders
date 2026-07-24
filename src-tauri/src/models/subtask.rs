use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Subtask {
    pub id: Uuid,
    pub reminder_id: Uuid,
    pub title: String,
    pub is_completed: bool,
    pub sort_order: i32,
}
