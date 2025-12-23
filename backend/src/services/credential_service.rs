use anyhow::{anyhow, Result};
use keyring::Entry;
use uuid::Uuid;

pub struct CredentialService;

impl CredentialService {
    pub fn new() -> Self {
        Self
    }

    fn get_key(connection_id: &Uuid, field: &str) -> String {
        format!("dbplus:{}:{}", connection_id, field)
    }

    pub fn set_password(&self, connection_id: &Uuid, field: &str, password: &str) -> Result<()> {
        let key = Self::get_key(connection_id, field);
        let entry = Entry::new("dbplus", &key)?;
        entry
            .set_password(password)
            .map_err(|e| anyhow!("Failed to set password in keyring: {}", e))
    }

    pub fn get_password(&self, connection_id: &Uuid, field: &str) -> Result<Option<String>> {
        let key = Self::get_key(connection_id, field);
        let entry = Entry::new("dbplus", &key)?;
        match entry.get_password() {
            Ok(p) => Ok(Some(p)),
            Err(keyring::Error::NoEntry) => Ok(None),
            Err(e) => Err(anyhow!("Failed to get password from keyring: {}", e)),
        }
    }

    pub fn delete_passwords(&self, connection_id: &Uuid) -> Result<()> {
        // We need to delete all potential fields
        let fields = ["password", "ssh_password", "ssh_key_passphrase"];
        for field in fields {
            let key = Self::get_key(connection_id, field);
            let entry = Entry::new("dbplus", &key)?;
            match entry.delete_password() {
                Ok(_) => {}
                Err(keyring::Error::NoEntry) => {}
                Err(e) => tracing::warn!(
                    "Failed to delete password for {} from keyring: {}",
                    field,
                    e
                ),
            }
        }
        Ok(())
    }
}
