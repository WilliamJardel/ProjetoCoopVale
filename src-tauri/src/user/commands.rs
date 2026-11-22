use crate::db;
use crate::user::service;    
use crate::user::model::User;
use crate::auth::session::{AuthState, Session};
use tauri::State;

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

#[tauri::command]
pub fn update_profile_name(auth: State<AuthState>, name: String) -> Result<Session, String> {
    let active_session = auth.require_authenticated()?;
    let conn = db::connect().map_err(|e| e.to_string())?;
    let updated_name = service::update_name(&conn, active_session.user_id, &name)?;

    let mut state = auth.0.lock().map_err(|_| "Erro interno ao atualizar a sessão".to_string())?;
    let session = state
        .as_mut()
        .filter(|session| session.user_id == active_session.user_id)
        .ok_or_else(|| "A sessão expirou. Entre novamente.".to_string())?;
    session.name = updated_name;
    Ok(session.clone())
}

#[tauri::command]
pub fn change_password(
    auth: State<AuthState>,
    current_password: String,
    new_password: String,
) -> Result<(), String> {
    let active_session = auth.require_authenticated()?;
    let conn = db::connect().map_err(|e| e.to_string())?;
    service::change_password(
        &conn,
        active_session.user_id,
        &current_password,
        &new_password,
    )
}
