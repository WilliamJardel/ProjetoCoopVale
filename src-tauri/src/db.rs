use chrono::Utc;
use rusqlite::{ffi, Connection, Error, Result};

mod compiled_admin {
    include!(concat!(env!("OUT_DIR"), "/compiled_admin.rs"));
}

pub fn connect() -> Result<Connection> {
    let conn = Connection::open("coopvale.db")?;
    init(&conn)?;
    seed_compiled_admin(&conn)?;
    Ok(conn)
}

fn seed_compiled_admin(conn: &Connection) -> Result<()> {
    let Some((email, password_hash)) = compiled_admin::INITIAL_ADMIN else {
        return Ok(());
    };

    seed_user_with_hash(conn, email, password_hash)
}

fn seed_user_with_hash(conn: &Connection, email: &str, password_hash: &str) -> Result<()> {
    if crate::user::repository::find_by_email(conn, email)?.is_none() {
        let user = crate::user::model::User {
            id: None,
            name: "Administrador".to_string(),
            email: email.to_string(),
            password: password_hash.to_string(),
            created_at: Some(Utc::now().to_rfc3339()),
        };
        crate::user::repository::insert(conn, &user)?;
    }

    Ok(())
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
    conn.execute(
        "CREATE TABLE IF NOT EXISTS entrega (
            id                     INTEGER PRIMARY KEY AUTOINCREMENT,
            item_contrato_id       INTEGER NOT NULL
                                   REFERENCES item_contrato(id) ON DELETE RESTRICT,
            quantidade_solicitada INTEGER NOT NULL CHECK (quantidade_solicitada > 0),
            quantidade_entregue   INTEGER NOT NULL
                                   CHECK (quantidade_entregue > 0 AND quantidade_entregue <= quantidade_solicitada),
            data_entrega           TEXT NOT NULL,
            observacao             TEXT NOT NULL DEFAULT '',
            status                 TEXT NOT NULL DEFAULT 'Entregue'
                       CHECK (status IN ('Pendente', 'Entregue'))
        )",
        [],
    )?;
    let has_delivery_status = {
        let mut stmt = conn.prepare("PRAGMA table_info(entrega)")?;
        let columns = stmt.query_map([], |row| row.get::<_, String>(1))?;
        columns
            .collect::<Result<Vec<_>>>()?
            .iter()
            .any(|column| column == "status")
    };
    if !has_delivery_status {
        conn.execute(
            "ALTER TABLE entrega ADD COLUMN status TEXT NOT NULL DEFAULT 'Entregue'
             CHECK (status IN ('Pendente', 'Entregue'))",
            [],
        )?;
    }

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_entrega_por_item ON entrega(item_contrato_id)",
        [],
    )?;
    conn.execute(
        "CREATE TABLE IF NOT EXISTS pagamento (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            contrato_id     INTEGER NOT NULL
                            REFERENCES contrato(id) ON DELETE RESTRICT,
            valor_centavos  INTEGER NOT NULL CHECK (valor_centavos > 0),
            data_pagamento  TEXT NOT NULL,
            observacao      TEXT NOT NULL DEFAULT ''
        )",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_pagamento_por_contrato ON pagamento(contrato_id)",
        [],
    )?;
    migrate_invoice_columns(conn)
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

fn column_exists(conn: &Connection, table: &str, column: &str) -> Result<bool> {
    let mut stmt = conn.prepare(&format!("PRAGMA table_info({table})"))?;
    let columns = stmt.query_map([], |row| row.get::<_, String>(1))?;
    Ok(columns.collect::<Result<Vec<_>>>()?.iter().any(|c| c == column))
}

fn migrate_invoice_columns(conn: &Connection) -> Result<()> {
    let columns = [
        ("numero_nota_fiscal", "TEXT"),
        (
            "valor_nota_fiscal_centavos",
            "INTEGER CHECK (valor_nota_fiscal_centavos IS NULL OR valor_nota_fiscal_centavos > 0)",
        ),
        ("data_emissao_nf", "TEXT"),
        (
            "status_conferencia",
            "TEXT NOT NULL DEFAULT 'Pendente' \
             CHECK (status_conferencia IN ('Pendente', 'Conferida', 'Divergente'))",
        ),
    ];
    for (name, definition) in columns {
        if !column_exists(conn, "pagamento", name)? {
            conn.execute(
                &format!("ALTER TABLE pagamento ADD COLUMN {name} {definition}"),
                [],
            )?;
        }
    }
    conn.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_pagamento_numero_nf
             ON pagamento(numero_nota_fiscal COLLATE NOCASE)
          WHERE numero_nota_fiscal IS NOT NULL",
        [],
    )?;
    Ok(())
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

    #[test]
    fn seeds_initial_user_once_without_overwriting_existing_credentials() {
        let conn = Connection::open_in_memory().unwrap();
        init(&conn).unwrap();

        let password_hash = bcrypt::hash("senha-segura", bcrypt::DEFAULT_COST).unwrap();
        seed_user_with_hash(&conn, "admin@coopvale.com", &password_hash).unwrap();
        seed_user_with_hash(&conn, "admin@coopvale.com", "hash diferente").unwrap();

        assert!(
            crate::user::service::authenticate(&conn, "admin@coopvale.com", "senha-segura")
                .unwrap()
                .is_some()
        );
        assert!(
            crate::user::service::authenticate(&conn, "admin@coopvale.com", "outra-senha")
                .unwrap()
                .is_none()
        );
    }

    #[test]
    fn migrates_existing_payments_to_pending_invoice_status() {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(
            "CREATE TABLE pagamento (
                 id INTEGER PRIMARY KEY AUTOINCREMENT,
                 contrato_id INTEGER NOT NULL,
                 valor_centavos INTEGER NOT NULL,
                 data_pagamento TEXT NOT NULL,
                 observacao TEXT NOT NULL DEFAULT ''
             );
             INSERT INTO pagamento (contrato_id, valor_centavos, data_pagamento)
             VALUES (1, 5000, '2026-03-10');",
        )
        .unwrap();

        migrate_invoice_columns(&conn).unwrap();
        migrate_invoice_columns(&conn).unwrap();

        let row: (String, Option<String>) = conn
            .query_row(
                "SELECT status_conferencia, numero_nota_fiscal FROM pagamento WHERE id = 1",
                [],
                |r| Ok((r.get(0)?, r.get(1)?)),
            )
            .unwrap();
        assert_eq!(row, ("Pendente".to_string(), None));
    }

    #[test]
    fn seeds_compiled_admin_when_build_credentials_are_configured() {
        let Some((email, password_hash)) = compiled_admin::INITIAL_ADMIN else {
            return;
        };
        let conn = Connection::open_in_memory().unwrap();
        init(&conn).unwrap();

        seed_compiled_admin(&conn).unwrap();
        let user = crate::user::repository::find_by_email(&conn, email)
            .unwrap()
            .unwrap();
        let password = std::env::var("COOPVALE_ADMIN_PASSWORD").unwrap();

        assert_eq!(user.password, password_hash);
        assert!(user.verify_password(&password));
    }
}