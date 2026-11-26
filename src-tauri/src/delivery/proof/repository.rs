use crate::delivery::proof::model::{DeliveryProof, DeliveryProofData, DeliveryProofMetadata};
use rusqlite::{params, Connection, OptionalExtension, Result};

pub fn insert(conn: &Connection, data: &DeliveryProofData) -> Result<i32> {
    conn.execute(
        "INSERT INTO delivery_proof (delivery_id, file_name, mime_type, content)
         VALUES (?1, ?2, ?3, ?4)",
        params![data.delivery_id, data.file_name, data.mime_type, data.content],
    )?;
    Ok(conn.last_insert_rowid() as i32)
}

pub fn find_by_id(conn: &Connection, id: i32) -> Result<Option<DeliveryProof>> {
    conn.query_row(
        "SELECT id, delivery_id, file_name, mime_type, content, created_at
         FROM delivery_proof WHERE id = ?1",
        [id],
        DeliveryProof::from_row,
    )
    .optional()
}

pub fn find_metadata_by_delivery(
    conn: &Connection,
    delivery_id: i32,
) -> Result<Vec<DeliveryProofMetadata>> {
    let mut stmt = conn.prepare(&format!(
        "SELECT {} FROM delivery_proof WHERE delivery_id = ?1 ORDER BY created_at DESC, id DESC",
        DeliveryProofMetadata::COLUMNS,
    ))?;
    let rows = stmt.query_map([delivery_id], DeliveryProofMetadata::from_row)?;
    rows.collect()
}

pub fn delete(conn: &Connection, id: i32) -> Result<usize> {
    conn.execute("DELETE FROM delivery_proof WHERE id = ?1", [id])
}
