use rusqlite::{types::Type, Error, Result, Row};
use serde::{Deserialize, Serialize};
use std::str::FromStr;

#[derive(Debug, Serialize, Deserialize, Clone, Copy, PartialEq, Eq)]
pub enum Status {
    Ativo,
    Desativado,
}

impl Status {
    pub fn as_str(&self) -> &'static str {
        match self {
            Status::Ativo => "Ativo",
            Status::Desativado => "Desativado",
        }
    }
}

impl FromStr for Status {
    type Err = String;

    fn from_str(s: &str) -> std::result::Result<Self, Self::Err> {
        match s {
            "Ativo" => Ok(Status::Ativo),
            "Desativado" => Ok(Status::Desativado),
            _ => Err(format!("Status de produto inválido: {}", s)),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProductData {
    pub name: String,
    pub measurement_unit: String,
    pub category: String,
    pub reference_price_cents: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Product {
    pub id: i32,
    pub name: String,
    pub measurement_unit: String,
    pub category: String,
    pub reference_price_cents: i64,
    pub status: Status,
}

impl Product {
    pub const COLUMNS: &'static str =
        "id, nome, unidade_de_medida, categoria, preco_de_referencia_centavos, status";

    pub fn from_row(row: &Row) -> Result<Self> {
        let status_str: String = row.get(5)?;
        let status = status_str
            .parse::<Status>()
            .map_err(|e| Error::FromSqlConversionFailure(5, Type::Text, e.into()))?;

        Ok(Product {
            id: row.get(0)?,
            name: row.get(1)?,
            measurement_unit: row.get(2)?,
            category: row.get(3)?,
            reference_price_cents: row.get(4)?,
            status,
        })
    }
}