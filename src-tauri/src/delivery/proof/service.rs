use crate::db::error_message;
use crate::delivery::proof::model::{DeliveryProofStatus, Proof, ProofData, ProofFile};
use crate::delivery::proof::repository;
use crate::delivery::repository as delivery_repository;
use rusqlite::Connection;
use std::collections::HashMap;

pub fn create(conn: &Connection, data: ProofData) -> Result<Proof, String> {
    if data.delivery_id <= 0 {
        return Err("Selecione uma entrega".to_string());
    }
    if data.file_name.trim().is_empty() {
        return Err("O nome do arquivo é obrigatório".to_string());
    }
    if data.content.is_empty() {
        return Err("O arquivo anexado está vazio".to_string());
    }
    let extension = data
        .file_name
        .trim()
        .rsplit('.')
        .next()
        .unwrap_or_default()
        .to_ascii_lowercase();
    let (expected_mime_type, has_expected_signature) = match extension.as_str() {
        "pdf" => ("application/pdf", data.content.starts_with(b"%PDF-")),
        "png" => ("image/png", data.content.starts_with(b"\x89PNG\r\n\x1a\n")),
        "jpg" => ("image/jpeg", data.content.starts_with(&[0xFF, 0xD8, 0xFF])),
        _ => {
            return Err("Somente arquivos PDF, PNG e JPG são aceitos".to_string());
        }
    };
    if !has_expected_signature {
        return Err("O conteúdo do arquivo não corresponde à extensão informada".to_string());
    }
    if data.mime_type.as_deref().is_some_and(|mime_type| {
        !mime_type
            .trim()
            .eq_ignore_ascii_case(expected_mime_type)
    }) {
        return Err("O tipo MIME não corresponde ao formato do arquivo".to_string());
    }
    i64::try_from(data.content.len())
        .map_err(|_| "O arquivo anexado excede o limite de tamanho".to_string())?;

    let delivery_exists: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM entrega WHERE id = ?1)",
            [data.delivery_id],
            |row| row.get(0),
        )
        .map_err(error_message)?;
    if !delivery_exists {
        return Err("Entrega não encontrada".to_string());
    }

    let id = repository::insert(conn, &data).map_err(error_message)?;
    repository::find_by_id(conn, id)
        .map_err(error_message)?
        .ok_or_else(|| "Comprovante não encontrado após o cadastro".to_string())
}

pub fn get_file(conn: &Connection, id: i32) -> Result<Option<ProofFile>, String> {
    if id <= 0 {
        return Err("Comprovante não encontrado".to_string());
    }
    repository::find_file_by_id(conn, id).map_err(error_message)
}

pub fn list_deliveries_with_proofs(
    conn: &Connection,
) -> Result<Vec<DeliveryProofStatus>, String> {
    let deliveries = delivery_repository::find_all(conn).map_err(error_message)?;
    let proofs = repository::find_all(conn).map_err(error_message)?;
    let mut proofs_by_delivery: HashMap<i32, Vec<Proof>> = HashMap::new();
    for proof in proofs {
        proofs_by_delivery
            .entry(proof.delivery_id)
            .or_default()
            .push(proof);
    }

    let mut results: Vec<DeliveryProofStatus> = deliveries
        .into_iter()
        .map(|delivery| {
            let proofs = proofs_by_delivery.remove(&delivery.id).unwrap_or_default();
            let status_message = if proofs.is_empty() {
                "Sem comprovante anexado"
            } else {
                "Comprovante anexado"
            };
            DeliveryProofStatus {
                delivery,
                proofs,
                status_message: status_message.to_string(),
            }
        })
        .collect();

    results.sort_by(|left, right| {
        let left_has_proof = !left.proofs.is_empty();
        let right_has_proof = !right.proofs.is_empty();
        right_has_proof
            .cmp(&left_has_proof)
            .then_with(|| right.delivery.delivery_date.cmp(&left.delivery.delivery_date))
            .then_with(|| right.delivery.id.cmp(&left.delivery.id))
    });

    Ok(results)
}

pub fn delete(conn: &Connection, id: i32) -> Result<(), String> {
    if id <= 0 || repository::delete(conn, id).map_err(error_message)? == 0 {
        return Err("Comprovante não encontrado".to_string());
    }
    Ok(())
}
