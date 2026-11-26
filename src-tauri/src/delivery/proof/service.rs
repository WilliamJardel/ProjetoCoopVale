use crate::db::error_message;
use crate::delivery::proof::model::{DeliveryProof, DeliveryProofData, DeliveryProofMetadata};
use crate::delivery::proof::repository;
use rusqlite::Connection;

fn validate_delivery(conn: &Connection, delivery_id: i32) -> Result<(), String> {
    if delivery_id <= 0 {
        return Err("Selecione uma entrega válida".to_string());
    }
    crate::delivery::repository::find_by_id(conn, delivery_id)
        .map_err(error_message)?
        .ok_or_else(|| "Entrega não encontrada".to_string())?;
    Ok(())
}

pub fn upload(conn: &Connection, mut data: DeliveryProofData) -> Result<DeliveryProofMetadata, String> {
    validate_delivery(conn, data.delivery_id)?;
    data.file_name = data.file_name.trim().to_string();
    if data.file_name.is_empty() {
        return Err("Informe o nome do arquivo".to_string());
    }
    if data.file_name.chars().count() > 255 {
        return Err("O nome do arquivo deve ter no máximo 255 caracteres".to_string());
    }
    if data.content.is_empty() {
        return Err("O comprovante está vazio".to_string());
    }
    data.mime_type = data
        .mime_type
        .map(|mime_type| mime_type.trim().to_string())
        .filter(|mime_type| !mime_type.is_empty());

    let id = repository::insert(conn, &data).map_err(error_message)?;
    repository::find_by_id(conn, id)
        .map_err(error_message)?
        .map(|proof| DeliveryProofMetadata {
            id: proof.id,
            delivery_id: proof.delivery_id,
            file_name: proof.file_name,
            mime_type: proof.mime_type,
            created_at: proof.created_at,
        })
        .ok_or_else(|| "Comprovante não encontrado após o envio".to_string())
}

pub fn get(conn: &Connection, id: i32) -> Result<Option<DeliveryProof>, String> {
    if id <= 0 {
        return Err("Comprovante inválido".to_string());
    }
    repository::find_by_id(conn, id).map_err(error_message)
}

pub fn list_by_delivery(
    conn: &Connection,
    delivery_id: i32,
) -> Result<Vec<DeliveryProofMetadata>, String> {
    validate_delivery(conn, delivery_id)?;
    repository::find_metadata_by_delivery(conn, delivery_id).map_err(error_message)
}

pub fn delete(conn: &Connection, id: i32) -> Result<(), String> {
    if id <= 0 {
        return Err("Comprovante inválido".to_string());
    }
    let affected = repository::delete(conn, id).map_err(error_message)?;
    if affected == 0 {
        return Err("Comprovante não encontrado".to_string());
    }
    Ok(())
}
