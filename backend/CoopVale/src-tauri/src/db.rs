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
        "CREATE INDEX IF NOT EXISTS idx_contrato_instituicao ON contrato(instituicao_id)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_contrato_status_termino ON contrato(status, data_termino)",
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