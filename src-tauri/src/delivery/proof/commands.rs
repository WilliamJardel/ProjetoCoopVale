use crate::auth::session::AuthState;
use crate::db;
use crate::delivery::proof::model::{DeliveryProof, DeliveryProofData, DeliveryProofMetadata};
use crate::delivery::proof::service;
use tauri::State;

#[tauri::command]
pub fn upload_delivery_proof(
    auth: State<AuthState>,
    data: DeliveryProofData,
) -> Result<DeliveryProofMetadata, String> {
    auth.require_authenticated()?;
    let conn = db::connect().map_err(|error| error.to_string())?;
    service::upload(&conn, data)
}

#[tauri::command]
pub fn get_delivery_proof(
    auth: State<AuthState>,
    id: i32,
) -> Result<Option<DeliveryProof>, String> {
    auth.require_authenticated()?;
    let conn = db::connect().map_err(|error| error.to_string())?;
    service::get(&conn, id)
}

#[tauri::command]
pub fn list_delivery_proofs(
    auth: State<AuthState>,
    delivery_id: i32,
) -> Result<Vec<DeliveryProofMetadata>, String> {
    auth.require_authenticated()?;
    let conn = db::connect().map_err(|error| error.to_string())?;
    service::list_by_delivery(&conn, delivery_id)
}

#[tauri::command]
pub fn delete_delivery_proof(auth: State<AuthState>, id: i32) -> Result<(), String> {
    auth.require_authenticated()?;
    let conn = db::connect().map_err(|error| error.to_string())?;
    service::delete(&conn, id)
}
