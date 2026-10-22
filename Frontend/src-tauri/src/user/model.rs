use serde:: {Deserialize, Serialize};
use rusqlite:: {Connection, Result, Row};
use bcrypt::{hash, verify, DEFAULT_COST};
use chrono::Utc;

#[derive(Debug, Serialize, Deserialize)]
pub struct User {
    pub id: Option<i32>,
    pub name: String,
    pub email: String,
    #[serde(skip_serializing)]
    pub password: String,
    pub created_at: Option<String>,
}

impl User {
pub fn new(name: &str, email: &str, raw_password: &str) -> Result<Self, bcrypt::BcryptError> {
        let hashed = hash(raw_password, DEFAULT_COST)?;
        Ok(User {
            id: None,
            name: name.to_string(),
            email: email.to_string(),
            password: hashed,
            created_at: Some(Utc::now().to_rfc3339()),
        })
    }

pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
    Ok(User {
        id: row.get(0)?,
        name: row.get(1)?,
        email: row.get(2)?,
        password: row.get(3)?,
        created_at: row.get(4)?,
    })
}

pub fn verify_password(&self, raw_password: &str) -> bool {
    verify(raw_password, &self.password).unwrap_or(false)
}
}