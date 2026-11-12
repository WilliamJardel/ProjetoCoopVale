use std::{env, fs, path::PathBuf};

fn main() {
    tauri_build::build();
    println!("cargo:rerun-if-env-changed=COOPVALE_ADMIN_EMAIL");
    println!("cargo:rerun-if-env-changed=COOPVALE_ADMIN_PASSWORD");

    let email = env::var("COOPVALE_ADMIN_EMAIL").ok();
    let password = env::var("COOPVALE_ADMIN_PASSWORD").ok();
    let admin = match (email, password) {
        (None, None) => "pub const INITIAL_ADMIN: Option<(&str, &str)> = None;\n".to_string(),
        (email, Some(password)) => {
            if password.len() < 6 {
                panic!("COOPVALE_ADMIN_PASSWORD deve ter pelo menos 6 caracteres");
            }

            let email = email.unwrap_or_else(|| "admin@coopvale.com".to_string());
            let email_regex =
                regex::Regex::new(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")
                    .expect("Expressão regular de e-mail inválida");
            if !email_regex.is_match(&email) {
                panic!("COOPVALE_ADMIN_EMAIL tem formato inválido");
            }
            let password_hash =
                bcrypt::hash(password, bcrypt::DEFAULT_COST).unwrap_or_else(|error| {
                    panic!("Não foi possível gerar hash da senha inicial: {error}")
                });
            format!(
                "pub const INITIAL_ADMIN: Option<(&str, &str)> = Some(({email:?}, {password_hash:?}));\n"
            )
        }
        (Some(_), None) => {
            panic!("COOPVALE_ADMIN_EMAIL exige que COOPVALE_ADMIN_PASSWORD também esteja definida")
        }
    };

    let output_path = PathBuf::from(env::var_os("OUT_DIR").expect("OUT_DIR não definido"))
        .join("compiled_admin.rs");
    fs::write(output_path, admin)
        .expect("Não foi possível gerar a configuração do usuário inicial");
}
