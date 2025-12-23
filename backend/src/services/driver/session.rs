use crate::services::db_driver::SessionInfo;
use anyhow::Result;
use async_trait::async_trait;

#[async_trait]
pub trait SessionOperations: Send + Sync {
    async fn get_active_sessions(&self) -> Result<Vec<SessionInfo>>;
    async fn kill_session(&self, pid: i32) -> Result<()>;
}
