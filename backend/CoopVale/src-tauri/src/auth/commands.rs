use tauri::State;
use crate::db;
use crate::auth::session::{AuthState, Session};
use crate::auth::rate_limit::LoginAttempts;
use crate::auth::service;

#[tauri::command]
pub fn login(
    email: String,
    password: String,
    auth_state: State<AuthState>,
    login_attempts: State<LoginAttempts>,
) -> Result<Session, String> {
    let conn = db::connect().map_err(|e| e.to_string())?;
    let session = service::login(&conn, &login_attempts, &email, &password)?;

    *auth_state.0.lock().unwrap() = Some(session.clone());
    Ok(session)
}

#[tauri::command]
pub fn logout(auth_state: State<AuthState>) -> Result<(), String> {
    *auth_state.0.lock().unwrap() = None;
    Ok(())
}

#[tauri::command]
pub fn current_session(auth_state: State<AuthState>) -> Option<Session> {
    auth_state.0.lock().unwrap().clone()
}

#[tauri::command]
pub fn is_authenticated(auth_state: State<AuthState>) -> bool {
    auth_state.0.lock().unwrap().is_some()
}