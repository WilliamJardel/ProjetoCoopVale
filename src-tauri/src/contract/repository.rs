use crate::contract::model::{Contract, ContractData, ContractStatus};
use rusqlite::{params, Connection, OptionalExtension, Result};

pub fn insert(conn: &Connection, d: &ContractData) -> Result<i32> {
    conn.execute(
        "INSERT INTO contrato (instituicao_id, valor_total_centavos, data_inicio, data_termino, status)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![
            d.institution_id,
            d.total_value_cents,
            d.start_date,
            d.end_date,
            ContractStatus::EmAndamento.as_str()
        ],
    )?;
    Ok(conn.last_insert_rowid() as i32)
}

pub fn update(conn: &Connection, id: i32, d: &ContractData) -> Result<usize> {
    conn.execute(
        "UPDATE contrato
            SET instituicao_id = ?1, valor_total_centavos = ?2, data_inicio = ?3, data_termino = ?4
          WHERE id = ?5",
        params![
            d.institution_id,
            d.total_value_cents,
            d.start_date,
            d.end_date,
            id
        ],
    )
}

pub fn delete(conn: &Connection, id: i32) -> Result<usize> {
    conn.execute("DELETE FROM contrato WHERE id = ?1", [id])
}

pub fn find_by_id(conn: &Connection, id: i32) -> Result<Option<Contract>> {
    conn.query_row(
        &format!("SELECT {} FROM contrato WHERE id = ?1", Contract::COLUMNS),
        [id],
        Contract::from_row,
    )
    .optional()
}

pub fn find_all(conn: &Connection) -> Result<Vec<Contract>> {
    let mut stmt = conn.prepare(&format!(
        "SELECT {} FROM contrato ORDER BY data_termino, id",
        Contract::COLUMNS
    ))?;
    let rows = stmt.query_map([], Contract::from_row)?;
    rows.collect()
}

pub fn find_by_institution(conn: &Connection, institution_id: i32) -> Result<Vec<Contract>> {
    let mut stmt = conn.prepare(&format!(
        "SELECT {} FROM contrato WHERE instituicao_id = ?1 ORDER BY data_inicio DESC, id DESC",
        Contract::COLUMNS
    ))?;
    let rows = stmt.query_map([institution_id], Contract::from_row)?;
    rows.collect()
}

pub fn count_by_institution(conn: &Connection, institution_id: i32) -> Result<i64> {
    conn.query_row(
        "SELECT COUNT(*) FROM contrato WHERE instituicao_id = ?1",
        [institution_id],
        |row| row.get(0),
    )
}