use rusqlite::{ffi, Connection, Error, Result};

pub fn connect() -> Result<Connection> {
    let conn = Connection::open("coopvale.db")?;
    init(&conn)?;
    Ok(conn)
}

pub fn init(conn: &Connection) -> Result<()> {
    conn.execute_batch("PRAGMA foreign_keys = ON;")?;
    create_tables(conn)
}

fn create_tables(conn: &Connection) -> Result<()> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS user (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT NOT NULL,
            email       TEXT NOT NULL UNIQUE,
            password    TEXT NOT NULL,
            created_at  TEXT
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS instituicao (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            nome        TEXT NOT NULL,
            cnpj        TEXT NOT NULL UNIQUE,
            tipo        TEXT NOT NULL,
            telefone    TEXT,
            endereco    TEXT
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS contrato (
            id                    INTEGER PRIMARY KEY AUTOINCREMENT,
            instituicao_id        INTEGER NOT NULL
                                  REFERENCES instituicao(id) ON DELETE RESTRICT,
            valor_total_centavos  INTEGER NOT NULL CHECK (valor_total_centavos > 0),
            data_inicio           TEXT NOT NULL,
            data_termino          TEXT NOT NULL,
            status                TEXT NOT NULL DEFAULT 'EmAndamento'
                                  CHECK (status IN ('EmAndamento', 'QuaseFinalizando', 'Concluido')),
            CHECK (data_termino > data_inicio)
        )",
        [],
    )?;
    conn.execute(
        "CREATE TABLE IF NOT EXISTS produto (
            id                           INTEGER PRIMARY KEY AUTOINCREMENT,
            nome                         TEXT NOT NULL,
            unidade_de_medida            TEXT NOT NULL,
            categoria                    TEXT NOT NULL,
            preco_de_referencia_centavos INTEGER NOT NULL CHECK (preco_de_referencia_centavos > 0),
            status                       TEXT NOT NULL DEFAULT 'Ativo'
                                        CHECK (status IN ('Ativo', 'Desativado'))
        )",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_contrato_instituicao ON contrato(instituicao_id)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_contrato_status_termino ON contrato(status, data_termino)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_produto_status ON produto(status)",
        [],
    )?;
    conn.execute(
        "CREATE TABLE IF NOT EXISTS item_contrato (
            id                         INTEGER PRIMARY KEY AUTOINCREMENT,
            contrato_id                INTEGER NOT NULL
                                       REFERENCES contrato(id) ON DELETE RESTRICT,
            produto_id                 INTEGER NOT NULL
                                       REFERENCES produto(id) ON DELETE RESTRICT,
            quantidade                 INTEGER NOT NULL CHECK (quantidade > 0),
            quantidade_entregue        INTEGER NOT NULL DEFAULT 0
                                       CHECK (quantidade_entregue >= 0 AND quantidade_entregue <= quantidade),
            preco_unitario_centavos    INTEGER NOT NULL CHECK (preco_unitario_centavos > 0)
        )",
        [],
    )?;
    let has_contract_id = {
        let mut stmt = conn.prepare("PRAGMA table_info(item_contrato)")?;
        let columns = stmt.query_map([], |row| row.get::<_, String>(1))?;
        columns
            .collect::<Result<Vec<_>>>()?
            .iter()
            .any(|column| column == "contrato_id")
    };
    if !has_contract_id {
        conn.execute(
            "ALTER TABLE item_contrato ADD COLUMN contrato_id INTEGER REFERENCES contrato(id) ON DELETE RESTRICT",
            [],
        )?;
    }
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_item_contrato_produto ON item_contrato(produto_id)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_item_por_contrato ON item_contrato(contrato_id)",
        [],
    )?;
    Ok(())
}

pub fn is_unique_violation(e: &Error) -> bool {
    matches!(e, Error::SqliteFailure(err, _) if err.extended_code == ffi::SQLITE_CONSTRAINT_UNIQUE)
}

pub fn error_message(e: Error) -> String {
    if let Error::SqliteFailure(err, _) = &e {
        match err.extended_code {
            ffi::SQLITE_CONSTRAINT_UNIQUE => {
                return "Já existe um registro com esses dados".to_string()
            }
            ffi::SQLITE_CONSTRAINT_FOREIGNKEY => {
                return "Operação não permitida: existem registros vinculados".to_string()
            }
            ffi::SQLITE_CONSTRAINT_CHECK => {
                return "Os dados informados violam uma regra de integridade".to_string()
            }
            _ => {}
        }
    }
    e.to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn migrates_existing_contract_items_without_losing_rows() {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(
            "CREATE TABLE produto (id INTEGER PRIMARY KEY, status TEXT NOT NULL);
             INSERT INTO produto (id, status) VALUES (1, 'Ativo');
             CREATE TABLE item_contrato (
                 id INTEGER PRIMARY KEY,
                 produto_id INTEGER NOT NULL REFERENCES produto(id),
                 quantidade INTEGER NOT NULL,
                 quantidade_entregue INTEGER NOT NULL,
                 preco_unitario_centavos INTEGER NOT NULL
             );
             INSERT INTO item_contrato VALUES (1, 1, 10, 2, 500);",
        )
        .unwrap();

        init(&conn).unwrap();

        let migrated_item: (i32, Option<i32>) = conn
            .query_row(
                "SELECT id, contrato_id FROM item_contrato WHERE id = 1",
                [],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .unwrap();
        assert_eq!(migrated_item, (1, None));
    }
}