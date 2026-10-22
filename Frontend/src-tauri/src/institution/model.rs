use rusqlite::{types::Type, Error, Result, Row};
use serde::{Deserialize, Serialize};
use std::str::FromStr;

#[derive(Debug, Serialize, Deserialize, Clone, Copy, PartialEq, Eq)]
pub enum InstitutionType {
    Publica,
    Privada,
}

impl InstitutionType {
    pub fn as_str(&self) -> &'static str {
        match self {
            InstitutionType::Publica => "Publica",
            InstitutionType::Privada => "Privada",
        }
    }
}

impl FromStr for InstitutionType {
    type Err = String;

    fn from_str(s: &str) -> std::result::Result<Self, Self::Err> {
        match s {
            "Publica" => Ok(InstitutionType::Publica),
            "Privada" => Ok(InstitutionType::Privada),
            _ => Err(format!("Tipo de instituição inválido: {}", s)),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Institution {
    pub id: Option<i32>,
    pub name: String,
    pub cnpj: String,
    pub institution_type: InstitutionType,
    pub telephone: Option<String>, 
    pub location: Option<String>,
}

impl Institution {
    pub const COLUMNS: &'static str = "id, nome, cnpj, tipo, telefone, endereco";

    pub fn from_row(row: &Row) -> Result<Self> {
        let type_str: String = row.get(3)?;
        let institution_type = type_str
            .parse::<InstitutionType>()
            .map_err(|e| Error::FromSqlConversionFailure(3, Type::Text, e.into()))?;

        Ok(Institution {
            id: row.get(0)?,
            name: row.get(1)?,
            cnpj: row.get(2)?,
            institution_type,
            telephone: row.get(4)?,
            location: row.get(5)?,
        })
    }
}