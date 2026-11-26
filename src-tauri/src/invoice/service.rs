use crate::db::error_message;
use crate::invoice::model::{
    Invoice, InvoiceCheck, InvoiceData, InvoiceStatus, MAX_INVOICE_NUMBER_LEN,
};
use crate::invoice::repository;
use chrono::{Local, NaiveDate};
use rusqlite::Connection;

fn normalize_and_validate(data: InvoiceData, today: NaiveDate) -> Result<InvoiceData, String> {
    let number = data.number.trim().to_string();
    if number.is_empty() {
        return Err("Informe o número da nota fiscal".to_string());
    }
    if number.chars().count() > MAX_INVOICE_NUMBER_LEN {
        return Err(format!(
            "O número da nota fiscal deve ter no máximo {MAX_INVOICE_NUMBER_LEN} caracteres"
        ));
    }
    if !number
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || matches!(c, '-' | '/' | '.'))
    {
        return Err(
            "O número da nota fiscal só pode conter letras, números, '-', '/' e '.'".to_string(),
        );
    }
    if data.amount_cents <= 0 {
        return Err("O valor da nota fiscal deve ser maior que zero".to_string());
    }
    if data.issue_date > today {
        return Err("A data de emissão não pode ser futura".to_string());
    }
    Ok(InvoiceData { number, ..data })
}

fn load_payment_invoice(conn: &Connection, payment_id: i32) -> Result<Invoice, String> {
    if payment_id <= 0 {
        return Err("Selecione um pagamento".to_string());
    }
    repository::find_by_payment(conn, payment_id)
        .map_err(error_message)?
        .ok_or_else(|| "Pagamento não encontrado".to_string())
}

fn save_checked(
    conn: &mut Connection,
    payment_id: i32,
    data: InvoiceData,
    today: NaiveDate,
    must_have_invoice: bool,
) -> Result<InvoiceCheck, String> {
    let data = normalize_and_validate(data, today)?;
    let tx = conn.transaction().map_err(error_message)?;
    let invoice = (|| -> Result<Invoice, String> {
        let current = load_payment_invoice(&tx, payment_id)?;
        let has_invoice = current.number.is_some();
        if must_have_invoice && !has_invoice {
            return Err("Este pagamento ainda não possui nota fiscal registrada".to_string());
        }
        if !must_have_invoice && has_invoice {
            return Err("Este pagamento já possui nota fiscal. Altere a nota existente".to_string());
        }
        if repository::number_in_use(&tx, &data.number, payment_id).map_err(error_message)? {
            return Err("Já existe um pagamento com esse número de nota fiscal".to_string());
        }
        repository::save(&tx, payment_id, &data).map_err(error_message)?;
        load_payment_invoice(&tx, payment_id)
    })()?;
    tx.commit().map_err(error_message)?;
    Ok(InvoiceCheck::from_invoice(invoice))
}

pub fn register(
    conn: &mut Connection,
    payment_id: i32,
    data: InvoiceData,
) -> Result<InvoiceCheck, String> {
    save_checked(conn, payment_id, data, Local::now().date_naive(), false)
}

pub fn update(
    conn: &mut Connection,
    payment_id: i32,
    data: InvoiceData,
) -> Result<InvoiceCheck, String> {
    save_checked(conn, payment_id, data, Local::now().date_naive(), true)
}

pub fn remove(conn: &mut Connection, payment_id: i32) -> Result<Invoice, String> {
    let tx = conn.transaction().map_err(error_message)?;
    let invoice = (|| -> Result<Invoice, String> {
        let current = load_payment_invoice(&tx, payment_id)?;
        if current.number.is_none() {
            return Err("Este pagamento não possui nota fiscal registrada".to_string());
        }
        repository::clear(&tx, payment_id).map_err(error_message)?;
        load_payment_invoice(&tx, payment_id)
    })()?;
    tx.commit().map_err(error_message)?;
    Ok(invoice)
}

pub fn get_by_payment(conn: &Connection, payment_id: i32) -> Result<Option<Invoice>, String> {
    if payment_id <= 0 {
        return Err("Selecione um pagamento".to_string());
    }
    repository::find_by_payment(conn, payment_id).map_err(error_message)
}

pub fn list(conn: &Connection, status: Option<InvoiceStatus>) -> Result<Vec<Invoice>, String> {
    repository::find_all(conn, status).map_err(error_message)
}

pub fn list_by_contract(conn: &Connection, contract_id: i32) -> Result<Vec<Invoice>, String> {
    if contract_id <= 0 {
        return Err("Selecione um contrato".to_string());
    }
    crate::contract::repository::find_by_id(conn, contract_id)
        .map_err(error_message)?
        .ok_or_else(|| "Contrato não encontrado".to_string())?;
    repository::find_by_contract(conn, contract_id).map_err(error_message)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::contract::model::ContractData;
    use crate::contract::service as contract_service;
    use crate::db;
    use crate::institution::model::{Institution, InstitutionType};
    use crate::institution::service as institution_service;
    use crate::payment::model::PaymentData;
    use crate::payment::service as payment_service;

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
                contract_number: "CP 01/2026".into(),
                institution_id: inst,
                total_value_cents: 10_000_00,
                start_date: date(2026, 1, 1),
                end_date: date(2026, 12, 31),
            },
        )
        .unwrap()
        .id
    }

    fn new_payment(conn: &mut Connection, contract_id: i32, cents: i64) -> i32 {
        payment_service::create(
            conn,
            PaymentData {
                contract_id,
                amount_cents: cents,
                payment_date: date(2026, 3, 10),
                note: String::new(),
            },
        )
        .unwrap()
        .id
    }

    fn nf(number: &str, cents: i64) -> InvoiceData {
        InvoiceData {
            number: number.into(),
            amount_cents: cents,
            issue_date: date(2026, 3, 9),
        }
    }

    #[test]
    fn new_payment_starts_pending_without_invoice() {
        let mut conn = setup_db();
        let c = new_contract(&conn);
        let p = new_payment(&mut conn, c, 500_00);
        let inv = get_by_payment(&conn, p).unwrap().unwrap();
        assert_eq!(inv.status, InvoiceStatus::Pendente);
        assert!(inv.number.is_none() && inv.amount_cents.is_none());
        assert_eq!(list(&conn, Some(InvoiceStatus::Pendente)).unwrap().len(), 1);
    }

    #[test]
    fn matching_value_is_checked() {
        let mut conn = setup_db();
        let c = new_contract(&conn);
        let p = new_payment(&mut conn, c, 500_00);
        let r = register(&mut conn, p, nf(" 1234 ", 500_00)).unwrap();
        assert!(r.matches);
        assert_eq!(r.invoice.status, InvoiceStatus::Conferida);
        assert_eq!(r.invoice.number.as_deref(), Some("1234"));
        assert_eq!(r.difference_cents, 0);
    }

    #[test]
    fn different_value_is_saved_as_divergent_with_alert() {
        let mut conn = setup_db();
        let c = new_contract(&conn);
        let p = new_payment(&mut conn, c, 500_00);
        let r = register(&mut conn, p, nf("1234", 450_00)).unwrap();
        assert!(!r.matches);
        assert_eq!(r.invoice.status, InvoiceStatus::Divergente);
        assert_eq!(r.difference_cents, -50_00);
        assert!(r.message.starts_with("Divergência"));
        assert_eq!(list(&conn, Some(InvoiceStatus::Divergente)).unwrap().len(), 1);
    }

    #[test]
    fn update_rechecks_and_remove_goes_back_to_pending() {
        let mut conn = setup_db();
        let c = new_contract(&conn);
        let p = new_payment(&mut conn, c, 500_00);
        register(&mut conn, p, nf("1234", 450_00)).unwrap();
        let fixed = update(&mut conn, p, nf("1234", 500_00)).unwrap();
        assert_eq!(fixed.invoice.status, InvoiceStatus::Conferida);
        let removed = remove(&mut conn, p).unwrap();
        assert_eq!(removed.status, InvoiceStatus::Pendente);
        assert!(removed.number.is_none());
        assert_eq!(
            remove(&mut conn, p).unwrap_err(),
            "Este pagamento não possui nota fiscal registrada"
        );
    }

    #[test]
    fn changing_payment_amount_revalidates_invoice() {
        let mut conn = setup_db();
        let c = new_contract(&conn);
        let p = new_payment(&mut conn, c, 500_00);
        register(&mut conn, p, nf("1234", 500_00)).unwrap();
        payment_service::update(
            &mut conn,
            p,
            PaymentData {
                contract_id: c,
                amount_cents: 600_00,
                payment_date: date(2026, 3, 10),
                note: String::new(),
            },
        )
        .unwrap();
        assert_eq!(
            get_by_payment(&conn, p).unwrap().unwrap().status,
            InvoiceStatus::Divergente
        );
    }

    #[test]
    fn rejects_invalid_input() {
        let mut conn = setup_db();
        let c = new_contract(&conn);
        let p = new_payment(&mut conn, c, 500_00);
        assert_eq!(
            register(&mut conn, p, nf("   ", 500_00)).unwrap_err(),
            "Informe o número da nota fiscal"
        );
        assert!(register(&mut conn, p, nf("12 34;--", 500_00)).is_err());
        assert!(register(&mut conn, p, nf(&"1".repeat(21), 500_00)).is_err());
        for v in [0, -1] {
            assert!(register(&mut conn, p, nf("1", v)).is_err());
        }
        let future = InvoiceData {
            issue_date: Local::now().date_naive() + chrono::Duration::days(1),
            ..nf("1", 500_00)
        };
        assert_eq!(
            register(&mut conn, p, future).unwrap_err(),
            "A data de emissão não pode ser futura"
        );
        assert_eq!(
            register(&mut conn, 0, nf("1", 500_00)).unwrap_err(),
            "Selecione um pagamento"
        );
        assert_eq!(
            register(&mut conn, 999, nf("1", 500_00)).unwrap_err(),
            "Pagamento não encontrado"
        );
        assert_eq!(get_by_payment(&conn, p).unwrap().unwrap().status, InvoiceStatus::Pendente);
    }

    #[test]
    fn blocks_duplicate_registration_and_duplicate_number() {
        let mut conn = setup_db();
        let c = new_contract(&conn);
        let p1 = new_payment(&mut conn, c, 500_00);
        let p2 = new_payment(&mut conn, c, 300_00);
        register(&mut conn, p1, nf("ab-1", 500_00)).unwrap();
        assert!(register(&mut conn, p1, nf("zz-9", 500_00))
            .unwrap_err()
            .contains("já possui nota fiscal"));
        assert_eq!(
            register(&mut conn, p2, nf("AB-1", 300_00)).unwrap_err(),
            "Já existe um pagamento com esse número de nota fiscal"
        );
        assert_eq!(
            update(&mut conn, p2, nf("x", 300_00)).unwrap_err(),
            "Este pagamento ainda não possui nota fiscal registrada"
        );
        assert!(update(&mut conn, p1, nf("ab-1", 500_00)).unwrap().matches);
    }

    #[test]
    fn lists_by_contract_and_validates_contract() {
        let mut conn = setup_db();
        let c = new_contract(&conn);
        new_payment(&mut conn, c, 100_00);
        new_payment(&mut conn, c, 200_00);
        assert_eq!(list_by_contract(&conn, c).unwrap().len(), 2);
        assert_eq!(list_by_contract(&conn, 0).unwrap_err(), "Selecione um contrato");
        assert_eq!(list_by_contract(&conn, 999).unwrap_err(), "Contrato não encontrado");
    }

    #[test]
    fn database_blocks_invalid_status_and_duplicate_number_bypassing_service() {
        let mut conn = setup_db();
        let c = new_contract(&conn);
        let p1 = new_payment(&mut conn, c, 100_00);
        let p2 = new_payment(&mut conn, c, 100_00);
        assert!(conn
            .execute("UPDATE pagamento SET status_conferencia = 'X' WHERE id = ?1", [p1])
            .is_err());
        conn.execute("UPDATE pagamento SET numero_nota_fiscal = '7' WHERE id = ?1", [p1]).unwrap();
        assert!(conn
            .execute("UPDATE pagamento SET numero_nota_fiscal = '7' WHERE id = ?1", [p2])
            .is_err());
    }
}
