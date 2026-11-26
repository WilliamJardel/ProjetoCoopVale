use crate::dashboard::model::{
    AlertKind, AlertSeverity, ContractPaymentRow, ContractProgressRow, DailyDeliveries,
    DashboardAlert, DashboardSummary, FinanceSummary, NearLimitContract, WeeklyDeliveries,
    CRITICAL_EXPIRATION_DAYS, NEAR_LIMIT_PERCENT,
};
use crate::dashboard::repository;
use crate::db::error_message;
use chrono::{Datelike, Duration, NaiveDate};
use rusqlite::Connection;


pub fn get_summary(conn: &Connection, today: NaiveDate) -> Result<DashboardSummary, String> {
    let (week_start, week_end) = week_bounds(today);

    let deliveries = build_weekly_deliveries(conn, week_start, week_end)?;

    let open = repository::open_contracts_receivable(conn).map_err(error_message)?;
    let finance = FinanceSummary {
        week_delivered_cents: repository::sum_delivered_value(conn, week_start, week_end)
            .map_err(error_message)?,
        open_contracts_receivable_cents: open.receivable_cents,
        open_contracts_count: open.contracts_count,
    };

    let contracts_near_limit = repository::find_open_contracts_progress(conn)
        .map_err(error_message)
        .map(select_near_limit)?;

    let mut alerts = build_expiration_alerts(conn, today)?;
    alerts.extend(build_pending_payment_alerts(conn)?);
    alerts.sort_by_key(|alert| alert.severity);

    Ok(DashboardSummary {
        reference_date: today,
        week_start,
        week_end,
        deliveries,
        finance,
        contracts_near_limit,
        alerts,
    })
}

pub fn week_bounds(today: NaiveDate) -> (NaiveDate, NaiveDate) {
    let monday = today - Duration::days(i64::from(today.weekday().num_days_from_monday()));
    (monday, monday + Duration::days(6))
}

fn build_weekly_deliveries(
    conn: &Connection,
    week_start: NaiveDate,
    week_end: NaiveDate,
) -> Result<WeeklyDeliveries, String> {
    let rows = repository::count_deliveries_by_day(conn, week_start, week_end)
        .map_err(error_message)?;

    let by_day: Vec<DailyDeliveries> = (0..7)
        .map(|offset| {
            let date = week_start + Duration::days(offset);
            let count = rows
                .iter()
                .find(|row| row.date == date)
                .map_or(0, |row| row.count);
            DailyDeliveries { date, count }
        })
        .collect();

    Ok(WeeklyDeliveries {
        total_count: by_day.iter().map(|day| day.count).sum(),
        by_day,
    })
}

fn select_near_limit(rows: Vec<ContractProgressRow>) -> Vec<NearLimitContract> {
    let mut near_limit: Vec<NearLimitContract> = rows
        .into_iter()
        .filter(|row| row.total_value_cents > 0)
        .filter(|row| {
            i128::from(row.remaining_value_cents) * 100
                <= i128::from(row.total_value_cents) * i128::from(NEAR_LIMIT_PERCENT)
        })
        .map(|row| NearLimitContract {
            remaining_percent: percent(row.remaining_value_cents, row.total_value_cents),
            contract_id: row.contract_id,
            institution_name: row.institution_name,
            total_value_cents: row.total_value_cents,
            remaining_value_cents: row.remaining_value_cents,
        })
        .collect();

    near_limit.sort_by(|a, b| {
        a.remaining_percent
            .total_cmp(&b.remaining_percent)
            .then(a.contract_id.cmp(&b.contract_id))
    });
    near_limit
}

fn build_expiration_alerts(
    conn: &Connection,
    today: NaiveDate,
) -> Result<Vec<DashboardAlert>, String> {
    let contracts =
        repository::find_open_contracts_with_institution(conn).map_err(error_message)?;

    let alerts = contracts
        .into_iter()
        .filter(|item| item.contract.is_near_expiration(today))
        .map(|item| {
            let end_date = item.contract.end_date;
            let days_left = (end_date - today).num_days();

            if days_left < 0 {
                DashboardAlert {
                    kind: AlertKind::ContractOverdue,
                    severity: AlertSeverity::Critical,
                    contract_id: item.contract.id,
                    message: format!(
                        "O contrato com {} venceu em {} e ainda não foi concluído",
                        item.institution_name,
                        format_date(end_date)
                    ),
                }
            } else {
                let severity = if days_left <= CRITICAL_EXPIRATION_DAYS {
                    AlertSeverity::Critical
                } else {
                    AlertSeverity::Warning
                };
                DashboardAlert {
                    kind: AlertKind::ContractExpiring,
                    severity,
                    contract_id: item.contract.id,
                    message: format!(
                        "O contrato com {} vence {} ({})",
                        item.institution_name,
                        days_label(days_left),
                        format_date(end_date)
                    ),
                }
            }
        })
        .collect();
    Ok(alerts)
}

fn build_pending_payment_alerts(conn: &Connection) -> Result<Vec<DashboardAlert>, String> {
    let rows = repository::find_open_contracts_payment_status(conn).map_err(error_message)?;
    Ok(rows.into_iter().filter_map(pending_payment_alert).collect())
}

fn pending_payment_alert(row: ContractPaymentRow) -> Option<DashboardAlert> {
    let pending_cents = row.delivered_value_cents - row.paid_cents;
    if pending_cents <= 0 {
        return None;
    }
    Some(DashboardAlert {
        kind: AlertKind::PendingPayment,
        severity: AlertSeverity::Warning,
        contract_id: row.contract_id,
        message: format!(
            "O contrato com {} tem {} entregues e ainda não recebidos",
            row.institution_name,
            format_brl(pending_cents)
        ),
    })
}

fn percent(part: i64, total: i64) -> f64 {
    let value = part as f64 / total as f64 * 100.0;
    (value * 100.0).round() / 100.0
}

fn format_date(date: NaiveDate) -> String {
    date.format("%d/%m/%Y").to_string()
}

fn days_label(days: i64) -> String {
    match days {
        0 => "hoje".to_string(),
        1 => "amanhã".to_string(),
        n => format!("em {n} dias"),
    }
}

fn format_brl(cents: i64) -> String {
    let sign = if cents < 0 { "-" } else { "" };
    let abs = cents.unsigned_abs();
    let digits = (abs / 100).to_string();

    let mut grouped = String::new();
    for (index, ch) in digits.chars().enumerate() {
        if index > 0 && (digits.len() - index) % 3 == 0 {
            grouped.push('.');
        }
        grouped.push(ch);
    }
    format!("{sign}R$ {grouped},{:02}", abs % 100)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::contract::model::ContractData;
    use crate::contract::service as contract_service;
    use crate::db;
    use crate::institution::model::{Institution, InstitutionType};
    use crate::institution::service as institution_service;
    use rusqlite::params;

    fn date(y: i32, m: u32, d: u32) -> NaiveDate {
        NaiveDate::from_ymd_opt(y, m, d).unwrap()
    }

    fn today() -> NaiveDate {
        date(2026, 11, 12)
    }

    fn setup_db() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        db::init(&conn).unwrap();
        conn
    }

    fn new_institution(conn: &Connection, name: &str, cnpj: &str) -> i32 {
        institution_service::create(
            conn,
            Institution {
                id: None,
                name: name.into(),
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

    fn new_contract(conn: &Connection, institution_id: i32, total_cents: i64, end: NaiveDate) -> i32 {
        contract_service::create(
            conn,
            ContractData {
                contract_number: "CP 01/2026".into(),
                institution_id,
                total_value_cents: total_cents,
                start_date: date(2026, 1, 1),
                end_date: end,
            },
        )
        .unwrap()
        .id
    }

    fn complete_contract(conn: &Connection, contract_id: i32) {
        conn.execute("UPDATE contrato SET status = 'Concluido' WHERE id = ?1", [contract_id])
            .unwrap();
    }

    fn new_item(conn: &Connection, contract_id: i32, quantity: i64, unit_price_cents: i64) -> i64 {
        conn.execute(
            "INSERT INTO produto (nome, unidade_de_medida, categoria, preco_de_referencia_centavos)
             VALUES ('Polpa de fruta', 'kg', 'Fruta', 500)",
            [],
        )
        .unwrap();
        let product_id = conn.last_insert_rowid();
        conn.execute(
            "INSERT INTO item_contrato (contrato_id, produto_id, quantidade, preco_unitario_centavos)
             VALUES (?1, ?2, ?3, ?4)",
            params![contract_id, product_id, quantity, unit_price_cents],
        )
        .unwrap();
        conn.last_insert_rowid()
    }

    fn add_delivery(conn: &Connection, item_id: i64, quantity: i64, on: NaiveDate) {
        conn.execute(
            "INSERT INTO entrega (item_contrato_id, quantidade_solicitada, quantidade_entregue, data_entrega)
             VALUES (?1, ?2, ?2, ?3)",
            params![item_id, quantity, on],
        )
        .unwrap();
        conn.execute(
            "UPDATE item_contrato SET quantidade_entregue = quantidade_entregue + ?1 WHERE id = ?2",
            params![quantity, item_id],
        )
        .unwrap();
    }

    fn add_payment(conn: &Connection, contract_id: i32, cents: i64) {
        conn.execute(
            "INSERT INTO pagamento (contrato_id, valor_centavos, data_pagamento) VALUES (?1, ?2, ?3)",
            params![contract_id, cents, date(2026, 11, 1)],
        )
        .unwrap();
    }

    #[test]
    fn week_runs_from_monday_to_sunday() {
        assert_eq!(week_bounds(date(2026, 11, 12)), (date(2026, 11, 9), date(2026, 11, 15)));
        assert_eq!(week_bounds(date(2026, 11, 9)).0, date(2026, 11, 9));
        assert_eq!(week_bounds(date(2026, 11, 15)).0, date(2026, 11, 9));
    }

    #[test]
    fn empty_database_returns_complete_empty_summary() {
        let conn = setup_db();
        let summary = get_summary(&conn, today()).unwrap();

        assert_eq!(summary.reference_date, today());
        assert_eq!(summary.week_start, date(2026, 11, 9));
        assert_eq!(summary.week_end, date(2026, 11, 15));
        assert_eq!(summary.deliveries.by_day.len(), 7);
        assert_eq!(summary.deliveries.total_count, 0);
        assert_eq!(summary.finance.week_delivered_cents, 0);
        assert_eq!(summary.finance.open_contracts_count, 0);
        assert_eq!(summary.finance.open_contracts_receivable_cents, 0);
        assert!(summary.contracts_near_limit.is_empty());
        assert!(summary.alerts.is_empty());
    }

    #[test]
    fn weekly_deliveries_count_only_the_current_week() {
        let conn = setup_db();
        let inst = new_institution(&conn, "Prefeitura A", "11.222.333/0001-81");
        let contract = new_contract(&conn, inst, 1_000_000, date(2027, 6, 30));
        let item = new_item(&conn, contract, 1_000, 500);
        add_delivery(&conn, item, 10, date(2026, 11, 8)); 
        add_delivery(&conn, item, 8, date(2026, 11, 9)); 
        add_delivery(&conn, item, 3, date(2026, 11, 9)); 
        add_delivery(&conn, item, 4, date(2026, 11, 15)); 
        add_delivery(&conn, item, 9, date(2026, 11, 16)); 

        let summary = get_summary(&conn, today()).unwrap();
        let by_day = &summary.deliveries.by_day;

        assert_eq!(summary.deliveries.total_count, 3);
        assert_eq!(by_day[0].date, date(2026, 11, 9));
        assert_eq!(by_day[0].count, 2);
        assert_eq!(by_day[3].count, 0);
        assert_eq!(by_day[6].date, date(2026, 11, 15));
        assert_eq!(by_day[6].count, 1);
        assert_eq!(summary.finance.week_delivered_cents, 7_500);
    }

    #[test]
    fn open_receivable_subtracts_payments_and_ignores_completed_contracts() {
        let conn = setup_db();
        let inst = new_institution(&conn, "Prefeitura A", "11.222.333/0001-81");
        let open_a = new_contract(&conn, inst, 100_000, date(2027, 6, 30));
        let open_b = new_contract(&conn, inst, 50_000, date(2027, 6, 30));
        let done = new_contract(&conn, inst, 90_000, date(2027, 6, 30));
        add_payment(&conn, open_a, 30_000);
        add_payment(&conn, open_b, 50_000);
        add_payment(&conn, done, 10_000);
        complete_contract(&conn, done);

        let finance = get_summary(&conn, today()).unwrap().finance;

        assert_eq!(finance.open_contracts_count, 2);
        assert_eq!(finance.open_contracts_receivable_cents, 70_000);
    }

    #[test]
    fn near_limit_includes_exactly_ten_percent_and_sorts_by_remaining() {
        let conn = setup_db();
        let a = new_institution(&conn, "Prefeitura A", "11.222.333/0001-81");
        let b = new_institution(&conn, "Escola B", "45.723.174/0001-10");

        let c10 = new_contract(&conn, a, 1_000_000, date(2027, 6, 30));
        let item = new_item(&conn, c10, 100, 100);
        add_delivery(&conn, item, 90, date(2026, 10, 1));
        let c4 = new_contract(&conn, b, 1_000_000, date(2027, 6, 30));
        let item = new_item(&conn, c4, 50, 100);
        add_delivery(&conn, item, 48, date(2026, 10, 1));
        let c_out = new_contract(&conn, a, 1_000_000, date(2027, 6, 30));
        let item = new_item(&conn, c_out, 10_000, 1);
        add_delivery(&conn, item, 8_999, date(2026, 10, 1));
        let c_done = new_contract(&conn, a, 1_000_000, date(2027, 6, 30));
        let item = new_item(&conn, c_done, 100, 100);
        add_delivery(&conn, item, 100, date(2026, 10, 1));
        complete_contract(&conn, c_done);
        new_contract(&conn, b, 1_000_000, date(2027, 6, 30));

        let near = get_summary(&conn, today()).unwrap().contracts_near_limit;

        let ids: Vec<i32> = near.iter().map(|c| c.contract_id).collect();
        assert_eq!(ids, vec![c4, c10]);
        assert_eq!(near[0].institution_name, "Escola B");
        assert_eq!(near[0].remaining_value_cents, 200);
        assert_eq!(near[0].total_value_cents, 5_000);
        assert!((near[0].remaining_percent - 4.0).abs() < 1e-9);
        assert!((near[1].remaining_percent - 10.0).abs() < 1e-9);
    }

    #[test]
    fn expiration_alerts_follow_the_thirty_day_rule() {
        let conn = setup_db();
        let inst = new_institution(&conn, "Prefeitura A", "11.222.333/0001-81");
        let in_30 = new_contract(&conn, inst, 1_000, date(2026, 12, 12));
        let in_31 = new_contract(&conn, inst, 1_000, date(2026, 12, 13));
        let in_7 = new_contract(&conn, inst, 1_000, date(2026, 11, 19));
        let in_0 = new_contract(&conn, inst, 1_000, date(2026, 11, 12));
        let overdue = new_contract(&conn, inst, 1_000, date(2026, 11, 10));
        let done = new_contract(&conn, inst, 1_000, date(2026, 11, 13));
        complete_contract(&conn, done);

        let alerts = get_summary(&conn, today()).unwrap().alerts;
        let find = |id: i32| alerts.iter().find(|a| a.contract_id == id);

        let warning = find(in_30).unwrap();
        assert_eq!(warning.kind, AlertKind::ContractExpiring);
        assert_eq!(warning.severity, AlertSeverity::Warning);
        assert!(warning.message.contains("em 30 dias"));
        assert!(find(in_31).is_none());
        assert_eq!(find(in_7).unwrap().severity, AlertSeverity::Critical);
        assert!(find(in_0).unwrap().message.contains("hoje"));
        let overdue_alert = find(overdue).unwrap();
        assert_eq!(overdue_alert.kind, AlertKind::ContractOverdue);
        assert_eq!(overdue_alert.severity, AlertSeverity::Critical);
        assert!(overdue_alert.message.contains("10/11/2026"));
        assert!(find(done).is_none());
        assert_eq!(alerts.len(), 4);
    }

    #[test]
    fn pending_payment_alert_when_delivered_value_exceeds_paid() {
        let conn = setup_db();
        let inst = new_institution(&conn, "Prefeitura A", "11.222.333/0001-81");
        let unpaid = new_contract(&conn, inst, 10_000_000, date(2027, 6, 30));
        let item = new_item(&conn, unpaid, 1_000, 1_000);
        add_delivery(&conn, item, 123, date(2026, 10, 1)); 
        add_payment(&conn, unpaid, 30_000); 

        let settled = new_contract(&conn, inst, 10_000_000, date(2027, 6, 30));
        let item = new_item(&conn, settled, 1_000, 1_000);
        add_delivery(&conn, item, 10, date(2026, 10, 1));
        add_payment(&conn, settled, 10_000);

        let alerts = get_summary(&conn, today()).unwrap().alerts;

        assert_eq!(alerts.len(), 1);
        assert_eq!(alerts[0].kind, AlertKind::PendingPayment);
        assert_eq!(alerts[0].severity, AlertSeverity::Warning);
        assert_eq!(alerts[0].contract_id, unpaid);
        assert!(alerts[0].message.contains("R$ 930,00"));
    }

    #[test]
    fn critical_alerts_come_before_warnings() {
        let conn = setup_db();
        let inst = new_institution(&conn, "Prefeitura A", "11.222.333/0001-81");
        let warning = new_contract(&conn, inst, 1_000, date(2026, 12, 1)); 
        let critical = new_contract(&conn, inst, 1_000, date(2026, 11, 14)); 

        let alerts = get_summary(&conn, today()).unwrap().alerts;

        assert_eq!(alerts[0].contract_id, critical);
        assert_eq!(alerts[1].contract_id, warning);
    }

    #[test]
    fn formats_brazilian_currency() {
        assert_eq!(format_brl(0), "R$ 0,00");
        assert_eq!(format_brl(5), "R$ 0,05");
        assert_eq!(format_brl(123_456), "R$ 1.234,56");
        assert_eq!(format_brl(100_000_000), "R$ 1.000.000,00");
        assert_eq!(format_brl(-250), "-R$ 2,50");
    }
}
