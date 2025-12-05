use ring::aead::{self, Aad, LessSafeKey, UnboundKey};
use ring::rand::{SecureRandom, SystemRandom};
use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};
use anyhow::{Result, anyhow};
use std::env;

pub struct EncryptionService {
    key: LessSafeKey,
}

impl EncryptionService {
    pub fn new() -> Result<Self> {
        let key_str = env::var("ENCRYPTION_KEY").map_err(|_| anyhow!("ENCRYPTION_KEY must be set"))?;
        let key_bytes = BASE64.decode(key_str).map_err(|_| anyhow!("Invalid base64 key"))?;
        
        let unbound_key = UnboundKey::new(&aead::AES_256_GCM, &key_bytes)
            .map_err(|_| anyhow!("Invalid key length"))?;
        let key = LessSafeKey::new(unbound_key);

        Ok(Self { key })
    }

    pub fn encrypt(&self, data: &str) -> Result<String> {
        let mut nonce_bytes = [0u8; 12];
        let rng = SystemRandom::new();
        rng.fill(&mut nonce_bytes).map_err(|_| anyhow!("Failed to generate nonce"))?;
        
        let nonce = aead::Nonce::try_assume_unique_for_key(&nonce_bytes)
            .map_err(|_| anyhow!("Failed to create nonce"))?;

        let mut in_out = data.as_bytes().to_vec();
        self.key.seal_in_place_append_tag(nonce, Aad::empty(), &mut in_out)
            .map_err(|_| anyhow!("Encryption failed"))?;

        let mut result = nonce_bytes.to_vec();
        result.extend_from_slice(&in_out);

        Ok(BASE64.encode(result))
    }

    pub fn decrypt(&self, encrypted_data: &str) -> Result<String> {
        let data = BASE64.decode(encrypted_data).map_err(|_| anyhow!("Invalid base64 data"))?;
        
        if data.len() < 12 {
            return Err(anyhow!("Invalid data length"));
        }

        let (nonce_bytes, ciphertext) = data.split_at(12);
        let nonce = aead::Nonce::try_assume_unique_for_key(nonce_bytes)
            .map_err(|_| anyhow!("Failed to create nonce"))?;

        let mut in_out = ciphertext.to_vec();
        let decrypted_data = self.key.open_in_place(nonce, Aad::empty(), &mut in_out)
            .map_err(|_| anyhow!("Decryption failed"))?;

        Ok(String::from_utf8(decrypted_data.to_vec())?)
    }
}
