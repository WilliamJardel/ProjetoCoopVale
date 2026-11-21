use crate::auth::session::AuthState;
use crate::dashboard::model::DashboardSummary;
use crate::dashboard::service;
use crate::db;
use chrono::Local;
use tauri::State;

#[tauri::command]
pub fn get_dashboard_summary(auth: State<AuthState>) -> Result<DashboardSummary, String> {
    auth.require_authenticated()?;
    let conn = db::connect().map_err(|e| e.to_string())?;
    service::get_summary(&conn, Local::now().date_naive())
}