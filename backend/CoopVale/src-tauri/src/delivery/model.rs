use crate::contract::model::{Contract, ContractStatus};
use crate::contractItem::model::ContractItem;
use chrono::NaiveDate;
use rusqlite::{types::Type, Error, Result, Row};
use serde::{Deserialize, Serialize};
use std::str::FromStr;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DeliveryData {
    pub contract_item_id: i32,
    pub solicited_quantity: i64,
    pub delivered_qtd: i64,
    pub delivery_date: NaiveDate,
    pub note: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Delivery {
    pub id: i32,
    pub contract_item: ContractItem,
    pub solicited_quantity: i64,
    pub delivered_qtd: i64,
    pub delivery_date: NaiveDate,
    pub note: String,
    pub contract: Contract,
}

impl Delivery {
    pub const COLUMNS: &'static str = "produto.id, produto.nome, produto.unidade_de_medida, produto.categoria, produto.preco_de_referencia_centavos, produto.status, item_contrato.id, item_contrato.contrato_id, item_contrato.quantidade, item_contrato.quantidade_entregue, item_contrato.preco_unitario_centavos, entrega.id, entrega.quantidade_solicitada, entrega.quantidade_entregue, entrega.data_entrega, entrega.observacao, contrato.id, contrato.instituicao_id, contrato.valor_total_centavos, contrato.data_inicio, contrato.data_termino, contrato.status";

    pub fn from_row(row: &Row) -> Result<Self> {
        let status_text: String = row.get(21)?;
        let status = status_text
            .parse::<ContractStatus>()
            .map_err(|error| Error::FromSqlConversionFailure(21, Type::Text, error.into()))?;

        Ok(Delivery {
            contract_item: ContractItem::from_row(row)?,
            id: row.get(11)?,
            solicited_quantity: row.get(12)?,
            delivered_qtd: row.get(13)?,
            delivery_date: row.get(14)?,
            note: row.get(15)?,
            contract: Contract {
                id: row.get(16)?,
                institution_id: row.get(17)?,
                total_value_cents: row.get(18)?,
                start_date: row.get(19)?,
                end_date: row.get(20)?,
                status,
            },
        })
    }

    pub fn validar_qtd_entregue(&self, qtd: i64) -> bool {
        qtd > 0
    }

}