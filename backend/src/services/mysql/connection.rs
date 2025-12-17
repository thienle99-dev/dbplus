use anyhow::Result;
use async_trait::async_trait;
use mysql_async::prelude::Queryable;

use crate::services::driver::ConnectionDriver;
use super::MySqlDriver;

#[async_trait]
impl ConnectionDriver for MySqlDriver {
    async fn test_connection(&self) -> Result<()> {
        let mut conn = self.pool.get_conn().await?;
        let _: Vec<u8> = conn.query("SELECT 1").await?;
        Ok(())
    }
}
