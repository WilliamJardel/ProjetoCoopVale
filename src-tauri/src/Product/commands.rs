use crate::auth::session::AuthState;
use crate::db;
use crate::Product::model::{Product, ProductData};
use crate::Product::service;
use tauri::State;

#[tauri::command]
pub fn create_product(auth: State<AuthState>, data: ProductData) -> Result<Product, String> {
    auth.require_authenticated()?;
    let conn = db::connect().map_err(|e| e.to_string())?;
    service::create(&conn, data)
}

#[tauri::command]
pub fn update_product(auth: State<AuthState>, id: i32, data: ProductData) -> Result<Product, String> {
    auth.require_authenticated()?;
    let conn = db::connect().map_err(|e| e.to_string())?;
    service::update(&conn, id, data)
}

#[tauri::command]
pub fn deactivate_product(auth: State<AuthState>, id: i32) -> Result<Product, String> {
    auth.require_authenticated()?;
    let conn = db::connect().map_err(|e| e.to_string())?;
    service::deactivate(&conn, id)
}

#[tauri::command]
pub fn get_product(auth: State<AuthState>, id: i32) -> Result<Option<Product>, String> {
    auth.require_authenticated()?;
    let conn = db::connect().map_err(|e| e.to_string())?;
    service::get_by_id(&conn, id)
}

#[tauri::command]
pub fn list_products(auth: State<AuthState>) -> Result<Vec<Product>, String> {
    auth.require_authenticated()?;
    let conn = db::connect().map_err(|e| e.to_string())?;
    service::list_all(&conn)
}
