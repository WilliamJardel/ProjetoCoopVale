#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod db;
mod user;
mod auth;
mod institution;
mod contract;

use auth::commands as auth_commands;
use auth::rate_limit::LoginAttempts;
use auth::session::AuthState;
use user::commands as user_commands;

fn main() {
    tauri::Builder::default()
        .manage(AuthState::new())
        .manage(LoginAttempts::new())
        .invoke_handler(tauri::generate_handler![
            user_commands::register_user,
            user_commands::authenticate_user,
            user_commands::get_user,
            user_commands::list_users,
            auth_commands::login,
            auth_commands::logout,
            auth_commands::current_session,
            auth_commands::is_authenticated,
            institution::commands::create_institution,
            institution::commands::update_institution,
            institution::commands::delete_institution,
            institution::commands::get_institution,
            institution::commands::list_institutions,
            contract::commands::create_contract,
            contract::commands::update_contract,
            contract::commands::delete_contract,
            contract::commands::get_contract,
            contract::commands::list_contracts,
            contract::commands::list_contracts_by_institution,
        ])
        .run(tauri::generate_context!())
        .expect("erro ao rodar a aplicação Tauri");
}