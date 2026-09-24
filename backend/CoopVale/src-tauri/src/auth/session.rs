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
}