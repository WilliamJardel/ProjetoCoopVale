use rusqlite::Connection;
use crate::user::model::User;         
use crate::user::repository;
use regex::Regex;      
use bcrypt::{hash, DEFAULT_COST};

pub fn register(conn: &Connection, name: &str, email: &str, raw_password: &str) -> Result<i32, String> {
    let email_regex = Regex::new(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$").unwrap();
    if !email_regex.is_match(email) {
        return Err("Formato de e-mail inválido".to_string());
    }

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

pub fn update_name(conn: &Connection, user_id: i32, name: &str) -> Result<String, String> {
    let name = name.trim();
    if name.is_empty() {
        return Err("O nome não pode ficar vazio".to_string());
    }
    if name.chars().count() > 100 {
        return Err("O nome deve ter no máximo 100 caracteres".to_string());
    }
    let updated = repository::update_name(conn, user_id, name).map_err(|e| e.to_string())?;
    if updated == 0 {
        return Err("Usuário não encontrado".to_string());
    }
    Ok(name.to_string())
}

pub fn change_password(
    conn: &Connection,
    user_id: i32,
    current_password: &str,
    new_password: &str,
) -> Result<(), String> {
    if new_password.len() < 6 {
        return Err("A nova senha deve ter pelo menos 6 caracteres".to_string());
    }
    let user = repository::find_by_id(conn, user_id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Usuário não encontrado".to_string())?;
    if !user.verify_password(current_password) {
        return Err("A senha atual está incorreta".to_string());
    }
    let password_hash = hash(new_password, DEFAULT_COST).map_err(|e| e.to_string())?;
    let updated = repository::update_password(conn, user_id, &password_hash)
        .map_err(|e| e.to_string())?;
    if updated == 0 {
        return Err("Usuário não encontrado".to_string());
    }
    Ok(())
}
