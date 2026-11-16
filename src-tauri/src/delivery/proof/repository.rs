use crate::delivery::proof::model::{Proof, ProofData, ProofFile};
use rusqlite::{params, Connection, OptionalExtension, Result};

pub fn insert(conn: &Connection, data: &ProofData) -> Result<i32> {
    conn.execute(
        "INSERT INTO delivery_proof (delivery_id, file_name, mime_type, content)
         VALUES (?1, ?2, ?3, ?4)",
        params![
            data.delivery_id,
            data.file_name.trim(),
            data.mime_type,
            data.content
        ],
    )?;
    Ok(conn.last_insert_rowid() as i32)
}

pub fn find_by_id(conn: &Connection, id: i32) -> Result<Option<Proof>> {
    conn.query_row(
        &format!(
            "SELECT {} FROM delivery_proof WHERE id = ?1",
            Proof::COLUMNS
        ),
        [id],
        Proof::from_row,
    )
    .optional()
}

pub fn find_file_by_id(conn: &Connection, id: i32) -> Result<Option<ProofFile>> {
    conn.query_row(
        &format!(
            "SELECT {}, content FROM delivery_proof WHERE id = ?1",
            Proof::COLUMNS
        ),
        [id],
        |row| {
            Ok(ProofFile {
                proof: Proof::from_row(row)?,
                content: row.get(6)?,
            })
        },
    )
    .optional()
}

pub fn find_all(conn: &Connection) -> Result<Vec<Proof>> {
    let mut stmt = conn.prepare(&format!(
        "SELECT {} FROM delivery_proof ORDER BY delivery_id, id DESC",
        Proof::COLUMNS
    ))?;
    let rows = stmt.query_map([], Proof::from_row)?;
    rows.collect()
}

pub fn delete(conn: &Connection, id: i32) -> Result<usize> {
    conn.execute("DELETE FROM delivery_proof WHERE id = ?1", [id])
}
