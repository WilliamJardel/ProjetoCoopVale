use rusqlite::{Result, Row};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DeliveryProofData {
    pub delivery_id: i32,
    pub file_name: String,
    pub mime_type: Option<String>,
    pub content: Vec<u8>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DeliveryProofMetadata {
    pub id: i32,
    pub delivery_id: i32,
    pub file_name: String,
    pub mime_type: Option<String>,
    pub created_at: String,
}

impl DeliveryProofMetadata {
    pub const COLUMNS: &'static str =
        "id, delivery_id, file_name, mime_type, created_at";

    pub fn from_row(row: &Row) -> Result<Self> {
        Ok(Self {
            id: row.get(0)?,
            delivery_id: row.get(1)?,
            file_name: row.get(2)?,
            mime_type: row.get(3)?,
            created_at: row.get(4)?,
        })
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DeliveryProof {
    pub id: i32,
    pub delivery_id: i32,
    pub file_name: String,
    pub mime_type: Option<String>,
    pub content: Vec<u8>,
    pub created_at: String,
}

impl DeliveryProof {
    pub fn from_row(row: &Row) -> Result<Self> {
        Ok(Self {
            id: row.get(0)?,
            delivery_id: row.get(1)?,
            file_name: row.get(2)?,
            mime_type: row.get(3)?,
            content: row.get(4)?,
            created_at: row.get(5)?,
        })
    }
}
