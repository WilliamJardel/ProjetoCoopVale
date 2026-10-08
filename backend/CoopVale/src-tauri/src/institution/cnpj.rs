const WEIGHTS_DV1: [u32; 12] = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const WEIGHTS_DV2: [u32; 13] = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

pub fn normalize(input: &str) -> String {
    input
        .chars()
        .filter(|c| !matches!(c, '.' | '/' | '-') && !c.is_whitespace())
        .map(|c| c.to_ascii_uppercase())
        .collect()
}

fn char_value(c: char) -> u32 {
    c as u32 - 48
}

fn calculate_check_digit(base: &[char], weights: &[u32]) -> u32 {
    let sum: u32 = base
        .iter()
        .zip(weights)
        .map(|(c, w)| char_value(*c) * w)
        .sum();
    let remainder = sum % 11;
    if remainder < 2 {
        0
    } else {
        11 - remainder
    }
}

pub fn validate(input: &str) -> Result<String, String> {
    let cnpj = normalize(input);
    let chars: Vec<char> = cnpj.chars().collect();

    if chars.len() != 14 {
        return Err("O CNPJ deve ter 14 caracteres".to_string());
    }
    if !chars
        .iter()
        .all(|c| c.is_ascii_digit() || c.is_ascii_uppercase())
    {
        return Err("O CNPJ deve conter apenas números e letras (A-Z)".to_string());
    }
    if !chars[12].is_ascii_digit() || !chars[13].is_ascii_digit() {
        return Err("Os dois últimos caracteres do CNPJ devem ser números".to_string());
    }

    if chars.iter().all(|c| *c == chars[0]) {
        return Err("CNPJ inválido".to_string());
    }

    let dv1 = calculate_check_digit(&chars[..12], &WEIGHTS_DV1);
    let dv2 = calculate_check_digit(&chars[..13], &WEIGHTS_DV2);

    if chars[12].to_digit(10) == Some(dv1) && chars[13].to_digit(10) == Some(dv2) {
        Ok(cnpj)
    } else {
        Err("CNPJ inválido: dígitos verificadores não conferem".to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_numeric_cnpj_with_and_without_mask() {
        assert_eq!(validate("11.222.333/0001-81").unwrap(), "11222333000181");
        assert_eq!(validate("11222333000181").unwrap(), "11222333000181");
        assert_eq!(validate("  12.345.678/0001-95 ").unwrap(), "12345678000195");
    }

    #[test]
    fn accepts_alphanumeric_cnpj_from_receita_example() {
        assert_eq!(validate("12.ABC.345/01DE-35").unwrap(), "12ABC34501DE35");
        assert_eq!(validate("12abc34501de35").unwrap(), "12ABC34501DE35");
    }

    #[test]
    fn rejects_wrong_check_digit() {
        assert!(validate("11.222.333/0001-82").is_err());
        assert!(validate("12.ABC.345/01DE-36").is_err());
    }

    #[test]
    fn rejects_invalid_length_and_characters() {
        assert!(validate("").is_err());
        assert!(validate("1122233300018").is_err());
        assert!(validate("112223330001811").is_err());
        assert!(validate("11.222.333/0001-8!").is_err());
        assert!(validate("12.ABC.345/01DE-3A").is_err()); 
    }

    #[test]
    fn rejects_repeated_sequences() {
        assert!(validate("00.000.000/0000-00").is_err());
        assert!(validate("11111111111111").is_err());
    }

    #[test]
    fn normalize_does_not_transform_non_ascii_characters() {
        assert!(validate("11222333000ß81").is_err());
    }
}