use crate::contractItem::model::{ContractItem, ContractItemData};
use rusqlite::{params, Connection, OptionalExtension, Result};

pub fn insert(conn: &Connection, data: &ContractItemData) -> Result<i32> {
	conn.execute(
		"INSERT INTO item_contrato (contrato_id, produto_id, quantidade, quantidade_entregue, preco_unitario_centavos)
		 VALUES (?1, ?2, ?3, ?4, ?5)",
		params![
			data.contract_id,
			data.product.id,
			data.item_qtd,
			data.delivered_qtd,
			data.unit_price
		],
	)?;
	Ok(conn.last_insert_rowid() as i32)
}

pub fn update(conn: &Connection, id: i32, data: &ContractItemData) -> Result<usize> {
	conn.execute(
		"UPDATE item_contrato
			SET contrato_id = ?1, produto_id = ?2, quantidade = ?3, quantidade_entregue = ?4, preco_unitario_centavos = ?5
		  WHERE id = ?6",
		params![
			data.contract_id,
			data.product.id,
			data.item_qtd,
			data.delivered_qtd,
			data.unit_price,
			id
		],
	)
}

pub fn register_delivery(conn: &Connection, id: i32, quantity: i32) -> Result<usize> {
	conn.execute(
		"UPDATE item_contrato
		    SET quantidade_entregue = quantidade_entregue + ?1
		  WHERE id = ?2 AND ?1 <= quantidade - quantidade_entregue",
		params![quantity, id],
	)
}

pub fn delete(conn: &Connection, id: i32) -> Result<usize> {
	conn.execute("DELETE FROM item_contrato WHERE id = ?1", [id])
}

pub fn find_by_id(conn: &Connection, id: i32) -> Result<Option<ContractItem>> {
	conn.query_row(
		&format!(
			"SELECT {} FROM item_contrato JOIN produto ON produto.id = item_contrato.produto_id WHERE item_contrato.id = ?1",
			ContractItem::COLUMNS
		),
		[id],
		ContractItem::from_row,
	)
	.optional()
}

pub fn find_all(conn: &Connection) -> Result<Vec<ContractItem>> {
	let mut stmt = conn.prepare(&format!(
		"SELECT {} FROM item_contrato JOIN produto ON produto.id = item_contrato.produto_id ORDER BY produto.nome, item_contrato.id",
		ContractItem::COLUMNS
	))?;
	let rows = stmt.query_map([], ContractItem::from_row)?;
	rows.collect()
}

pub fn find_by_contract(conn: &Connection, contract_id: i32) -> Result<Vec<ContractItem>> {
	let mut stmt = conn.prepare(&format!(
		"SELECT {} FROM item_contrato JOIN produto ON produto.id = item_contrato.produto_id WHERE item_contrato.contrato_id = ?1 ORDER BY produto.nome, item_contrato.id",
		ContractItem::COLUMNS
	))?;
	let rows = stmt.query_map([contract_id], ContractItem::from_row)?;
	rows.collect()
}
