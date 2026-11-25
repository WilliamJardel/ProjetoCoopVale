use crate::auth::session::AuthState;
use crate::db;
use crate::delivery::proof::model::{DeliveryProofStatus, Proof, ProofData, ProofFile};
use crate::delivery::proof::service;
use tauri::State;

#[tauri::command]
pub fn upload_delivery_proof(auth: State<AuthState>, data: ProofData) -> Result<Proof, String> {
    auth.require_authenticated()?;
    let conn = db::connect().map_err(|error| error.to_string())?;
    service::create(&conn, data)
}

#[tauri::command]
pub fn get_delivery_proof(auth: State<AuthState>, id: i32) -> Result<Option<ProofFile>, String> {
    auth.require_authenticated()?;
    let conn = db::connect().map_err(|error| error.to_string())?;
    service::get_file(&conn, id)
}

#[tauri::command]
pub fn list_delivery_proofs(
    auth: State<AuthState>,
) -> Result<Vec<DeliveryProofStatus>, String> {
    auth.require_authenticated()?;
    let conn = db::connect().map_err(|error| error.to_string())?;
    service::list_deliveries_with_proofs(&conn)
}

#[tauri::command]
pub fn delete_delivery_proof(auth: State<AuthState>, id: i32) -> Result<(), String> {
    auth.require_authenticated()?;
    let conn = db::connect().map_err(|error| error.to_string())?;
    service::delete(&conn, id)
}
