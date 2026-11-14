use crate::contract::model::ContractStatus;
use crate::contract::repository as contract_repository;
use crate::contractItem::model::ContractItem;
use crate::contractItem::repository as contract_item_repository;
use crate::db::error_message;
use crate::delivery::model::{Delivery, DeliveryData};
use crate::delivery::repository;
use rusqlite::{Connection, Transaction};

fn validate(conn: &Connection, data: &DeliveryData) -> Result<ContractItem, String> {
    if data.contract_item_id <= 0 {
        return Err("Selecione um item do contrato".to_string());
    }
    if data.solicited_quantity <= 0 {
        return Err("A quantidade solicitada deve ser maior que zero".to_string());
    }
    if data.delivered_qtd <= 0 || data.delivered_qtd > data.solicited_quantity {
        return Err("A quantidade entregue deve ser maior que zero e não pode exceder a solicitada".to_string());
    }
    i32::try_from(data.delivered_qtd)
        .map_err(|_| "A quantidade entregue excede o limite numérico".to_string())?;

    let item = contract_item_repository::find_by_id(conn, data.contract_item_id)
        .map_err(error_message)?
        .ok_or_else(|| "Item do contrato não encontrado".to_string())?;
    let contract_id = item
        .contract_id
        .ok_or_else(|| "O item precisa estar associado a um contrato".to_string())?;
    let contract = contract_repository::find_by_id(conn, contract_id)
        .map_err(error_message)?
        .ok_or_else(|| "Contrato não encontrado".to_string())?;
    if contract.status == ContractStatus::Concluido {
        return Err("Não é possível registrar entregas em um contrato concluído".to_string());
    }

    Ok(item)
}

fn ensure_contract_editable(conn: &Connection, item: &ContractItem) -> Result<(), String> {
    let contract_id = item
        .contract_id
        .ok_or_else(|| "O item precisa estar associado a um contrato".to_string())?;
    let contract = contract_repository::find_by_id(conn, contract_id)
        .map_err(error_message)?
        .ok_or_else(|| "Contrato não encontrado".to_string())?;
    if contract.status == ContractStatus::Concluido {
        return Err("Não é possível alterar entregas de um contrato concluído".to_string());
    }
    Ok(())
}

fn adjust_item_total(
    conn: &Connection,
    contract_item_id: i32,
    delta: i64,
) -> Result<(), String> {
    if delta == 0 {
        return Ok(());
    }
    let quantity = i32::try_from(delta.unsigned_abs())
        .map_err(|_| "A quantidade entregue excede o limite numérico".to_string())?;
    let affected = if delta > 0 {
        repository::add_item_delivered_quantity(conn, contract_item_id, quantity)
    } else {
        repository::subtract_item_delivered_quantity(conn, contract_item_id, quantity)
    }
    .map_err(error_message)?;
    if affected == 0 {
        return Err(if delta > 0 {
            "A entrega excede a quantidade restante do item".to_string()
        } else {
            "A quantidade entregue do item não corresponde aos registros de entrega".to_string()
        });
    }
    Ok(())
}

fn finish_transaction(tx: Transaction<'_>, result: Result<Delivery, String>) -> Result<Delivery, String> {
    let delivery = result?;
    tx.commit().map_err(error_message)?;
    Ok(delivery)
}

pub fn create(conn: &mut Connection, data: DeliveryData) -> Result<Delivery, String> {
    let tx = conn.transaction().map_err(error_message)?;
    let result = (|| {
        let item = validate(&tx, &data)?;
        adjust_item_total(&tx, item.id, data.delivered_qtd)?;
        let id = repository::insert(&tx, &data).map_err(error_message)?;
        repository::find_by_id(&tx, id)
            .map_err(error_message)?
            .ok_or_else(|| "Entrega não encontrada após o cadastro".to_string())
    })();
    finish_transaction(tx, result)
}

pub fn update(conn: &mut Connection, id: i32, data: DeliveryData) -> Result<Delivery, String> {
    let tx = conn.transaction().map_err(error_message)?;
    let result = (|| {
        let current = repository::find_by_id(&tx, id)
            .map_err(error_message)?
            .ok_or_else(|| "Entrega não encontrada".to_string())?;
        ensure_contract_editable(&tx, &current.contract_item)?;
        let new_item = validate(&tx, &data)?;
        ensure_contract_editable(&tx, &new_item)?;

        if current.contract_item.id == new_item.id {
            adjust_item_total(
                &tx,
                new_item.id,
                data.delivered_qtd - current.delivered_qtd,
            )?;
        } else {
            adjust_item_total(
                &tx,
                current.contract_item.id,
                -current.delivered_qtd,
            )?;
            adjust_item_total(&tx, new_item.id, data.delivered_qtd)?;
        }

        let affected = repository::update(&tx, id, &data).map_err(error_message)?;
        if affected == 0 {
            return Err("Entrega não encontrada".to_string());
        }
        repository::find_by_id(&tx, id)
            .map_err(error_message)?
            .ok_or_else(|| "Entrega não encontrada após a atualização".to_string())
    })();
    finish_transaction(tx, result)
}

pub fn delete(conn: &mut Connection, id: i32) -> Result<(), String> {
    let tx = conn.transaction().map_err(error_message)?;
    let result = (|| {
        let current = repository::find_by_id(&tx, id)
            .map_err(error_message)?
            .ok_or_else(|| "Entrega não encontrada".to_string())?;
        ensure_contract_editable(&tx, &current.contract_item)?;
        adjust_item_total(
            &tx,
            current.contract_item.id,
            -current.delivered_qtd,
        )?;
        let affected = repository::delete(&tx, id).map_err(error_message)?;
        if affected == 0 {
            return Err("Entrega não encontrada".to_string());
        }
        Ok(())
    })();
    let result = result?;
    tx.commit().map_err(error_message)?;
    Ok(result)
}

pub fn get_by_id(conn: &Connection, id: i32) -> Result<Option<Delivery>, String> {
    repository::find_by_id(conn, id).map_err(error_message)
}

pub fn list_all(conn: &Connection) -> Result<Vec<Delivery>, String> {
    repository::find_all(conn).map_err(error_message)
}

pub fn list_by_contract(conn: &Connection, contract_id: i32) -> Result<Vec<Delivery>, String> {
    if contract_id <= 0 {
        return Err("Selecione um contrato".to_string());
    }
    contract_repository::find_by_id(conn, contract_id)
        .map_err(error_message)?
        .ok_or_else(|| "Contrato não encontrado".to_string())?;
    repository::find_by_contract(conn, contract_id).map_err(error_message)
}
