use crate::auth::session::AuthState;
use crate::db;
use crate::invoice::model::{Invoice, InvoiceCheck, InvoiceData, InvoiceStatus};
use crate::invoice::service;
use tauri::State;

#[tauri::command]
pub fn register_invoice(
    auth: State<AuthState>,
    payment_id: i32,
    data: InvoiceData,
) -> Result<InvoiceCheck, String> {
    auth.require_authenticated()?;
    let mut conn = db::connect().map_err(|e| e.to_string())?;
    service::register(&mut conn, payment_id, data)
}

#[tauri::command]
pub fn update_invoice(
    auth: State<AuthState>,
    payment_id: i32,
    data: InvoiceData,
) -> Result<InvoiceCheck, String> {
    auth.require_authenticated()?;
    let mut conn = db::connect().map_err(|e| e.to_string())?;
    service::update(&mut conn, payment_id, data)
}

#[tauri::command]
pub fn remove_invoice(auth: State<AuthState>, payment_id: i32) -> Result<Invoice, String> {
    auth.require_authenticated()?;
    let mut conn = db::connect().map_err(|e| e.to_string())?;
    service::remove(&mut conn, payment_id)
}

#[tauri::command]
pub fn get_invoice(auth: State<AuthState>, payment_id: i32) -> Result<Option<Invoice>, String> {
    auth.require_authenticated()?;
    let conn = db::connect().map_err(|e| e.to_string())?;
    service::get_by_payment(&conn, payment_id)
}

#[tauri::command]
pub fn list_invoices(
    auth: State<AuthState>,
    status: Option<InvoiceStatus>,
) -> Result<Vec<Invoice>, String> {
    auth.require_authenticated()?;
    let conn = db::connect().map_err(|e| e.to_string())?;
    service::list(&conn, status)
}

#[tauri::command]
pub fn list_invoices_by_contract(
    auth: State<AuthState>,
    contract_id: i32,
) -> Result<Vec<Invoice>, String> {
    auth.require_authenticated()?;
    let conn = db::connect().map_err(|e| e.to_string())?;
    service::list_by_contract(&conn, contract_id)
}