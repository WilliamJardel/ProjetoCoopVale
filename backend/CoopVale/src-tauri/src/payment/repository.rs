use crate::payment::model::{Payment, PaymentData};
use rusqlite::{params, Connection, OptionalExtension, Result};

pub fn insert(conn: &Connection, data: &PaymentData) -> Result<i32> {
    conn.execute(
        "INSERT INTO pagamento (contrato_id, valor_centavos, data_pagamento, observacao)
         VALUES (?1, ?2, ?3, ?4)",
        params![
            data.contract_id,
            data.amount_cents,
            data.payment_date,
            data.note
        ],
    )?;
    Ok(conn.last_insert_rowid() as i32)
}

pub fn update(conn: &Connection, id: i32, data: &PaymentData) -> Result<usize> {
    conn.execute(
        "UPDATE pagamento
            SET contrato_id = ?1, valor_centavos = ?2, data_pagamento = ?3, observacao = ?4
          WHERE id = ?5",
        params![
            data.contract_id,
            data.amount_cents,
            data.payment_date,
            data.note,
            id
        ],
    )
}

pub fn delete(conn: &Connection, id: i32) -> Result<usize> {
    conn.execute("DELETE FROM pagamento WHERE id = ?1", [id])
}

pub fn find_by_id(conn: &Connection, id: i32) -> Result<Option<Payment>> {
    conn.query_row(
        &format!("SELECT {} FROM pagamento WHERE id = ?1", Payment::COLUMNS),
        [id],
        Payment::from_row,
    )
    .optional()
}

pub fn find_all(conn: &Connection) -> Result<Vec<Payment>> {
    let mut stmt = conn.prepare(&format!(
        "SELECT {} FROM pagamento ORDER BY data_pagamento DESC, id DESC",
        Payment::COLUMNS
    ))?;
    let rows = stmt.query_map([], Payment::from_row)?;
    rows.collect()
}

pub fn find_by_contract(conn: &Connection, contract_id: i32) -> Result<Vec<Payment>> {
    let mut stmt = conn.prepare(&format!(
        "SELECT {} FROM pagamento WHERE contrato_id = ?1 ORDER BY data_pagamento DESC, id DESC",
        Payment::COLUMNS
    ))?;
    let rows = stmt.query_map([contract_id], Payment::from_row)?;
    rows.collect()
}

/// Soma os pagamentos de um contrato, opcionalmente ignorando um pagamento (usado na edição).
pub fn sum_by_contract(
    conn: &Connection,
    contract_id: i32,
    exclude_payment_id: Option<i32>,
) -> Result<i64> {
    conn.query_row(
        "SELECT COALESCE(SUM(valor_centavos), 0) FROM pagamento
          WHERE contrato_id = ?1 AND (?2 IS NULL OR id <> ?2)",
        params![contract_id, exclude_payment_id],
        |row| row.get(0),
    )
}