use crate::contract::model::{Contract, ContractData, ContractStatus};
use crate::contract::repository;
use crate::db::error_message;
use crate::institution;
use rusqlite::Connection;

fn validate(conn: &Connection, d: &ContractData) -> Result<(), String> {
    if d.institution_id <= 0 {
        return Err("Selecione a instituição contratante".to_string());
    }

    if d.total_value_cents <= 0 {
        return Err("O valor do contrato deve ser maior que zero".to_string());
    }
    if d.end_date <= d.start_date {
        return Err("A data de término deve ser posterior à data de início".to_string());
    }
    let exists = institution::repository::find_by_id(conn, d.institution_id)
        .map_err(error_message)?
        .is_some();
    if !exists {
        return Err("Instituição não encontrada".to_string());
    }
    Ok(())
}

pub fn create(conn: &Connection, data: ContractData) -> Result<Contract, String> {
    validate(conn, &data)?;
    let id = repository::insert(conn, &data).map_err(error_message)?;
    repository::find_by_id(conn, id)
        .map_err(error_message)?
        .ok_or_else(|| "Contrato não encontrado após o cadastro".to_string())
}

pub fn update(conn: &Connection, id: i32, data: ContractData) -> Result<Contract, String> {
    let current = repository::find_by_id(conn, id)
        .map_err(error_message)?
        .ok_or_else(|| "Contrato não encontrado".to_string())?;


    if current.status == ContractStatus::Concluido {
        return Err("Contratos concluídos não podem ser editados".to_string());
    }
    validate(conn, &data)?;

    repository::update(conn, id, &data).map_err(error_message)?;
    repository::find_by_id(conn, id)
        .map_err(error_message)?
        .ok_or_else(|| "Contrato não encontrado".to_string())
}

pub fn delete(conn: &Connection, id: i32) -> Result<(), String> {
    let affected = repository::delete(conn, id).map_err(error_message)?;
    if affected == 0 {
        return Err("Contrato não encontrado".to_string());
    }
    Ok(())
}

pub fn get_by_id(conn: &Connection, id: i32) -> Result<Option<Contract>, String> {
    repository::find_by_id(conn, id).map_err(error_message)
}

pub fn list_all(conn: &Connection) -> Result<Vec<Contract>, String> {
    repository::find_all(conn).map_err(error_message)
}

pub fn list_by_institution(conn: &Connection, institution_id: i32) -> Result<Vec<Contract>, String> {
    repository::find_by_institution(conn, institution_id).map_err(error_message)
}

#[cfg(test)]
mod tests {
    use super::*;
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

    fn new_institution(conn: &Connection, cnpj: &str) -> i32 {
        institution_service::create(
            conn,
            Institution {
                id: None,
                name: "Prefeitura de Quixadá".into(),
                cnpj: cnpj.into(),
                institution_type: InstitutionType::Publica,
                telephone: None,
                location: None,
            },
        )
        .unwrap()
        .id
        .unwrap()
    }

    fn sample_data(institution_id: i32) -> ContractData {
        ContractData {
            institution_id,
            total_value_cents: 150_000_00,
            start_date: date(2026, 1, 1),
            end_date: date(2026, 12, 31),
        }
    }

    #[test]
    fn creates_valid_contract_as_in_progress() {
        let conn = setup_db();
        let inst = new_institution(&conn, "11.222.333/0001-81");
        let c = create(&conn, sample_data(inst)).unwrap();
        assert_eq!(c.status, ContractStatus::EmAndamento);
        assert_eq!(c.total_value_cents, 150_000_00);
        assert_eq!(c.end_date, date(2026, 12, 31));
    }

    #[test]
    fn rejects_zero_or_negative_value() {
        let conn = setup_db();
        let inst = new_institution(&conn, "11.222.333/0001-81");
        for v in [0, -1] {
            let mut d = sample_data(inst);
            d.total_value_cents = v;
            assert!(create(&conn, d).is_err());
        }
    }

    #[test]
    fn rejects_end_date_not_after_start_date() {
        let conn = setup_db();
        let inst = new_institution(&conn, "11.222.333/0001-81");
        let mut d = sample_data(inst);
        d.end_date = d.start_date;
        assert!(create(&conn, d).is_err());
    }

    #[test]
    fn rejects_nonexistent_institution() {
        let conn = setup_db();
        assert_eq!(
            create(&conn, sample_data(999)).unwrap_err(),
            "Instituição não encontrada"
        );
    }

    #[test]
    fn does_not_delete_institution_with_contracts() {
        let conn = setup_db();
        let inst = new_institution(&conn, "11.222.333/0001-81");
        let c = create(&conn, sample_data(inst)).unwrap();

        assert!(institution_service::delete(&conn, inst)
            .unwrap_err()
            .contains("1 contrato"));

        delete(&conn, c.id).unwrap();
        institution_service::delete(&conn, inst).unwrap();
    }

    #[test]
    fn database_blocks_delete_even_bypassing_service() {
        let conn = setup_db();
        let inst = new_institution(&conn, "11.222.333/0001-81");
        create(&conn, sample_data(inst)).unwrap();
        assert!(conn
            .execute("DELETE FROM instituicao WHERE id = ?1", [inst])
            .is_err());
    }

    #[test]
    fn database_blocks_invalid_data_even_bypassing_service() {
        let conn = setup_db();
        let inst = new_institution(&conn, "11.222.333/0001-81");
        let sql = "INSERT INTO contrato (instituicao_id, valor_total_centavos, data_inicio, data_termino)
                   VALUES (?1, ?2, ?3, ?4)";
        assert!(conn
            .execute(sql, rusqlite::params![inst, -5, "2026-01-01", "2026-12-31"])
            .is_err());
        assert!(conn
            .execute(sql, rusqlite::params![inst, 100, "2026-12-31", "2026-01-01"])
            .is_err());
    }

    #[test]
    fn completed_contract_cannot_be_edited() {
        let conn = setup_db();
        let inst = new_institution(&conn, "11.222.333/0001-81");
        let c = create(&conn, sample_data(inst)).unwrap();
        conn.execute("UPDATE contrato SET status = 'Concluido' WHERE id = ?1", [c.id])
            .unwrap();
        assert!(update(&conn, c.id, sample_data(inst)).is_err());
    }

    #[test]
    fn edit_updates_data_and_preserves_status() {
        let conn = setup_db();
        let inst = new_institution(&conn, "11.222.333/0001-81");
        let c = create(&conn, sample_data(inst)).unwrap();
        let mut d = sample_data(inst);
        d.total_value_cents = 200_000_00;
        let updated = update(&conn, c.id, d).unwrap();
        assert_eq!(updated.total_value_cents, 200_000_00);
        assert_eq!(updated.status, ContractStatus::EmAndamento);
    }

    #[test]
    fn institution_history_includes_all_statuses() {
        let conn = setup_db();
        let inst = new_institution(&conn, "11.222.333/0001-81");
        let other = new_institution(&conn, "12.ABC.345/01DE-35");
        let a = create(&conn, sample_data(inst)).unwrap();
        create(&conn, sample_data(inst)).unwrap();
        create(&conn, sample_data(other)).unwrap();
        conn.execute("UPDATE contrato SET status = 'Concluido' WHERE id = ?1", [a.id])
            .unwrap();
        assert_eq!(list_by_institution(&conn, inst).unwrap().len(), 2);
        assert_eq!(list_all(&conn).unwrap().len(), 3);
    }

    #[test]
    fn duplicate_cnpj_with_different_mask_is_rejected() {
        let conn = setup_db();
        new_institution(&conn, "11.222.333/0001-81");
        let duplicate = Institution {
            id: None,
            name: "Outra".into(),
            cnpj: "11222333000181".into(),
            institution_type: InstitutionType::Privada,
            telephone: None,
            location: None,
        };
        assert_eq!(
            institution_service::create(&conn, duplicate).unwrap_err(),
            "Já existe uma instituição cadastrada com esse CNPJ"
        );
    }

    #[test]
    fn institution_with_invalid_cnpj_is_rejected() {
        let conn = setup_db();
        let bad = Institution {
            id: None,
            name: "X".into(),
            cnpj: "11.222.333/0001-82".into(),
            institution_type: InstitutionType::Privada,
            telephone: None,
            location: None,
        };
        assert!(institution_service::create(&conn, bad).is_err());
    }
}