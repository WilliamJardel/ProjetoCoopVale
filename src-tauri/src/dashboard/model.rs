use crate::contract::model::Contract;
use chrono::NaiveDate;
use serde::{Deserialize, Serialize};

pub const NEAR_LIMIT_PERCENT: i64 = 10;
pub const CRITICAL_EXPIRATION_DAYS: i64 = 7;

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub struct DashboardSummary {
    pub reference_date: NaiveDate,
    pub week_start: NaiveDate,
    pub week_end: NaiveDate,
    pub deliveries: WeeklyDeliveries,
    pub finance: FinanceSummary,
    pub contracts_near_limit: Vec<NearLimitContract>,
    pub alerts: Vec<DashboardAlert>,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
pub struct WeeklyDeliveries {
    pub total_count: i64,

    pub by_day: Vec<DailyDeliveries>,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
pub struct DailyDeliveries {
    pub date: NaiveDate,
    pub count: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
pub struct FinanceSummary {
    pub week_delivered_cents: i64,
    pub open_contracts_receivable_cents: i64,
    pub open_contracts_count: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub struct NearLimitContract {
    pub contract_id: i32,
    pub institution_name: String,
    pub total_value_cents: i64,
    pub remaining_value_cents: i64,
    pub remaining_percent: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone, Copy, PartialEq, Eq)]
pub enum AlertKind {
    ContractExpiring,
    ContractOverdue,
    PendingPayment,
}


#[derive(Debug, Serialize, Deserialize, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub enum AlertSeverity {
    Critical,
    Warning,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
pub struct DashboardAlert {
    pub kind: AlertKind,
    pub severity: AlertSeverity,
    pub contract_id: i32,
    pub message: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DailyDeliveryRow {
    pub date: NaiveDate,
    pub count: i64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct OpenReceivableRow {
    pub contracts_count: i64,
    pub receivable_cents: i64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ContractProgressRow {
    pub contract_id: i32,
    pub institution_name: String,
    pub total_value_cents: i64,
    pub remaining_value_cents: i64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ContractPaymentRow {
    pub contract_id: i32,
    pub institution_name: String,
    pub delivered_value_cents: i64,
    pub paid_cents: i64,
}

#[derive(Debug, Clone)]
pub struct ContractWithInstitution {
    pub contract: Contract,
    pub institution_name: String,
}