use rusqlite::{Connection, Result};

pub fn connect() -> Result<Connection> {
    let conn = Connection::open("coopvale.db")?;
    create_tables(&conn)?;
    Ok(conn)
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
    Ok(())
}