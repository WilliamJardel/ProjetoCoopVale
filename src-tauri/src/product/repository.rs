use crate::product::model::{Product, ProductData, Status};
use rusqlite::{params, Connection, OptionalExtension, Result};

pub fn insert(conn: &Connection, data: &ProductData) -> Result<i32> {
    conn.execute(
        "INSERT INTO produto (nome, unidade_de_medida, categoria, preco_de_referencia_centavos, status)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![
            data.name,
            data.measurement_unit,
            data.category,
            data.reference_price_cents,
            Status::Ativo.as_str()
        ],
    )?;
    Ok(conn.last_insert_rowid() as i32)
}

pub fn update(conn: &Connection, id: i32, data: &ProductData) -> Result<usize> {
    conn.execute(
        "UPDATE produto
            SET nome = ?1, unidade_de_medida = ?2, categoria = ?3, preco_de_referencia_centavos = ?4
          WHERE id = ?5",
        params![
            data.name,
            data.measurement_unit,
            data.category,
            data.reference_price_cents,
            id
        ],
    )
}

pub fn deactivate(conn: &Connection, id: i32) -> Result<usize> {
    conn.execute(
        "UPDATE produto SET status = ?1 WHERE id = ?2",
        params![Status::Desativado.as_str(), id],
    )
}

pub fn has_active_contract(conn: &Connection, id: i32) -> Result<bool> {
    conn.query_row(
        "SELECT EXISTS (
            SELECT 1
              FROM item_contrato ic
              JOIN contrato c ON c.id = ic.contrato_id
             WHERE ic.produto_id = ?1
               AND c.status != 'Concluido'
        )",
        [id],
        |row| row.get::<_, i64>(0),
    )
    .map(|exists| exists != 0)
}

pub fn find_by_id(conn: &Connection, id: i32) -> Result<Option<Product>> {
    conn.query_row(
        &format!("SELECT {} FROM produto WHERE id = ?1", Product::COLUMNS),
        [id],
        Product::from_row,
    )
    .optional()
}

pub fn find_all(conn: &Connection) -> Result<Vec<Product>> {
    let mut stmt = conn.prepare(&format!(
        "SELECT {} FROM produto ORDER BY nome ASC, id ASC",
        Product::COLUMNS
    ))?;
    let rows = stmt.query_map([], Product::from_row)?;
    rows.collect()
}