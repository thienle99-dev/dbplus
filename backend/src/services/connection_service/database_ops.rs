use super::ConnectionService;
use anyhow::Result;
use uuid::Uuid;

impl ConnectionService {
    pub async fn get_databases(&self, connection_id: Uuid) -> Result<Vec<String>> {
        let connection = self
            .get_connection_by_id(connection_id)
            .await?
            .ok_or(anyhow::anyhow!("Connection not found"))?;

        let password = self.encryption.decrypt(&connection.password)?;

        use crate::services::db_driver::DatabaseDriver;
        use crate::services::postgres_driver::PostgresDriver;

        match connection.db_type.as_str() {
            "postgres" | "cockroachdb" | "cockroach" => {
                let driver = PostgresDriver::new_for_test(&connection, &password).await?;
                DatabaseDriver::get_databases(&driver).await
            }
            "sqlite" => {
                let driver = self.sqlite_driver(&connection, &password).await?;
                DatabaseDriver::get_databases(&driver).await
            }
            "clickhouse" => {
                let driver =
                    crate::services::clickhouse::ClickHouseDriver::new(&connection, &password)
                        .await?;
                DatabaseDriver::get_databases(&driver).await
            }
            "mysql" | "mariadb" | "tidb" => {
                let driver =
                    crate::services::mysql::MySqlDriver::from_model(&connection, &password).await?;
                DatabaseDriver::get_databases(&driver).await
            }
            "couchbase" => {
                let driver =
                    crate::services::couchbase::CouchbaseDriver::new(&connection, &password)
                        .await?;
                DatabaseDriver::get_databases(&driver).await
            }
            _ => Ok(vec![]),
        }
    }

    pub async fn create_database(
        &self,
        connection_id: Uuid,
        name: &str,
        options: Option<crate::handlers::database::CreateDatabaseOptions>,
    ) -> Result<()> {
        let connection = self
            .get_connection_by_id(connection_id)
            .await?
            .ok_or(anyhow::anyhow!("Connection not found"))?;

        let password = self.encryption.decrypt(&connection.password)?;

        use crate::services::postgres_driver::PostgresDriver;

        match connection.db_type.as_str() {
            "postgres" | "cockroachdb" | "cockroach" => {
                let driver = PostgresDriver::new_for_test(&connection, &password).await?;
                driver.create_database_with_options(name, options).await
            }
            "sqlite" => Err(anyhow::anyhow!(
                "SQLite does not support creating separate databases via this API"
            )),
            "couchbase" => Err(anyhow::anyhow!(
                "Couchbase does not support creating buckets via this API yet"
            )),
            _ => Err(anyhow::anyhow!(
                "Unsupported database type for create_database"
            )),
        }
    }

    pub async fn drop_database(&self, connection_id: Uuid, name: &str) -> Result<()> {
        let connection = self
            .get_connection_by_id(connection_id)
            .await?
            .ok_or(anyhow::anyhow!("Connection not found"))?;

        let password = self.encryption.decrypt(&connection.password)?;

        use crate::services::driver::extension::DatabaseManagementDriver;
        use crate::services::postgres_driver::PostgresDriver;

        match connection.db_type.as_str() {
            "postgres" | "cockroachdb" | "cockroach" => {
                let driver = PostgresDriver::new_for_test(&connection, &password).await?;
                driver.drop_database(name).await
            }
            "sqlite" => Err(anyhow::anyhow!(
                "SQLite does not support dropping databases via this API"
            )),
            "couchbase" => Err(anyhow::anyhow!(
                "Couchbase does not support dropping buckets via this API yet"
            )),
            _ => Err(anyhow::anyhow!(
                "Unsupported database type for drop_database"
            )),
        }
    }
}
