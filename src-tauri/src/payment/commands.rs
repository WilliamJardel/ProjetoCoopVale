use crate::auth::session::AuthState;
use crate::db;
use crate::payment::model::{ContractBalance, Payment, PaymentData};
use crate::payment::service;
use tauri::State;

#[tauri::command]
pub fn create_payment(auth: State<AuthState>, data: PaymentData) -> Result<Payment, String> {
    auth.require_authenticated()?;
    let mut conn = db::connect().map_err(|e| e.to_string())?;
    service::create(&mut conn, data)
}

#[tauri::command]
pub fn update_payment(auth: State<AuthState>, id: i32, data: PaymentData) -> Result<Payment, String> {
    auth.require_authenticated()?;
    let mut conn = db::connect().map_err(|e| e.to_string())?;
    service::update(&mut conn, id, data)
}

#[tauri::command]
pub fn delete_payment(auth: State<AuthState>, id: i32) -> Result<(), String> {
    auth.require_authenticated()?;
    let conn = db::connect().map_err(|e| e.to_string())?;
    service::delete(&conn, id)
}

#[tauri::command]
pub fn get_payment(auth: State<AuthState>, id: i32) -> Result<Option<Payment>, String> {
    auth.require_authenticated()?;
    let conn = db::connect().map_err(|e| e.to_string())?;
    service::get_by_id(&conn, id)
}

#[tauri::command]
pub fn list_payments(auth: State<AuthState>) -> Result<Vec<Payment>, String> {
    auth.require_authenticated()?;
    let conn = db::connect().map_err(|e| e.to_string())?;
    service::list_all(&conn)
}

#[tauri::command]
pub fn list_payments_by_contract(auth: State<AuthState>, contract_id: i32) -> Result<Vec<Payment>, String> {
    auth.require_authenticated()?;
    let conn = db::connect().map_err(|e| e.to_string())?;
    service::list_by_contract(&conn, contract_id)
}

#[tauri::command]
pub fn get_contract_balance(auth: State<AuthState>, contract_id: i32) -> Result<ContractBalance, String> {
    auth.require_authenticated()?;
    let conn = db::connect().map_err(|e| e.to_string())?;
    service::get_contract_balance(&conn, contract_id)
}