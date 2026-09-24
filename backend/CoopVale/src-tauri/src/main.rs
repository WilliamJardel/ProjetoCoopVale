mod db;
mod user;
mod auth;

use user::commands as user_commands;
use auth::commands as auth_commands;
use auth::session::AuthState;
use auth::rate_limit::LoginAttempts;

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
        ])
        .run(tauri::generate_context!())
        .expect("erro ao rodar a aplicação Tauri");
}