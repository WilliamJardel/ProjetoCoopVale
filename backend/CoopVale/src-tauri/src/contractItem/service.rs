use crate::contractItem::model::{ContractItem, ContractItemData};
use crate::contractItem::repository;
use crate::contract::model::ContractStatus;
use crate::contract::repository as contract_repository;
use crate::db::error_message;
use crate::Product::model::Status;
use crate::Product::repository as product_repository;
use rusqlite::Connection;

fn validate(
	conn: &Connection,
	data: &ContractItemData,
	existing_product_id: Option<i32>,
) -> Result<(), String> {
	if data.contract_id <= 0 {
		return Err("Selecione um contrato".to_string());
	}
	if data.product.id <= 0 {
		return Err("Selecione um produto".to_string());
	}
	if data.item_qtd <= 0 {
		return Err("A quantidade do item deve ser maior que zero".to_string());
	}
	if data.delivered_qtd < 0 || data.delivered_qtd > data.item_qtd {
		return Err("A quantidade entregue deve estar entre zero e a quantidade do item".to_string());
	}
	if data.unit_price <= 0 {
		return Err("O preço unitário deve ser maior que zero".to_string());
	}

	ensure_contract_editable(conn, data.contract_id)?;

	let product = product_repository::find_by_id(conn, data.product.id)
		.map_err(error_message)?
		.ok_or_else(|| "Produto não encontrado".to_string())?;
	if product.status == Status::Desativado && existing_product_id != Some(data.product.id) {
		return Err("Não é possível adicionar um produto desativado".to_string());
	}

	Ok(())
}

fn ensure_contract_editable(conn: &Connection, contract_id: i32) -> Result<(), String> {
	let contract = contract_repository::find_by_id(conn, contract_id)
		.map_err(error_message)?
		.ok_or_else(|| "Contrato não encontrado".to_string())?;
	if contract.status == ContractStatus::Concluido {
		return Err("Não é possível alterar itens de um contrato concluído".to_string());
	}
	Ok(())
}

pub fn create(conn: &Connection, data: ContractItemData) -> Result<ContractItem, String> {
	validate(conn, &data)?;
	let id = repository::insert(conn, &data).map_err(error_message)?;
	repository::find_by_id(conn, id)
		.map_err(error_message)?
		.ok_or_else(|| "Item do contrato não encontrado após o cadastro".to_string())
}

pub fn update(
	conn: &Connection,
	id: i32,
	data: ContractItemData,
) -> Result<ContractItem, String> {
	let current = repository::find_by_id(conn, id)
		.map_err(error_message)?
		.ok_or_else(|| "Item do contrato não encontrado".to_string())?;
	if let Some(current_contract_id) = current.contract_id {
		ensure_contract_editable(conn, current_contract_id)?;
	}
	validate(conn, &data, Some(current.product.id))?;

	let affected = repository::update(conn, id, &data).map_err(error_message)?;
	if affected == 0 {
		return Err("Item do contrato não encontrado".to_string());
	}
	repository::find_by_id(conn, id)
		.map_err(error_message)?
		.ok_or_else(|| "Item do contrato não encontrado após a atualização".to_string())
}

pub fn delete(conn: &Connection, id: i32) -> Result<(), String> {
	let current = repository::find_by_id(conn, id)
		.map_err(error_message)?
		.ok_or_else(|| "Item do contrato não encontrado".to_string())?;
	if let Some(contract_id) = current.contract_id {
		ensure_contract_editable(conn, contract_id)?;
	}
	let affected = repository::delete(conn, id).map_err(error_message)?;
	if affected == 0 {
		return Err("Item do contrato não encontrado".to_string());
	}
	Ok(())
}

pub fn get_by_id(conn: &Connection, id: i32) -> Result<Option<ContractItem>, String> {
	repository::find_by_id(conn, id).map_err(error_message)
}

pub fn list_all(conn: &Connection) -> Result<Vec<ContractItem>, String> {
	repository::find_all(conn).map_err(error_message)
}

pub fn list_by_contract(conn: &Connection, contract_id: i32) -> Result<Vec<ContractItem>, String> {
	if contract_id <= 0 {
		return Err("Selecione um contrato".to_string());
	}
	contract_repository::find_by_id(conn, contract_id)
		.map_err(error_message)?
		.ok_or_else(|| "Contrato não encontrado".to_string())?;
	repository::find_by_contract(conn, contract_id).map_err(error_message)
}

pub fn register_delivery(
	conn: &Connection,
	id: i32,
	quantity: i32,
) -> Result<ContractItem, String> {
	if quantity <= 0 {
		return Err("A quantidade entregue deve ser maior que zero".to_string());
	}
	let current = repository::find_by_id(conn, id)
		.map_err(error_message)?
		.ok_or_else(|| "Item do contrato não encontrado".to_string())?;
	if let Some(contract_id) = current.contract_id {
		ensure_contract_editable(conn, contract_id)?;
	}

	let affected = repository::register_delivery(conn, id, quantity).map_err(error_message)?;
	if affected == 0 {
		return Err("A entrega excede a quantidade restante do item".to_string());
	}
	repository::find_by_id(conn, id)
		.map_err(error_message)?
		.ok_or_else(|| "Item do contrato não encontrado após registrar a entrega".to_string())
}
