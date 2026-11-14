use crate::contract::repository as contract_repository;
use crate::db::error_message;
use crate::payment::model::{ContractBalance, Payment, PaymentData};
use crate::payment::repository;
use rusqlite::Connection;

fn balance_excluding(
    conn: &Connection,
    contract_id: i32,
    exclude_payment_id: Option<i32>,
) -> Result<ContractBalance, String> {
    let contract = contract_repository::find_by_id(conn, contract_id)
        .map_err(error_message)?
        .ok_or_else(|| "Contrato não encontrado".to_string())?;
    let paid = repository::sum_by_contract(conn, contract_id, exclude_payment_id)
        .map_err(error_message)?;
    Ok(ContractBalance::calculate(&contract, paid))
}

fn validate(
    conn: &Connection,
    data: &PaymentData,
    exclude_payment_id: Option<i32>,
) -> Result<(), String> {
    if data.contract_id <= 0 {
        return Err("Selecione um contrato".to_string());
    }
    if data.amount_cents <= 0 {
        return Err("O valor do pagamento deve ser maior que zero".to_string());
    }
    let balance = balance_excluding(conn, data.contract_id, exclude_payment_id)?;
    if data.amount_cents > balance.remaining_cents {
        return Err("O pagamento excede o saldo restante do contrato".to_string());
    }
    Ok(())
}

pub fn create(conn: &mut Connection, data: PaymentData) -> Result<Payment, String> {
    let tx = conn.transaction().map_err(error_message)?;
    let payment = (|| -> Result<Payment, String> {
        validate(&tx, &data, None)?;
        let id = repository::insert(&tx, &data).map_err(error_message)?;
        repository::find_by_id(&tx, id)
            .map_err(error_message)?
            .ok_or_else(|| "Pagamento não encontrado após o cadastro".to_string())
    })()?;
    tx.commit().map_err(error_message)?;
    Ok(payment)
}

pub fn update(conn: &mut Connection, id: i32, data: PaymentData) -> Result<Payment, String> {
    let tx = conn.transaction().map_err(error_message)?;
    let payment = (|| -> Result<Payment, String> {
        repository::find_by_id(&tx, id)
            .map_err(error_message)?
            .ok_or_else(|| "Pagamento não encontrado".to_string())?;
        validate(&tx, &data, Some(id))?;
        let affected = repository::update(&tx, id, &data).map_err(error_message)?;
        if affected == 0 {
            return Err("Pagamento não encontrado".to_string());
        }
        repository::find_by_id(&tx, id)
            .map_err(error_message)?
            .ok_or_else(|| "Pagamento não encontrado após a atualização".to_string())
    })()?;
    tx.commit().map_err(error_message)?;
    Ok(payment)
}

pub fn delete(conn: &Connection, id: i32) -> Result<(), String> {
    let affected = repository::delete(conn, id).map_err(error_message)?;
    if affected == 0 {
        return Err("Pagamento não encontrado".to_string());
    }
    Ok(())
}

pub fn get_by_id(conn: &Connection, id: i32) -> Result<Option<Payment>, String> {
    repository::find_by_id(conn, id).map_err(error_message)
}

pub fn list_all(conn: &Connection) -> Result<Vec<Payment>, String> {
    repository::find_all(conn).map_err(error_message)
}

pub fn list_by_contract(conn: &Connection, contract_id: i32) -> Result<Vec<Payment>, String> {
    if contract_id <= 0 {
        return Err("Selecione um contrato".to_string());
    }
    contract_repository::find_by_id(conn, contract_id)
        .map_err(error_message)?
        .ok_or_else(|| "Contrato não encontrado".to_string())?;
    repository::find_by_contract(conn, contract_id).map_err(error_message)
}

pub fn get_contract_balance(conn: &Connection, contract_id: i32) -> Result<ContractBalance, String> {
    if contract_id <= 0 {
        return Err("Selecione um contrato".to_string());
    }
    balance_excluding(conn, contract_id, None)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::contract::model::ContractData;
    use crate::contract::service as contract_service;
    use crate::db;
    use crate::institution::model::{Institution, InstitutionType};
    use crate::institution::service as institution_service;
    use chrono::NaiveDate;

    fn date(y: i32, m: u32, d: u32) -> NaiveDate {
        NaiveDate::from_ymd_opt(y, m, d).unwrap()
    }

    fn setup_db() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        db::init(&conn).unwrap();
        conn
    }

    fn new_contract(conn: &Connection) -> i32 {
        let inst = institution_service::create(
            conn,
            Institution {
                id: None,
                name: "Prefeitura de Quixadá".into(),
                cnpj: "11.222.333/0001-81".into(),
                institution_type: InstitutionType::Publica,
                telephone: None,
                location: None,
            },
        )
        .unwrap()
        .id
        .unwrap();
        contract_service::create(
            conn,
            ContractData {
                institution_id: inst,
                total_value_cents: 1_000_00,
                start_date: date(2026, 1, 1),
                end_date: date(2026, 12, 31),
            },
        )
        .unwrap()
        .id
    }

    fn payment_data(contract_id: i32, cents: i64) -> PaymentData {
        PaymentData {
            contract_id,
            amount_cents: cents,
            payment_date: date(2026, 3, 10),
            note: String::new(),
        }
    }

    #[test]
    fn new_contract_has_full_balance() {
        let conn = setup_db();
        let c = new_contract(&conn);
        let b = get_contract_balance(&conn, c).unwrap();
        assert_eq!(b.total_paid_cents, 0);
        assert_eq!(b.remaining_cents, 1_000_00);
    }

    #[test]
    fn registers_payment_and_updates_balance() {
        let mut conn = setup_db();
        let c = new_contract(&conn);
        let p = create(&mut conn, payment_data(c, 300_00)).unwrap();
        assert_eq!(p.contract_id, c);
        create(&mut conn, payment_data(c, 200_00)).unwrap();
        let b = get_contract_balance(&conn, c).unwrap();
        assert_eq!(b.total_paid_cents, 500_00);
        assert_eq!(b.remaining_cents, 500_00);
        assert_eq!(list_by_contract(&conn, c).unwrap().len(), 2);
    }

    #[test]
    fn allows_paying_exact_remaining_balance() {
        let mut conn = setup_db();
        let c = new_contract(&conn);
        create(&mut conn, payment_data(c, 1_000_00)).unwrap();
        assert_eq!(get_contract_balance(&conn, c).unwrap().remaining_cents, 0);
    }

    #[test]
    fn rejects_payment_above_remaining_balance() {
        let mut conn = setup_db();
        let c = new_contract(&conn);
        create(&mut conn, payment_data(c, 900_00)).unwrap();
        assert_eq!(
            create(&mut conn, payment_data(c, 100_01)).unwrap_err(),
            "O pagamento excede o saldo restante do contrato"
        );
        assert_eq!(get_contract_balance(&conn, c).unwrap().remaining_cents, 100_00);
    }

    #[test]
    fn rejects_zero_negative_and_invalid_contract() {
        let mut conn = setup_db();
        let c = new_contract(&conn);
        for v in [0, -1] {
            assert!(create(&mut conn, payment_data(c, v)).is_err());
        }
        assert_eq!(
            create(&mut conn, payment_data(0, 10_00)).unwrap_err(),
            "Selecione um contrato"
        );
        assert_eq!(
            create(&mut conn, payment_data(999, 10_00)).unwrap_err(),
            "Contrato não encontrado"
        );
    }

    #[test]
    fn update_ignores_own_previous_amount() {
        let mut conn = setup_db();
        let c = new_contract(&conn);
        let p = create(&mut conn, payment_data(c, 600_00)).unwrap();
        update(&mut conn, p.id, payment_data(c, 1_000_00)).unwrap();
        assert_eq!(get_contract_balance(&conn, c).unwrap().remaining_cents, 0);
        assert!(update(&mut conn, p.id, payment_data(c, 1_000_01)).is_err());
    }

    #[test]
    fn delete_restores_balance() {
        let mut conn = setup_db();
        let c = new_contract(&conn);
        let p = create(&mut conn, payment_data(c, 400_00)).unwrap();
        delete(&conn, p.id).unwrap();
        assert_eq!(get_contract_balance(&conn, c).unwrap().remaining_cents, 1_000_00);
        assert_eq!(delete(&conn, p.id).unwrap_err(), "Pagamento não encontrado");
    }

    #[test]
    fn contract_with_payments_cannot_be_deleted() {
        let mut conn = setup_db();
        let c = new_contract(&conn);
        create(&mut conn, payment_data(c, 100_00)).unwrap();
        assert!(contract_service::delete(&conn, c).is_err());
    }

    #[test]
    fn database_blocks_invalid_amount_even_bypassing_service() {
        let conn = setup_db();
        let c = new_contract(&conn);
        assert!(conn
            .execute(
                "INSERT INTO pagamento (contrato_id, valor_centavos, data_pagamento) VALUES (?1, -5, '2026-03-10')",
                [c],
            )
            .is_err());
    }
}