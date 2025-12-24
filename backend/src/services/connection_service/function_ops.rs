use super::ConnectionService;
use anyhow::Result;
use uuid::Uuid;

impl ConnectionService {
    pub async fn list_functions(
        &self,
        connection_id: Uuid,
        schema: &str,
    ) -> Result<Vec<crate::services::db_driver::FunctionInfo>> {
        let (connection, password) = self.get_connection_with_password(connection_id).await?;

        use crate::services::db_driver::DatabaseDriver;
        use crate::services::postgres_driver::PostgresDriver;

        match connection.db_type.as_str() {
            "postgres" | "cockroachdb" | "cockroach" => {
                let driver = PostgresDriver::new(&connection, &password).await?;
                driver.list_functions(schema).await
            }
            "sqlite" => {
                let driver = self.sqlite_driver(&connection, &password).await?;
                driver.list_functions(schema).await
            }
            "clickhouse" => {
                let driver =
                    crate::services::clickhouse::ClickHouseDriver::new(&connection, &password)
                        .await?;
                driver.list_functions(schema).await
            }
            "mysql" | "mariadb" | "tidb" => {
                let driver =
                    crate::services::mysql::MySqlDriver::from_model(&connection, &password).await?;
                driver.list_functions(schema).await
            }
            _ => Ok(vec![]),
        }
    }

    pub async fn get_function_definition(
        &self,
        connection_id: Uuid,
        schema: &str,
        function_name: &str,
    ) -> Result<crate::services::db_driver::FunctionInfo> {
        let (connection, password) = self.get_connection_with_password(connection_id).await?;

        use crate::services::db_driver::DatabaseDriver;
        use crate::services::postgres_driver::PostgresDriver;

        match connection.db_type.as_str() {
            "postgres" | "cockroachdb" | "cockroach" => {
                let driver = PostgresDriver::new(&connection, &password).await?;
                driver.get_function_definition(schema, function_name).await
            }
            "sqlite" => {
                let driver = self.sqlite_driver(&connection, &password).await?;
                driver.get_function_definition(schema, function_name).await
            }
            "clickhouse" => {
                let driver =
                    crate::services::clickhouse::ClickHouseDriver::new(&connection, &password)
                        .await?;
                driver.get_function_definition(schema, function_name).await
            }
            "mysql" | "mariadb" | "tidb" => {
                let driver =
                    crate::services::mysql::MySqlDriver::from_model(&connection, &password).await?;
                driver.get_function_definition(schema, function_name).await
            }
            _ => Err(anyhow::anyhow!("Unsupported database type")),
        }
    }

    pub async fn get_function_permissions(
        &self,
        connection_id: Uuid,
        schema: &str,
        function_name: &str,
    ) -> Result<Vec<crate::services::db_driver::TableGrant>> {
        let (connection, password) = self.get_connection_with_password(connection_id).await?;

        use crate::services::driver::FunctionOperations;
        use crate::services::postgres_driver::PostgresDriver;

        match connection.db_type.as_str() {
            "postgres" | "cockroachdb" | "cockroach" => {
                let driver = PostgresDriver::new(&connection, &password).await?;
                driver.get_function_permissions(schema, function_name).await
            }
            "sqlite" => {
                let driver = self.sqlite_driver(&connection, &password).await?;
                driver.get_function_permissions(schema, function_name).await
            }
            "clickhouse" => {
                let driver =
                    crate::services::clickhouse::ClickHouseDriver::new(&connection, &password)
                        .await?;
                driver.get_function_permissions(schema, function_name).await
            }
            "mysql" | "mariadb" | "tidb" => {
                let driver =
                    crate::services::mysql::MySqlDriver::from_model(&connection, &password).await?;
                driver.get_function_permissions(schema, function_name).await
            }
            _ => Ok(vec![]),
        }
    }
}
