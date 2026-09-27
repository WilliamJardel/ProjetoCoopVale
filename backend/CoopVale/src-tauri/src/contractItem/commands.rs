use crate::auth::session::AuthState;
use crate::contractItem::model::{ContractItem, ContractItemData};
use crate::contractItem::service;
use crate::db;
use tauri::State;

#[tauri::command]
pub fn create_contract_item(
	auth: State<AuthState>,
	data: ContractItemData,
) -> Result<ContractItem, String> {
	auth.require_authenticated()?;
	let conn = db::connect().map_err(|e| e.to_string())?;
	service::create(&conn, data)
}

#[tauri::command]
pub fn update_contract_item(
	auth: State<AuthState>,
	id: i32,
	data: ContractItemData,
) -> Result<ContractItem, String> {
	auth.require_authenticated()?;
	let conn = db::connect().map_err(|e| e.to_string())?;
	service::update(&conn, id, data)
}

#[tauri::command]
pub fn delete_contract_item(auth: State<AuthState>, id: i32) -> Result<(), String> {
	auth.require_authenticated()?;
	let conn = db::connect().map_err(|e| e.to_string())?;
	service::delete(&conn, id)
}

#[tauri::command]
pub fn get_contract_item(
	auth: State<AuthState>,
	id: i32,
) -> Result<Option<ContractItem>, String> {
	auth.require_authenticated()?;
	let conn = db::connect().map_err(|e| e.to_string())?;
	service::get_by_id(&conn, id)
}

#[tauri::command]
pub fn list_contract_items(auth: State<AuthState>) -> Result<Vec<ContractItem>, String> {
	auth.require_authenticated()?;
	let conn = db::connect().map_err(|e| e.to_string())?;
	service::list_all(&conn)
}

#[tauri::command]
pub fn list_contract_items_by_contract(
	auth: State<AuthState>,
	contract_id: i32,
) -> Result<Vec<ContractItem>, String> {
	auth.require_authenticated()?;
	let conn = db::connect().map_err(|e| e.to_string())?;
	service::list_by_contract(&conn, contract_id)
}

#[tauri::command]
pub fn register_item_delivery(
	auth: State<AuthState>,
	id: i32,
	quantity: i32,
) -> Result<ContractItem, String> {
	auth.require_authenticated()?;
	let conn = db::connect().map_err(|e| e.to_string())?;
	service::register_delivery(&conn, id, quantity)
}
