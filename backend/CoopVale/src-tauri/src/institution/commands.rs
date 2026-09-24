use crate::auth::session::AuthState;
use crate::db;
use crate::institution::model::Institution;
use crate::institution::service;
use tauri::State;

#[tauri::command]
pub fn create_institution(
    auth: State<AuthState>,
    institution: Institution,
) -> Result<Institution, String> {
    auth.require_authenticated()?;
    let conn = db::connect().map_err(|e| e.to_string())?;
    service::create(&conn, institution)
}

#[tauri::command]
pub fn update_institution(
    auth: State<AuthState>,
    institution: Institution,
) -> Result<Institution, String> {
    auth.require_authenticated()?;
    let conn = db::connect().map_err(|e| e.to_string())?;
    service::update(&conn, institution)
}

#[tauri::command]
pub fn delete_institution(auth: State<AuthState>, id: i32) -> Result<(), String> {
    auth.require_authenticated()?;
    let conn = db::connect().map_err(|e| e.to_string())?;
    service::delete(&conn, id)
}

#[tauri::command]
pub fn get_institution(auth: State<AuthState>, id: i32) -> Result<Option<Institution>, String> {
    auth.require_authenticated()?;
    let conn = db::connect().map_err(|e| e.to_string())?;
    service::get_by_id(&conn, id)
}

#[tauri::command]
pub fn list_institutions(auth: State<AuthState>) -> Result<Vec<Institution>, String> {
    auth.require_authenticated()?;
    let conn = db::connect().map_err(|e| e.to_string())?;
    service::list_all(&conn)
}