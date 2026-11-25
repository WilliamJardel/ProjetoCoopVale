use crate::db::error_message;
use crate::product::model::{Product, ProductData, Status};
use crate::product::repository;
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
    repository::find_by_id(conn, id)
        .map_err(error_message)?
        .ok_or_else(|| "Produto não encontrado".to_string())?;

    validate(&data)?;

    let affected = repository::update(conn, id, &data).map_err(error_message)?;
    if affected == 0 {
        return Err("Produto não encontrado".to_string());
    }

    repository::find_by_id(conn, id)
        .map_err(error_message)?
        .ok_or_else(|| "Produto não encontrado após a atualização".to_string())
}

pub fn deactivate(conn: &Connection, id: i32) -> Result<Product, String> {
    let current = repository::find_by_id(conn, id)
        .map_err(error_message)?
        .ok_or_else(|| "Produto não encontrado".to_string())?;

    if current.status == Status::Desativado {
        return Err("Produto já está desativado".to_string());
    }

    if repository::has_active_contract(conn, id).map_err(error_message)? {
        return Err("Não é possível desativar um produto associado a um contrato ativo".to_string());
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db;
    use rusqlite::{params, Connection};

    fn setup_db() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        db::init(&conn).unwrap();
        conn
    }

    fn new_product(conn: &Connection) -> i32 {
        conn.execute(
            "INSERT INTO produto (nome, unidade_de_medida, categoria, preco_de_referencia_centavos)
             VALUES ('Milho', 'kg', 'Grãos', 100)",
            [],
        )
        .unwrap();
        conn.last_insert_rowid() as i32
    }

    fn add_contract_item(conn: &Connection, product_id: i32, contract_status: &str) -> i32 {
        conn.execute(
            "INSERT INTO instituicao (nome, cnpj, tipo)
             VALUES ('Instituição teste', '11.222.333/0001-81', 'Publica')",
            [],
        )
        .unwrap();
        let institution_id = conn.last_insert_rowid();
        conn.execute(
            "INSERT INTO contrato (instituicao_id, valor_total_centavos, data_inicio, data_termino, status)
             VALUES (?1, 10000, '2026-01-01', '2026-12-31', ?2)",
            params![institution_id, contract_status],
        )
        .unwrap();
        let contract_id = conn.last_insert_rowid();
        conn.execute(
            "INSERT INTO item_contrato (contrato_id, produto_id, quantidade, preco_unitario_centavos)
             VALUES (?1, ?2, 10, 100)",
            params![contract_id, product_id],
        )
        .unwrap();
        contract_id as i32
    }

    #[test]
    fn cannot_deactivate_product_with_active_contract() {
        let conn = setup_db();
        let product_id = new_product(&conn);
        add_contract_item(&conn, product_id, "EmAndamento");

        assert_eq!(
            deactivate(&conn, product_id).unwrap_err(),
            "Não é possível desativar um produto associado a um contrato ativo"
        );
        assert_eq!(
            repository::find_by_id(&conn, product_id).unwrap().unwrap().status,
            Status::Ativo
        );
    }

    #[test]
    fn can_deactivate_product_with_completed_contract() {
        let conn = setup_db();
        let product_id = new_product(&conn);
        add_contract_item(&conn, product_id, "Concluido");

        assert_eq!(deactivate(&conn, product_id).unwrap().status, Status::Desativado);
    }

    #[test]
    fn database_rejects_deactivation_bypassing_service() {
        let conn = setup_db();
        let product_id = new_product(&conn);
        add_contract_item(&conn, product_id, "QuaseFinalizando");

        assert!(conn
            .execute(
                "UPDATE produto SET status = 'Desativado' WHERE id = ?1",
                [product_id],
            )
            .is_err());
    }
}
