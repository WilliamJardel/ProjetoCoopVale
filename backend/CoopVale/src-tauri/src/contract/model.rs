use chrono::NaiveDate;
use rusqlite::{types::Type, Error, Result, Row};
use serde::{Deserialize, Serialize};
use std::str::FromStr;

pub const EXPIRATION_ALERT_DAYS: i64 = 30;

#[derive(Debug, Serialize, Deserialize, Clone, Copy, PartialEq, Eq)]
pub enum ContractStatus {
    EmAndamento,
    QuaseFinalizando,
    Concluido,
}

impl ContractStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            ContractStatus::EmAndamento => "EmAndamento",
            ContractStatus::QuaseFinalizando => "QuaseFinalizando",
            ContractStatus::Concluido => "Concluido",
        }
    }
}

impl FromStr for ContractStatus {
    type Err = String;

    fn from_str(s: &str) -> std::result::Result<Self, Self::Err> {
        match s {
            "EmAndamento" => Ok(ContractStatus::EmAndamento),
            "QuaseFinalizando" => Ok(ContractStatus::QuaseFinalizando),
            "Concluido" => Ok(ContractStatus::Concluido),
            _ => Err(format!("Status de contrato inválido: {}", s)),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ContractData {
    pub institution_id: i32,
    pub total_value_cents: i64,
    pub start_date: NaiveDate,
    pub end_date: NaiveDate,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Contract {
    pub id: i32,
    pub institution_id: i32,
    pub total_value_cents: i64,
    pub start_date: NaiveDate,
    pub end_date: NaiveDate,
    pub status: ContractStatus,
}

impl Contract {
    pub const COLUMNS: &'static str =
        "id, instituicao_id, valor_total_centavos, data_inicio, data_termino, status";

    pub fn from_row(row: &Row) -> Result<Self> {
        let status_str: String = row.get(5)?;
        let status = status_str
            .parse::<ContractStatus>()
            .map_err(|e| Error::FromSqlConversionFailure(5, Type::Text, e.into()))?;

        Ok(Contract {
            id: row.get(0)?,
            institution_id: row.get(1)?,
            total_value_cents: row.get(2)?,
            start_date: row.get(3)?,
            end_date: row.get(4)?,
            status,
        })
    }

    pub fn is_near_expiration(&self, today: NaiveDate) -> bool {
        self.status != ContractStatus::Concluido
            && (self.end_date - today).num_days() <= EXPIRATION_ALERT_DAYS
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn contract(end: (i32, u32, u32), status: ContractStatus) -> Contract {
        Contract {
            id: 1,
            institution_id: 1,
            total_value_cents: 100_00,
            start_date: NaiveDate::from_ymd_opt(2026, 1, 1).unwrap(),
            end_date: NaiveDate::from_ymd_opt(end.0, end.1, end.2).unwrap(),
            status,
        }
    }

    #[test]
    fn alerts_at_30_days_or_less_before_end() {
        let today = NaiveDate::from_ymd_opt(2026, 10, 1).unwrap();
        assert!(contract((2026, 10, 31), ContractStatus::EmAndamento).is_near_expiration(today)); 
        assert!(!contract((2026, 11, 1), ContractStatus::EmAndamento).is_near_expiration(today)); 
    }

    #[test]
    fn overdue_and_not_completed_alerts_but_completed_does_not() {
        let today = NaiveDate::from_ymd_opt(2026, 10, 1).unwrap();
        assert!(contract((2026, 9, 1), ContractStatus::EmAndamento).is_near_expiration(today));
        assert!(!contract((2026, 9, 1), ContractStatus::Concluido).is_near_expiration(today));
    }
}