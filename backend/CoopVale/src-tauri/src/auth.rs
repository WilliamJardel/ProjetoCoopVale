use serde::{Deserialize, Serialize};
use rusqlite::params;
use crate::db;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct UserSession {
    pub id: i64,
    pub name: String,
    pub email: String,
}

#[tauri::command]
pub async fn login(email: String, password: String) -> Result<UserSession, String> {
    let conn = db::connect().map_err(|e| db::error_message(e))?;

    let mut stmt = conn
        .prepare("SELECT id, name, email FROM user WHERE email = ?1 AND password = ?2")
        .map_err(|e| db::error_message(e))?;

    let user = stmt
        .query_row(params![email, password], |row| {
            Ok(UserSession {
                id: row.get(0)?,
                name: row.get(1)?,
                email: row.get(2)?,
            })
        })
        .map_err(|_| "E-mail ou senha incorretos.".to_string())?;

    Ok(user)
}

#[tauri::command]
pub async fn logout() -> Result<(), String> {
    Ok(())
}

#[tauri::command]
pub async fn current_session() -> Result<Option<UserSession>, String> {
    Ok(None)
}