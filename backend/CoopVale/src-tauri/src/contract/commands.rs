use crate::auth::session::AuthState;
use crate::contract::model::{Contract, ContractData};
use crate::contract::service;
use crate::db;
use tauri::State;

#[tauri::command]
pub fn create_contract(auth: State<AuthState>, data: ContractData) -> Result<Contract, String> {
    auth.require_authenticated()?;
    let conn = db::connect().map_err(|e| e.to_string())?;
    service::create(&conn, data)
}

#[tauri::command]
pub fn update_contract(auth: State<AuthState>, id: i32, data: ContractData) -> Result<Contract, String> {
    auth.require_authenticated()?;
    let conn = db::connect().map_err(|e| e.to_string())?;
    service::update(&conn, id, data)
}

#[tauri::command]
pub fn delete_contract(auth: State<AuthState>, id: i32) -> Result<(), String> {
    auth.require_authenticated()?;
    let conn = db::connect().map_err(|e| e.to_string())?;
    service::delete(&conn, id)
}

#[tauri::command]
pub fn get_contract(auth: State<AuthState>, id: i32) -> Result<Option<Contract>, String> {
    auth.require_authenticated()?;
    let conn = db::connect().map_err(|e| e.to_string())?;
    service::get_by_id(&conn, id)
}

#[tauri::command]
pub fn list_contracts(auth: State<AuthState>) -> Result<Vec<Contract>, String> {
    auth.require_authenticated()?;
    let conn = db::connect().map_err(|e| e.to_string())?;
    service::list_all(&conn)
}

#[tauri::command]
pub fn list_contracts_by_institution(auth: State<AuthState>, institution_id: i32) -> Result<Vec<Contract>, String> {
    auth.require_authenticated()?;
    let conn = db::connect().map_err(|e| e.to_string())?;
    service::list_by_institution(&conn, institution_id)
}