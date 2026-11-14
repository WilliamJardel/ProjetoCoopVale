use serde::{Serialize, Deserialize};
use std::sync::Mutex;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Session {
    pub user_id: i32,
    pub name: String,
    pub email: String,
    pub logged_in_at: String,
}

pub struct AuthState(pub Mutex<Option<Session>>);

impl AuthState {
    pub fn new() -> Self {
        AuthState(Mutex::new(None))
    }

    pub fn require_authenticated(&self) -> Result<Session, String> {
        self.0
            .lock()
            .map_err(|_| "Erro interno ao verificar a sessão".to_string())?
            .clone()
            .ok_or_else(|| "Acesso negado: faça login para continuar".to_string())
    }
}