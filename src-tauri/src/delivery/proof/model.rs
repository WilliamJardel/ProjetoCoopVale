use crate::delivery::model::Delivery;
use rusqlite::{Result, Row};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProofData {
    pub delivery_id: i32,
    pub file_name: String,
    pub mime_type: Option<String>,
    pub content: Vec<u8>,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
pub struct Proof {
    pub id: i32,
    pub delivery_id: i32,
    pub file_name: String,
    pub mime_type: Option<String>,
    pub size_bytes: i64,
    pub created_at: String,
}

impl Proof {
    pub const COLUMNS: &'static str =
        "id, delivery_id, file_name, mime_type, length(content), created_at";

    pub fn from_row(row: &Row) -> Result<Self> {
        Ok(Self {
            id: row.get(0)?,
            delivery_id: row.get(1)?,
            file_name: row.get(2)?,
            mime_type: row.get(3)?,
            size_bytes: row.get(4)?,
            created_at: row.get(5)?,
        })
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProofFile {
    pub proof: Proof,
    pub content: Vec<u8>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DeliveryProofStatus {
    pub delivery: Delivery,
    pub proofs: Vec<Proof>,
    pub status_message: String,
}
