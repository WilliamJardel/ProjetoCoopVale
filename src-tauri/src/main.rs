#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod db;
mod user;
mod auth;
mod institution;
mod contract;
mod contractItem;
mod delivery;
mod product;
mod payment;
mod dashboard;
mod invoice;

use auth::commands as auth_commands;
use auth::rate_limit::LoginAttempts;
use auth::session::AuthState;
use user::commands as user_commands;

fn main() {
    tauri::Builder::default()
        .manage(AuthState::new())
        .manage(LoginAttempts::new())
        .setup(|_| {
            #[cfg(debug_assertions)]
            {
                let mut conn = db::connect()?;
                let email = "emailteste@gmail.com";
                if user::repository::find_by_email(&conn, email)?.is_none() {
                    user::service::register(&conn, "Usuário de teste", email, "teste123")
                        .map_err(|error| {
                            std::io::Error::other(format!(
                                "Não foi possível criar o usuário de desenvolvimento: {error}"
                            ))
                        })?;
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            user_commands::register_user,
            user_commands::authenticate_user,
            user_commands::get_user,
            user_commands::list_users,
            user_commands::update_profile_name,
            user_commands::change_password,
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
            contract::commands::list_contracts,
            contract::commands::list_contracts_by_institution,
            contractItem::commands::create_contract_item,
            contractItem::commands::update_contract_item,
            contractItem::commands::delete_contract_item,
            contractItem::commands::get_contract_item,
            contractItem::commands::list_contract_items,
            contractItem::commands::list_contract_items_by_contract,
            delivery::commands::create_delivery,
            delivery::commands::update_delivery,
            delivery::commands::delete_delivery,
            delivery::commands::get_delivery,
            delivery::commands::list_deliveries,
            delivery::commands::list_deliveries_by_contract,
            delivery::proof::commands::upload_delivery_proof,
            delivery::proof::commands::get_delivery_proof,
            delivery::proof::commands::list_delivery_proofs,
            delivery::proof::commands::delete_delivery_proof,
            payment::commands::create_payment,
            payment::commands::update_payment,
            payment::commands::delete_payment,
            payment::commands::get_payment,
            payment::commands::list_payments,
            payment::commands::list_payments_by_contract,
            payment::commands::get_contract_balance,
            product::commands::create_product,
            product::commands::update_product,
            product::commands::deactivate_product,
            product::commands::get_product,
            product::commands::list_products,
            dashboard::commands::get_dashboard_summary,
            invoice::commands::register_invoice,
            invoice::commands::update_invoice,
            invoice::commands::remove_invoice,
            invoice::commands::get_invoice,
            invoice::commands::list_invoices,
            invoice::commands::list_invoices_by_contract,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
