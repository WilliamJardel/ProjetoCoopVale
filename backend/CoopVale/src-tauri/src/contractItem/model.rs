use rusqlite::{Result, Row};
use serde::{Deserialize, Serialize};
use crate::Product::model::Product;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ContractItemData {
    pub contract_id: i32,
    pub product: Product,
    pub item_qtd: i32,
    pub delivered_qtd: i32,
    pub unit_price: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ContractItem {
    pub id: i32,
    pub contract_id: Option<i32>,
    pub product: Product,
    pub item_qtd: i32,
    pub delivered_qtd: i32,
    pub unit_price: i64,
}

impl ContractItem {
    pub const COLUMNS: &'static str =
        "produto.id, produto.nome, produto.unidade_de_medida, produto.categoria, produto.preco_de_referencia_centavos, produto.status, item_contrato.id, item_contrato.contrato_id, item_contrato.quantidade, item_contrato.quantidade_entregue, item_contrato.preco_unitario_centavos";

    pub fn from_row(row: &Row) -> Result<Self> {
        Ok(ContractItem {
            product: Product::from_row(row)?,
            id: row.get(6)?,
            contract_id: row.get(7)?,
            item_qtd: row.get(8)?,
            delivered_qtd: row.get(9)?,
            unit_price: row.get(10)?,
        })
    }

    pub fn calcular_valor_total_item(&self) -> Option<i64> {
        i64::from(self.item_qtd).checked_mul(self.unit_price)
    }

    pub fn calcular_saldo_item(&self) -> Option<i64> {
        let remaining_qtd = i64::from(self.item_qtd).checked_sub(i64::from(self.delivered_qtd))?;
        remaining_qtd.checked_mul(self.unit_price)
    }

    pub fn ultrapassou_o_saldo(&self) -> bool {
        self.delivered_qtd > self.item_qtd
    }

    pub fn registrar_entrega(&mut self, qtd: i32) -> std::result::Result<(), String> {
        if qtd <= 0 {
            return Err("A quantidade entregue deve ser maior que zero".to_string());
        }

        let delivered_qtd = self
            .delivered_qtd
            .checked_add(qtd)
            .ok_or_else(|| "A quantidade entregue excede o limite numérico".to_string())?;
        if delivered_qtd > self.item_qtd {
            return Err("A entrega excede a quantidade restante do item".to_string());
        }

        self.delivered_qtd = delivered_qtd;
        Ok(())
    }
}

