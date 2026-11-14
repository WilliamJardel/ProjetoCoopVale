use crate::db::error_message;
use crate::Product::model::{Product, ProductData, Status};
use crate::Product::repository;
use rusqlite::Connection;

fn validate(data: &ProductData) -> Result<(), String> {
    let name = data.name.trim();
    if name.is_empty() {
        return Err("O nome do produto é obrigatório".to_string());
    }

    let measurement_unit = data.measurement_unit.trim();
    if measurement_unit.is_empty() {
        return Err("A unidade de medida é obrigatória".to_string());
    }

    let category = data.category.trim();
    if category.is_empty() {
        return Err("A categoria é obrigatória".to_string());
    }

    if data.reference_price_cents <= 0 {
        return Err("O preço de referência deve ser maior que zero".to_string());
    }

    Ok(())
}

pub fn create(conn: &Connection, data: ProductData) -> Result<Product, String> {
    validate(&data)?;
    let id = repository::insert(conn, &data).map_err(error_message)?;
    repository::find_by_id(conn, id)
        .map_err(error_message)?
        .ok_or_else(|| "Produto não encontrado após o cadastro".to_string())
}

pub fn update(conn: &Connection, id: i32, data: ProductData) -> Result<Product, String> {
    let current = repository::find_by_id(conn, id)
        .map_err(error_message)?
        .ok_or_else(|| "Produto não encontrado".to_string())?;

    validate(&data)?;

    let affected = repository::update(conn, id, &data).map_err(error_message)?;
    if affected == 0 {
        return Err("Produto não encontrado".to_string());
    }

    Ok(current)
}

pub fn deactivate(conn: &Connection, id: i32) -> Result<Product, String> {
    let current = repository::find_by_id(conn, id)
        .map_err(error_message)?
        .ok_or_else(|| "Produto não encontrado".to_string())?;

    if current.status == Status::Desativado {
        return Err("Produto já está desativado".to_string());
    }

    let affected = repository::deactivate(conn, id).map_err(error_message)?;
    if affected == 0 {
        return Err("Produto não encontrado".to_string());
    }

    repository::find_by_id(conn, id)
        .map_err(error_message)?
        .ok_or_else(|| "Produto não encontrado após a desativação".to_string())
        .and_then(|product| Ok(product))
}

pub fn get_by_id(conn: &Connection, id: i32) -> Result<Option<Product>, String> {
    repository::find_by_id(conn, id).map_err(error_message)
}

pub fn list_all(conn: &Connection) -> Result<Vec<Product>, String> {
    repository::find_all(conn).map_err(error_message)
}
