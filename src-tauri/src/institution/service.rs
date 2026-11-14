use crate::contract;
use crate::db::{error_message, is_unique_violation};
use crate::institution::cnpj;
use crate::institution::model::Institution;
use crate::institution::repository;
use rusqlite::Connection;

fn prepare(mut inst: Institution) -> Result<Institution, String> {
    inst.name = inst.name.trim().to_string();
    if inst.name.is_empty() {
        return Err("O nome da instituição é obrigatório".to_string());
    }
    if inst.cnpj.trim().is_empty() {
        return Err("O CNPJ é obrigatório".to_string());
    }
    inst.cnpj = cnpj::validate(&inst.cnpj)?;
    Ok(inst)
}

fn save_error_message(e: rusqlite::Error) -> String {
    if is_unique_violation(&e) {
        "Já existe uma instituição cadastrada com esse CNPJ".to_string()
    } else {
        error_message(e)
    }
}

pub fn create(conn: &Connection, inst: Institution) -> Result<Institution, String> {
    let mut inst = prepare(inst)?;
    let id = repository::insert(conn, &inst).map_err(save_error_message)?;
    inst.id = Some(id);
    Ok(inst)
}

pub fn update(conn: &Connection, inst: Institution) -> Result<Institution, String> {
    let id = inst
        .id
        .ok_or_else(|| "O ID da instituição é obrigatório para atualização".to_string())?;
    let inst = prepare(inst)?;
    let affected = repository::update(conn, id, &inst).map_err(save_error_message)?;
    if affected == 0 {
        return Err("Instituição não encontrada".to_string());
    }
    Ok(inst)
}

pub fn delete(conn: &Connection, id: i32) -> Result<(), String> {
    let contracts =
        contract::repository::count_by_institution(conn, id).map_err(error_message)?;
    if contracts > 0 {
        return Err(format!(
            "Não é possível excluir: a instituição possui {} contrato(s) vinculado(s)",
            contracts
        ));
    }
    let affected = repository::delete(conn, id).map_err(error_message)?;
    if affected == 0 {
        return Err("Instituição não encontrada".to_string());
    }
    Ok(())
}

pub fn get_by_id(conn: &Connection, id: i32) -> Result<Option<Institution>, String> {
    repository::find_by_id(conn, id).map_err(error_message)
}

pub fn list_all(conn: &Connection) -> Result<Vec<Institution>, String> {
    repository::find_all(conn).map_err(error_message)
}