use rusqlite::Connection;
use crate::user::model::User;         
use crate::user::repository;          

pub fn register(conn: &Connection, name: &str, email: &str, raw_password: &str) -> Result<i32, String> {
    if raw_password.len() < 6 {
        return Err("A senha deve ter pelo menos 6 caracteres".to_string());
    }
    if repository::find_by_email(conn, email).map_err(|e| e.to_string())?.is_some() {
        return Err("Já existe um usuário com esse e-mail".to_string());
    }
    let user = User::new(name, email, raw_password).map_err(|e| e.to_string())?;
    repository::insert(conn, &user).map_err(|e| e.to_string())
}

pub fn authenticate(conn: &Connection, email: &str, raw_password: &str) -> Result<Option<User>, String> {
    let user = repository::find_by_email(conn, email).map_err(|e| e.to_string())?;
    match user {
        Some(u) => {
            if u.verify_password(raw_password) {
                Ok(Some(u))
            } else {
                Ok(None)
            }
        },
        None => Ok(None), 
    }
}

pub fn get_by_id(conn: &Connection, id: i32) -> Result<Option<User>, String> {
    repository::find_by_id(conn, id).map_err(|e| e.to_string())
}

pub fn list_all(conn: &Connection) -> Result<Vec<User>, String> {
    repository::find_all(conn).map_err(|e| e.to_string())
}