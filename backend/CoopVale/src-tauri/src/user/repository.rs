use rusqlite::{Connection, Result};
use crate::user::model::User; 

pub fn insert(conn: &Connection, user: &User) -> Result<i32> {
    conn.execute(
        "INSERT INTO user (name, email, password, created_at) VALUES (?1, ?2, ?3, ?4)",
        (&user.name, &user.email, &user.password, &user.created_at),
    )?;
    Ok(conn.last_insert_rowid() as i32)
}

pub fn find_by_email(conn: &Connection, email: &str) -> Result<Option<User>> {
    let mut stmt = conn.prepare(
        "SELECT id, name, email, password, created_at FROM user WHERE email = ?1",
    )?;
    let mut rows = stmt.query([email])?;
    match rows.next()? {
        Some(row) => Ok(Some(User::from_row(row)?)),
        None => Ok(None),
    }
}

pub fn find_by_id(conn: &Connection, id: i32) -> Result<Option<User>> {
    let mut stmt = conn.prepare(
        "SELECT id, name, email, password, created_at FROM user WHERE id = ?1",
    )?;
    let mut rows = stmt.query([id])?;
    match rows.next()? {
        Some(row) => Ok(Some(User::from_row(row)?)),
        None => Ok(None),
    }
}

pub fn find_all(conn: &Connection) -> Result<Vec<User>> {
    let mut stmt = conn.prepare(
        "SELECT id, name, email, password, created_at FROM user ORDER BY id",
    )?;
    let rows = stmt.query_map([], |row| User::from_row(row))?;
    rows.collect()
}