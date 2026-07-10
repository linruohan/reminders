use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Owner {
    pub id: Uuid,
    pub name: String,
    pub color: String,
}

impl Owner {
    pub fn new(name: String) -> Self {
        Self {
            id: Uuid::new_v4(),
            name,
            color: "#5856D6".to_string(),
        }
    }

    pub fn with_color(mut self, color: String) -> Self {
        self.color = color;
        self
    }
}