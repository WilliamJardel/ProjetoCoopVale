use crate::db;
use crate::user::service;    
use crate::user::model::User;

#[tauri::command]
pub fn register_user(name: String, email: String, password: String) -> Result<i32, String> {
    let conn = db::connect().map_err(|e| e.to_string())?;
    service::register(&conn, &name, &email, &password)
}

#[tauri::command]
pub fn authenticate_user(email: String, password: String) -> Result<bool, String> {
    let conn = db::connect().map_err(|e| e.to_string())?;
    let user_opt = service::authenticate(&conn, &email, &password)?;
    Ok(user_opt.is_some()) 
}

#[tauri::command]
pub fn get_user(id: i32) -> Result<Option<User>, String> {
    let conn = db::connect().map_err(|e| e.to_string())?;
    service::get_by_id(&conn, id)
}

#[tauri::command]
pub fn list_users() -> Result<Vec<User>, String> {
    let conn = db::connect().map_err(|e| e.to_string())?;
    service::list_all(&conn)
}