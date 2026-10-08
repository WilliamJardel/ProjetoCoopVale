use crate::institution::model::Institution;
use rusqlite::{params, Connection, OptionalExtension, Result};

pub fn insert(conn: &Connection, inst: &Institution) -> Result<i32> {
    conn.execute(
        "INSERT INTO instituicao (nome, cnpj, tipo, telefone, endereco) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![
            inst.name,
            inst.cnpj,
            inst.institution_type.as_str(),
            inst.telephone,
            inst.location
        ],
    )?;
    Ok(conn.last_insert_rowid() as i32)
}

pub fn update(conn: &Connection, id: i32, inst: &Institution) -> Result<usize> {
    conn.execute(
        "UPDATE instituicao SET nome = ?1, cnpj = ?2, tipo = ?3, telefone = ?4, endereco = ?5 WHERE id = ?6",
        params![
            inst.name,
            inst.cnpj,
            inst.institution_type.as_str(),
            inst.telephone,
            inst.location,
            id
        ],
    )
}

pub fn delete(conn: &Connection, id: i32) -> Result<usize> {
    conn.execute("DELETE FROM instituicao WHERE id = ?1", [id])
}

pub fn find_by_id(conn: &Connection, id: i32) -> Result<Option<Institution>> {
    conn.query_row(
        &format!("SELECT {} FROM instituicao WHERE id = ?1", Institution::COLUMNS),
        [id],
        Institution::from_row,
    )
    .optional()
}

pub fn find_all(conn: &Connection) -> Result<Vec<Institution>> {
    let mut stmt = conn.prepare(&format!(
        "SELECT {} FROM instituicao ORDER BY nome",
        Institution::COLUMNS
    ))?;
    let rows = stmt.query_map([], Institution::from_row)?;
    rows.collect()
}