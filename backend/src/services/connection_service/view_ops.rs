use super::ConnectionService;
use anyhow::Result;
use uuid::Uuid;

impl ConnectionService {
    pub async fn list_views(
        &self,
        connection_id: Uuid,
        schema: &str,
    ) -> Result<Vec<crate::services::db_driver::ViewInfo>> {
        let (connection, password) = self.get_connection_with_password(connection_id).await?;

        use crate::services::db_driver::DatabaseDriver;
        use crate::services::postgres_driver::PostgresDriver;

        match connection.db_type.as_str() {
            "postgres" | "cockroachdb" | "cockroach" => {
                let driver = PostgresDriver::new(&connection, &password).await?;
                driver.list_views(schema).await
            }
            "sqlite" => {
                let driver = self.sqlite_driver(&connection, &password).await?;
                driver.list_views(schema).await
            }
            "clickhouse" => {
                let driver =
                    crate::services::clickhouse::ClickHouseDriver::new(&connection, &password)
                        .await?;
                driver.list_views(schema).await
            }
            "mysql" | "mariadb" | "tidb" => {
                let driver =
                    crate::services::mysql::MySqlDriver::from_model(&connection, &password).await?;
                driver.list_views(schema).await
            }
            _ => Ok(vec![]),
        }
    }

    pub async fn get_view_definition(
        &self,
        connection_id: Uuid,
        schema: &str,
        view_name: &str,
    ) -> Result<crate::services::db_driver::ViewInfo> {
        let (connection, password) = self.get_connection_with_password(connection_id).await?;

        use crate::services::db_driver::DatabaseDriver;
        use crate::services::postgres_driver::PostgresDriver;

        match connection.db_type.as_str() {
            "postgres" | "cockroachdb" | "cockroach" => {
                let driver = PostgresDriver::new(&connection, &password).await?;
                driver.get_view_definition(schema, view_name).await
            }
            "sqlite" => {
                let driver = self.sqlite_driver(&connection, &password).await?;
                driver.get_view_definition(schema, view_name).await
            }
            "clickhouse" => {
                let driver =
                    crate::services::clickhouse::ClickHouseDriver::new(&connection, &password)
                        .await?;
                driver.get_view_definition(schema, view_name).await
            }
            "mysql" | "mariadb" | "tidb" => {
                let driver =
                    crate::services::mysql::MySqlDriver::from_model(&connection, &password).await?;
                driver.get_view_definition(schema, view_name).await
            }
            _ => Err(anyhow::anyhow!("Unsupported database type")),
        }
    }
}
