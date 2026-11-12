mod auth;
mod contract;
mod db;
mod institution;
mod user;

use auth::commands as auth_commands;
use auth::rate_limit::LoginAttempts;
use auth::session::AuthState;
use contract::commands as contract_commands;
use institution::commands as institution_commands;
use user::commands as user_commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AuthState::new())
        .manage(LoginAttempts::new())
        .setup(|_| {
            db::connect()?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            user_commands::register_user,
            user_commands::authenticate_user,
            user_commands::get_user,
            user_commands::list_users,
            auth_commands::login,
            auth_commands::logout,
            auth_commands::current_session,
            auth_commands::is_authenticated,
            institution_commands::create_institution,
            institution_commands::update_institution,
            institution_commands::delete_institution,
            institution_commands::get_institution,
            institution_commands::list_institutions,
            contract_commands::create_contract,
            contract_commands::update_contract,
            contract_commands::delete_contract,
            contract_commands::get_contract,
            contract_commands::list_contracts,
            contract_commands::list_contracts_by_institution,
        ])
        .run(tauri::generate_context!())
        .expect("erro ao iniciar a aplicação CoopVale");
}
