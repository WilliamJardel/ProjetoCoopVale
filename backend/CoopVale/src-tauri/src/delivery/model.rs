use crate::contract::model::{Contract, ContractStatus};
use crate::contractItem::model::ContractItem;
use chrono::NaiveDate;
use rusqlite::{types::Type, Error, Result, Row};
use serde::{Deserialize, Serialize};
use std::str::FromStr;

#[derive(Debug, Serialize, Deserialize, Clone, Copy, PartialEq, Eq)]
pub enum DeliveryStatus {
    Pendente,
    Entregue,
}

impl DeliveryStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            DeliveryStatus::Pendente => "Pendente",
            DeliveryStatus::Entregue => "Entregue",
        }
    }
}

impl FromStr for DeliveryStatus {
    type Err = String;

    fn from_str(value: &str) -> std::result::Result<Self, Self::Err> {
        match value {
            "Pendente" => Ok(DeliveryStatus::Pendente),
            "Entregue" => Ok(DeliveryStatus::Entregue),
            _ => Err(format!("Status de entrega inválido: {value}")),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DeliveryData {
    pub contract_item_id: i32,
    pub solicited_quantity: i64,
    pub delivered_qtd: i64,
    pub delivery_date: NaiveDate,
    pub note: String,
    pub status: DeliveryStatus,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Delivery {
    pub id: i32,
    pub contract_item: ContractItem,
    pub solicited_quantity: i64,
    pub delivered_qtd: i64,
    pub delivery_date: NaiveDate,
    pub note: String,
    pub status: DeliveryStatus,
    pub contract: Contract,
}

impl Delivery {
    pub const COLUMNS: &'static str = "produto.id, produto.nome, produto.unidade_de_medida, produto.categoria, produto.preco_de_referencia_centavos, produto.status, item_contrato.id, item_contrato.contrato_id, item_contrato.quantidade, item_contrato.quantidade_entregue, item_contrato.preco_unitario_centavos, entrega.id, entrega.quantidade_solicitada, entrega.quantidade_entregue, entrega.data_entrega, entrega.observacao, entrega.status, contrato.id, contrato.instituicao_id, contrato.valor_total_centavos, contrato.data_inicio, contrato.data_termino, contrato.status";

    pub fn from_row(row: &Row) -> Result<Self> {
        let delivery_status_text: String = row.get(16)?;
        let delivery_status = delivery_status_text
            .parse::<DeliveryStatus>()
            .map_err(|error| Error::FromSqlConversionFailure(16, Type::Text, error.into()))?;

        let contract_status_text: String = row.get(22)?;
        let contract_status = contract_status_text
            .parse::<ContractStatus>()
            .map_err(|error| Error::FromSqlConversionFailure(22, Type::Text, error.into()))?;

        Ok(Delivery {
            contract_item: ContractItem::from_row(row)?,
            id: row.get(11)?,
            solicited_quantity: row.get(12)?,
            delivered_qtd: row.get(13)?,
            delivery_date: row.get(14)?,
            note: row.get(15)?,
            status: delivery_status,
            contract: Contract {
                id: row.get(17)?,
                institution_id: row.get(18)?,
                total_value_cents: row.get(19)?,
                start_date: row.get(20)?,
                end_date: row.get(21)?,
                status: contract_status,
            },
        })
    }

    pub fn validar_qtd_entregue(&self, qtd: i64) -> bool {
        qtd > 0
    }

}