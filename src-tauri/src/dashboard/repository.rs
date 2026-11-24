use crate::contract::model::{Contract, ContractStatus};
use crate::dashboard::model::{
    ContractPaymentRow, ContractProgressRow, ContractWithInstitution, DailyDeliveryRow,
    OpenReceivableRow,
};
use chrono::NaiveDate;
use rusqlite::{params, Connection, Result};

pub fn count_deliveries_by_day(
    conn: &Connection,
    start: NaiveDate,
    end: NaiveDate,
) -> Result<Vec<DailyDeliveryRow>> {
    let mut stmt = conn.prepare(
        "SELECT data_entrega, COUNT(*)
           FROM entrega
          WHERE data_entrega BETWEEN ?1 AND ?2
          GROUP BY data_entrega
          ORDER BY data_entrega",
    )?;
    let rows = stmt.query_map(params![start, end], |row| {
        Ok(DailyDeliveryRow {
            date: row.get(0)?,
            count: row.get(1)?,
        })
    })?;
    rows.collect()
}

pub fn sum_delivered_value(conn: &Connection, start: NaiveDate, end: NaiveDate) -> Result<i64> {
    conn.query_row(
        "SELECT COALESCE(SUM(entrega.quantidade_entregue * item_contrato.preco_unitario_centavos), 0)
           FROM entrega
           JOIN item_contrato ON item_contrato.id = entrega.item_contrato_id
          WHERE entrega.data_entrega BETWEEN ?1 AND ?2",
        params![start, end],
        |row| row.get(0),
    )
}

pub fn open_contracts_receivable(conn: &Connection) -> Result<OpenReceivableRow> {
    conn.query_row(
        "SELECT COUNT(*),
                COALESCE(SUM(MAX(0, contrato.valor_total_centavos - COALESCE(
                    (SELECT SUM(pagamento.valor_centavos)
                       FROM pagamento
                      WHERE pagamento.contrato_id = contrato.id), 0))), 0)
           FROM contrato
          WHERE contrato.status <> ?1",
        [ContractStatus::Concluido.as_str()],
        |row| {
            Ok(OpenReceivableRow {
                contracts_count: row.get(0)?,
                receivable_cents: row.get(1)?,
            })
        },
    )
}

pub fn find_open_contracts_progress(conn: &Connection) -> Result<Vec<ContractProgressRow>> {
    let mut stmt = conn.prepare(
        "SELECT contrato.id,
                instituicao.nome,
                SUM(item_contrato.quantidade * item_contrato.preco_unitario_centavos),
                SUM((item_contrato.quantidade - item_contrato.quantidade_entregue)
                    * item_contrato.preco_unitario_centavos)
           FROM contrato
           JOIN instituicao ON instituicao.id = contrato.instituicao_id
           JOIN item_contrato ON item_contrato.contrato_id = contrato.id
          WHERE contrato.status <> ?1
          GROUP BY contrato.id, instituicao.nome
          ORDER BY contrato.id",
    )?;
    let rows = stmt.query_map([ContractStatus::Concluido.as_str()], |row| {
        Ok(ContractProgressRow {
            contract_id: row.get(0)?,
            institution_name: row.get(1)?,
            total_value_cents: row.get(2)?,
            remaining_value_cents: row.get(3)?,
        })
    })?;
    rows.collect()
}

pub fn find_open_contracts_payment_status(conn: &Connection) -> Result<Vec<ContractPaymentRow>> {
    let mut stmt = conn.prepare(
        "SELECT contrato.id,
                instituicao.nome,
                COALESCE((SELECT SUM(item_contrato.quantidade_entregue * item_contrato.preco_unitario_centavos)
                            FROM item_contrato
                           WHERE item_contrato.contrato_id = contrato.id), 0),
                COALESCE((SELECT SUM(pagamento.valor_centavos)
                            FROM pagamento
                           WHERE pagamento.contrato_id = contrato.id), 0)
           FROM contrato
           JOIN instituicao ON instituicao.id = contrato.instituicao_id
          WHERE contrato.status <> ?1
          ORDER BY contrato.id",
    )?;
    let rows = stmt.query_map([ContractStatus::Concluido.as_str()], |row| {
        Ok(ContractPaymentRow {
            contract_id: row.get(0)?,
            institution_name: row.get(1)?,
            delivered_value_cents: row.get(2)?,
            paid_cents: row.get(3)?,
        })
    })?;
    rows.collect()
}

pub fn find_open_contracts_with_institution(
    conn: &Connection,
) -> Result<Vec<ContractWithInstitution>> {
    let mut stmt = conn.prepare(
        "SELECT contrato.id, contrato.instituicao_id, contrato.valor_total_centavos,
                contrato.data_inicio, contrato.data_termino, contrato.status,
                instituicao.nome
           FROM contrato
           JOIN instituicao ON instituicao.id = contrato.instituicao_id
          WHERE contrato.status <> ?1
          ORDER BY contrato.data_termino, contrato.id",
    )?;
    let rows = stmt.query_map([ContractStatus::Concluido.as_str()], |row| {
        Ok(ContractWithInstitution {
            contract: Contract::from_row(row)?,
            institution_name: row.get(6)?,
        })
    })?;
    rows.collect()
}