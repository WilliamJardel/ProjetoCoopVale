use crate::invoice::model::{Invoice, InvoiceData, InvoiceStatus};
use rusqlite::{params, Connection, OptionalExtension, Result};

pub fn find_by_payment(conn: &Connection, payment_id: i32) -> Result<Option<Invoice>> {
    conn.query_row(
        &format!("SELECT {} FROM pagamento WHERE id = ?1", Invoice::COLUMNS),
        [payment_id],
        Invoice::from_row,
    )
    .optional()
}

pub fn find_all(conn: &Connection, status: Option<InvoiceStatus>) -> Result<Vec<Invoice>> {
    let mut stmt = conn.prepare(&format!(
        "SELECT {} FROM pagamento
          WHERE (?1 IS NULL OR status_conferencia = ?1)
          ORDER BY data_pagamento DESC, id DESC",
        Invoice::COLUMNS
    ))?;
    let rows = stmt.query_map([status.map(|s| s.as_str())], Invoice::from_row)?;
    rows.collect()
}

pub fn find_by_contract(conn: &Connection, contract_id: i32) -> Result<Vec<Invoice>> {
    let mut stmt = conn.prepare(&format!(
        "SELECT {} FROM pagamento WHERE contrato_id = ?1 ORDER BY data_pagamento DESC, id DESC",
        Invoice::COLUMNS
    ))?;
    let rows = stmt.query_map([contract_id], Invoice::from_row)?;
    rows.collect()
}

pub fn number_in_use(conn: &Connection, number: &str, except_payment_id: i32) -> Result<bool> {
    conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM pagamento
                        WHERE numero_nota_fiscal = ?1 COLLATE NOCASE AND id <> ?2)",
        params![number, except_payment_id],
        |row| row.get(0),
    )
}

pub fn save(conn: &Connection, payment_id: i32, data: &InvoiceData) -> Result<usize> {
    conn.execute(
        "UPDATE pagamento
            SET numero_nota_fiscal = ?1, valor_nota_fiscal_centavos = ?2, data_emissao_nf = ?3
          WHERE id = ?4",
        params![data.number, data.amount_cents, data.issue_date, payment_id],
    )?;
    refresh_status(conn, payment_id)
}

pub fn clear(conn: &Connection, payment_id: i32) -> Result<usize> {
    conn.execute(
        "UPDATE pagamento
            SET numero_nota_fiscal = NULL, valor_nota_fiscal_centavos = NULL, data_emissao_nf = NULL
          WHERE id = ?1",
        [payment_id],
    )?;
    refresh_status(conn, payment_id)
}

pub fn refresh_status(conn: &Connection, payment_id: i32) -> Result<usize> {
    conn.execute(
        "UPDATE pagamento
            SET status_conferencia = CASE
                WHEN numero_nota_fiscal IS NULL THEN 'Pendente'
                WHEN valor_nota_fiscal_centavos = valor_centavos THEN 'Conferida'
                ELSE 'Divergente'
            END
          WHERE id = ?1",
        [payment_id],
    )
}