use chrono::NaiveDate;
use rusqlite::{types::Type, Error, Result, Row};
use serde::{Deserialize, Serialize};
use std::str::FromStr;

pub const MAX_INVOICE_NUMBER_LEN: usize = 20;

#[derive(Debug, Serialize, Deserialize, Clone, Copy, PartialEq, Eq)]
pub enum InvoiceStatus {
    Pendente,
    Conferida,
    Divergente,
}

impl InvoiceStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            InvoiceStatus::Pendente => "Pendente",
            InvoiceStatus::Conferida => "Conferida",
            InvoiceStatus::Divergente => "Divergente",
        }
    }
}

impl FromStr for InvoiceStatus {
    type Err = String;

    fn from_str(s: &str) -> std::result::Result<Self, Self::Err> {
        match s {
            "Pendente" => Ok(InvoiceStatus::Pendente),
            "Conferida" => Ok(InvoiceStatus::Conferida),
            "Divergente" => Ok(InvoiceStatus::Divergente),
            _ => Err(format!("Status de conferência inválido: {}", s)),
        }
    }
}


#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct InvoiceData {
    pub number: String,
    pub amount_cents: i64,
    pub issue_date: NaiveDate,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
pub struct Invoice {
    pub payment_id: i32,
    pub contract_id: i32,
    pub payment_amount_cents: i64,
    pub payment_date: NaiveDate,
    pub number: Option<String>,
    pub amount_cents: Option<i64>,
    pub issue_date: Option<NaiveDate>,
    pub status: InvoiceStatus,
}

impl Invoice {
    pub const COLUMNS: &'static str = "id, contrato_id, valor_centavos, data_pagamento, \
         numero_nota_fiscal, valor_nota_fiscal_centavos, data_emissao_nf, status_conferencia";

    pub fn from_row(row: &Row) -> Result<Self> {
        let status_str: String = row.get(7)?;
        let status = status_str
            .parse::<InvoiceStatus>()
            .map_err(|e| Error::FromSqlConversionFailure(7, Type::Text, e.into()))?;

        Ok(Invoice {
            payment_id: row.get(0)?,
            contract_id: row.get(1)?,
            payment_amount_cents: row.get(2)?,
            payment_date: row.get(3)?,
            number: row.get(4)?,
            amount_cents: row.get(5)?,
            issue_date: row.get(6)?,
            status,
        })
    }

    pub fn difference_cents(&self) -> Option<i64> {
        self.amount_cents.map(|a| a - self.payment_amount_cents)
    }
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
pub struct InvoiceCheck {
    pub invoice: Invoice,
    pub matches: bool,
    pub difference_cents: i64,
    pub message: String,
}

impl InvoiceCheck {
    pub fn from_invoice(invoice: Invoice) -> Self {
        let difference_cents = invoice.difference_cents().unwrap_or(0);
        let matches = invoice.status == InvoiceStatus::Conferida;
        let message = if matches {
            "Nota fiscal conferida: o valor corresponde ao pagamento".to_string()
        } else {
            format!(
                "Divergência: a nota fiscal difere em {} ({} do pagamento)",
                format_brl(difference_cents.abs()),
                if difference_cents > 0 { "acima" } else { "abaixo" }
            )
        };
        InvoiceCheck {
            invoice,
            matches,
            difference_cents,
            message,
        }
    }
}

fn format_brl(cents: i64) -> String {
    format!("R$ {},{:02}", cents / 100, cents % 100)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn invoice(payment: i64, nf: Option<i64>, status: InvoiceStatus) -> Invoice {
        Invoice {
            payment_id: 1,
            contract_id: 1,
            payment_amount_cents: payment,
            payment_date: NaiveDate::from_ymd_opt(2026, 3, 10).unwrap(),
            number: nf.map(|_| "123".to_string()),
            amount_cents: nf,
            issue_date: nf.map(|_| NaiveDate::from_ymd_opt(2026, 3, 9).unwrap()),
            status,
        }
    }

    #[test]
    fn status_round_trips_through_str() {
        for s in [
            InvoiceStatus::Pendente,
            InvoiceStatus::Conferida,
            InvoiceStatus::Divergente,
        ] {
            assert_eq!(s.as_str().parse::<InvoiceStatus>().unwrap(), s);
        }
        assert!("Outro".parse::<InvoiceStatus>().is_err());
    }

    #[test]
    fn divergence_message_reports_direction_and_amount() {
        let above = InvoiceCheck::from_invoice(invoice(100_00, Some(150_50), InvoiceStatus::Divergente));
        assert!(!above.matches);
        assert_eq!(above.difference_cents, 50_50);
        assert_eq!(
            above.message,
            "Divergência: a nota fiscal difere em R$ 50,50 (acima do pagamento)"
        );
        let below = InvoiceCheck::from_invoice(invoice(100_00, Some(99_95), InvoiceStatus::Divergente));
        assert_eq!(
            below.message,
            "Divergência: a nota fiscal difere em R$ 0,05 (abaixo do pagamento)"
        );
    }
}