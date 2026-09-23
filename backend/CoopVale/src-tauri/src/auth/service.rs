use rusqlite::Connection;
use chrono::Utc;
use crate::user::service as user_service;
use crate::auth::session::Session;
use crate::auth::rate_limit::LoginAttempts;

pub fn login(
    conn: &Connection,
    attempts: &LoginAttempts,
    email: &str,
    password: &str,
) -> Result<Session, String> {
    attempts.check(email)?;

    match user_service::authenticate(conn, email, password)? {
        Some(user) => {
            attempts.reset(email);
            Ok(Session {
                user_id: user.id.ok_or("Usuário sem id")?,
                name: user.name,
                email: user.email,
                logged_in_at: Utc::now().to_rfc3339(),
            })
        }
        None => {
            attempts.register_failure(email);
            Err("E-mail ou senha inválidos".to_string())
        }
    }
}