use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{Duration, Instant};

const MAX_ATTEMPTS: u32 = 5;
const LOCKOUT_DURATION: Duration = Duration::from_secs(5 * 60);

pub struct LoginAttempts(Mutex<HashMap<String, (u32, Instant)>>);

impl LoginAttempts {
    pub fn new() -> Self {
        LoginAttempts(Mutex::new(HashMap::new()))
    }

    pub fn check(&self, email: &str) -> Result<(), String> {
        let attempts = self.0.lock().unwrap();
        if let Some((count, last)) = attempts.get(email) {
            if *count >= MAX_ATTEMPTS && last.elapsed() < LOCKOUT_DURATION {
                let restante = (LOCKOUT_DURATION - last.elapsed()).as_secs();
                return Err(format!(
                    "Muitas tentativas falhas. Tente novamente em {}s.",
                    restante
                ));
            }
        }
        Ok(())
    }

    pub fn register_failure(&self, email: &str) {
        let mut attempts = self.0.lock().unwrap();
        let entry = attempts.entry(email.to_string()).or_insert((0, Instant::now()));
        entry.0 += 1;
        entry.1 = Instant::now();
    }

    pub fn reset(&self, email: &str) {
        self.0.lock().unwrap().remove(email);
    }
}