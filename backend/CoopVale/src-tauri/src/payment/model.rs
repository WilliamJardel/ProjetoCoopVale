use crate::contract::model::Contract;
use chrono::NaiveDate;
use rusqlite::{Result, Row};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PaymentData {
    pub contract_id: i32,
    pub amount_cents: i64,
    pub payment_date: NaiveDate,
    pub note: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Payment {
    pub id: i32,
    pub contract_id: i32,
    pub amount_cents: i64,
    pub payment_date: NaiveDate,
    pub note: String,
}

impl Payment {
    pub const COLUMNS: &'static str =
        "id, contrato_id, valor_centavos, data_pagamento, observacao";

    pub fn from_row(row: &Row) -> Result<Self> {
        Ok(Payment {
            id: row.get(0)?,
            contract_id: row.get(1)?,
            amount_cents: row.get(2)?,
            payment_date: row.get(3)?,
            note: row.get(4)?,
        })
    }
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
pub struct ContractBalance {
    pub contract_id: i32,
    pub total_value_cents: i64,
    pub total_paid_cents: i64,
    pub remaining_cents: i64,
}

impl ContractBalance {
    pub fn calculate(contract: &Contract, total_paid_cents: i64) -> Self {
        ContractBalance {
            contract_id: contract.id,
            total_value_cents: contract.total_value_cents,
            total_paid_cents,
            remaining_cents: contract.total_value_cents - total_paid_cents,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::contract::model::ContractStatus;

    #[test]
    fn calculates_remaining_balance() {
        let contract = Contract {
            id: 7,
            institution_id: 1,
            total_value_cents: 1_000_00,
            start_date: NaiveDate::from_ymd_opt(2026, 1, 1).unwrap(),
            end_date: NaiveDate::from_ymd_opt(2026, 12, 31).unwrap(),
            status: ContractStatus::EmAndamento,
        };
        let b = ContractBalance::calculate(&contract, 400_00);
        assert_eq!(b.total_paid_cents, 400_00);
        assert_eq!(b.remaining_cents, 600_00);
        assert_eq!(ContractBalance::calculate(&contract, 1_000_00).remaining_cents, 0);
    }
}