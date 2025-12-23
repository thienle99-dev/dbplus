use crate::services::connection_service::ConnectionService;
use crate::services::db_driver::SessionInfo;
use crate::services::driver::SessionOperations;
use crate::services::postgres_driver::PostgresDriver;
use anyhow::Result;
use uuid::Uuid;

impl ConnectionService {
    async fn get_driver_with_session_ops(
        &self,
        connection_id: Uuid,
    ) -> Result<Box<dyn SessionOperations>> {
        let (connection, password) = self.get_connection_with_password(connection_id).await?;

        match connection.db_type.as_str() {
            "postgres" | "cockroachdb" | "cockroach" => {
                let driver = PostgresDriver::new(&connection, &password).await?;
                Ok(Box::new(driver))
            }
            // For other drivers that don't implement SessionOperations yet, we can either
            // return an error or return a dummy implementation.
            // For now, let's return an error for unsupported types.
            _ => Err(anyhow::anyhow!(
                "Session management is not supported for this database type"
            )),
        }
    }

    pub async fn get_active_sessions(&self, connection_id: Uuid) -> Result<Vec<SessionInfo>> {
        let driver = self.get_driver_with_session_ops(connection_id).await?;
        driver.get_active_sessions().await
    }

    pub async fn kill_session(&self, connection_id: Uuid, pid: i32) -> Result<()> {
        let driver = self.get_driver_with_session_ops(connection_id).await?;
        driver.kill_session(pid).await
    }
}
