use crate::auth::session::AuthState;
use crate::db;
use crate::delivery::model::{Delivery, DeliveryData};
use crate::delivery::service;
use tauri::State;

#[tauri::command]
pub fn create_delivery(
    auth: State<AuthState>,
    data: DeliveryData,
) -> Result<Delivery, String> {
    auth.require_authenticated()?;
    let mut conn = db::connect().map_err(|error| error.to_string())?;
    service::create(&mut conn, data)
}

#[tauri::command]
pub fn update_delivery(
    auth: State<AuthState>,
    id: i32,
    data: DeliveryData,
) -> Result<Delivery, String> {
    auth.require_authenticated()?;
    let mut conn = db::connect().map_err(|error| error.to_string())?;
    service::update(&mut conn, id, data)
}

#[tauri::command]
pub fn delete_delivery(auth: State<AuthState>, id: i32) -> Result<(), String> {
    auth.require_authenticated()?;
    let mut conn = db::connect().map_err(|error| error.to_string())?;
    service::delete(&mut conn, id)
}

#[tauri::command]
pub fn get_delivery(auth: State<AuthState>, id: i32) -> Result<Option<Delivery>, String> {
    auth.require_authenticated()?;
    let conn = db::connect().map_err(|error| error.to_string())?;
    service::get_by_id(&conn, id)
}

#[tauri::command]
pub fn list_deliveries(auth: State<AuthState>) -> Result<Vec<Delivery>, String> {
    auth.require_authenticated()?;
    let conn = db::connect().map_err(|error| error.to_string())?;
    service::list_all(&conn)
}

#[tauri::command]
pub fn list_deliveries_by_contract(
    auth: State<AuthState>,
    contract_id: i32,
) -> Result<Vec<Delivery>, String> {
    auth.require_authenticated()?;
    let conn = db::connect().map_err(|error| error.to_string())?;
    service::list_by_contract(&conn, contract_id)
}
