use crate::delivery::model::{Delivery, DeliveryData};
use rusqlite::{params, Connection, OptionalExtension, Result};

const JOINS: &str = "FROM entrega
    JOIN item_contrato ON item_contrato.id = entrega.item_contrato_id
    JOIN produto ON produto.id = item_contrato.produto_id
    JOIN contrato ON contrato.id = item_contrato.contrato_id";

pub fn insert(conn: &Connection, data: &DeliveryData) -> Result<i32> {
    conn.execute(
        "INSERT INTO entrega (item_contrato_id, quantidade_solicitada, quantidade_entregue, data_entrega, observacao)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![
            data.contract_item_id,
            data.solicited_quantity,
            data.delivered_qtd,
            data.delivery_date,
            data.note
        ],
    )?;
    Ok(conn.last_insert_rowid() as i32)
}

pub fn update(conn: &Connection, id: i32, data: &DeliveryData) -> Result<usize> {
    conn.execute(
        "UPDATE entrega
            SET item_contrato_id = ?1, quantidade_solicitada = ?2, quantidade_entregue = ?3,
                data_entrega = ?4, observacao = ?5
          WHERE id = ?6",
        params![
            data.contract_item_id,
            data.solicited_quantity,
            data.delivered_qtd,
            data.delivery_date,
            data.note,
            id
        ],
    )
}

pub fn delete(conn: &Connection, id: i32) -> Result<usize> {
    conn.execute("DELETE FROM entrega WHERE id = ?1", [id])
}

pub fn find_by_id(conn: &Connection, id: i32) -> Result<Option<Delivery>> {
    conn.query_row(
        &format!("SELECT {} {} WHERE entrega.id = ?1", Delivery::COLUMNS, JOINS),
        [id],
        Delivery::from_row,
    )
    .optional()
}

pub fn find_all(conn: &Connection) -> Result<Vec<Delivery>> {
    let mut stmt = conn.prepare(&format!(
        "SELECT {} {} ORDER BY entrega.data_entrega DESC, entrega.id DESC",
        Delivery::COLUMNS,
        JOINS
    ))?;
    let rows = stmt.query_map([], Delivery::from_row)?;
    rows.collect()
}

pub fn find_by_contract(conn: &Connection, contract_id: i32) -> Result<Vec<Delivery>> {
    let mut stmt = conn.prepare(&format!(
        "SELECT {} {} WHERE contrato.id = ?1 ORDER BY entrega.data_entrega DESC, entrega.id DESC",
        Delivery::COLUMNS,
        JOINS
    ))?;
    let rows = stmt.query_map([contract_id], Delivery::from_row)?;
    rows.collect()
}

pub fn add_item_delivered_quantity(
    conn: &Connection,
    contract_item_id: i32,
    quantity: i32,
) -> Result<usize> {
    conn.execute(
        "UPDATE item_contrato
            SET quantidade_entregue = quantidade_entregue + ?1
          WHERE id = ?2 AND ?1 <= quantidade - quantidade_entregue",
        params![quantity, contract_item_id],
    )
}

pub fn subtract_item_delivered_quantity(
    conn: &Connection,
    contract_item_id: i32,
    quantity: i32,
) -> Result<usize> {
    conn.execute(
        "UPDATE item_contrato
            SET quantidade_entregue = quantidade_entregue - ?1
          WHERE id = ?2 AND ?1 <= quantidade_entregue",
        params![quantity, contract_item_id],
    )
}
