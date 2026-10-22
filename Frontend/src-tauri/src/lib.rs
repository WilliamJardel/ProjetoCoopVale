mod auth;
mod db;
mod user;
pub mod contract;
pub mod institution;
use crate::contract::commands;

use auth::rate_limit::LoginAttempts;
mod auth_session {
    pub use crate::auth::session::AuthState;
}

use auth::{current_session, is_authenticated, login, logout};
use auth_session::AuthState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    if let Err(err) = db::connect() {
        eprintln!("Erro ao inicializar o banco: {}", db::error_message(err));
    }

    if let Ok(conn) = db::connect() {
        if let Err(err) = db::seed_institutions(&conn) {
            eprintln!("Erro ao executar seed: {}", err);
        }
    }

    tauri::Builder::default()
        // USA .new() CONFORME IMPLEMENTADO NAS ESTRUTURAS
        .manage(AuthState::new())
        .manage(LoginAttempts::new())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            login,
            logout,
            current_session,
            is_authenticated,
            commands::create_contract,
            commands::update_contract,
            commands::delete_contract,
            commands::get_contract,
            commands::list_contracts,
            commands::list_contracts_by_institution,
            crate::institution::commands::create_institution,
            crate::institution::commands::update_institution,
            crate::institution::commands::delete_institution,
            crate::institution::commands::get_institution,
            crate::institution::commands::list_institutions
        ])
        .run(tauri::generate_context!())
        .expect("error while building tauri application");
}