use super::ConnectionService;
use anyhow::Result;
use uuid::Uuid;

impl ConnectionService {
    pub async fn get_schemas(&self, connection_id: Uuid) -> Result<Vec<String>> {
        let connection = self
            .get_connection_by_id(connection_id)
            .await?
            .ok_or(anyhow::anyhow!("Connection not found"))?;

        let password = self.encryption.decrypt(&connection.password)?;
        let connection = self.apply_database_override(connection);

        use crate::services::db_driver::DatabaseDriver;
        use crate::services::postgres_driver::PostgresDriver;

        match connection.db_type.as_str() {
            "postgres" | "cockroachdb" | "cockroach" => {
                let driver = PostgresDriver::new(&connection, &password).await?;
                DatabaseDriver::get_schemas(&driver).await
            }
            "sqlite" => {
                let driver = self.sqlite_driver(&connection, &password).await?;
                DatabaseDriver::get_schemas(&driver).await
            }
            "clickhouse" => {
                let driver =
                    crate::services::clickhouse::ClickHouseDriver::new(&connection, &password)
                        .await?;
                DatabaseDriver::get_schemas(&driver).await
            }
            "mysql" | "mariadb" | "tidb" => {
                let driver =
                    crate::services::mysql::MySqlDriver::from_model(&connection, &password).await?;
                DatabaseDriver::get_schemas(&driver).await
            }
            "couchbase" => {
                let driver =
                    crate::services::couchbase::CouchbaseDriver::new(&connection, &password)
                        .await?;
                DatabaseDriver::get_schemas(&driver).await
            }
            _ => Ok(vec![]),
        }
    }

    pub async fn create_schema(&self, connection_id: Uuid, name: &str) -> Result<()> {
        let connection = self
            .get_connection_by_id(connection_id)
            .await?
            .ok_or(anyhow::anyhow!("Connection not found"))?;

        let password = self.encryption.decrypt(&connection.password)?;
        let connection = self.apply_database_override(connection);

        use crate::services::driver::extension::DatabaseManagementDriver;
        use crate::services::postgres_driver::PostgresDriver;

        match connection.db_type.as_str() {
            "postgres" | "cockroachdb" | "cockroach" => {
                let driver = PostgresDriver::new(&connection, &password).await?;
                driver.create_schema(name).await
            }
            "sqlite" => Err(anyhow::anyhow!(
                "SQLite does not support schemas via this API"
            )),
            "couchbase" => {
                use crate::services::couchbase::CouchbaseDriver;
                let driver = CouchbaseDriver::new(&connection, &password).await?;
                driver.create_schema(name).await
            }
            _ => Err(anyhow::anyhow!(
                "Unsupported database type for create_schema"
            )),
        }
    }

    pub async fn drop_schema(&self, connection_id: Uuid, name: &str) -> Result<()> {
        let connection = self
            .get_connection_by_id(connection_id)
            .await?
            .ok_or(anyhow::anyhow!("Connection not found"))?;

        let password = self.encryption.decrypt(&connection.password)?;
        let connection = self.apply_database_override(connection);

        use crate::services::driver::extension::DatabaseManagementDriver;
        use crate::services::postgres_driver::PostgresDriver;

        match connection.db_type.as_str() {
            "postgres" | "cockroachdb" | "cockroach" => {
                let driver = PostgresDriver::new(&connection, &password).await?;
                driver.drop_schema(name).await
            }
            "sqlite" => Err(anyhow::anyhow!(
                "SQLite does not support schemas via this API"
            )),
            "couchbase" => {
                use crate::services::couchbase::CouchbaseDriver;
                let driver = CouchbaseDriver::new(&connection, &password).await?;
                driver.drop_schema(name).await
            }
            _ => Err(anyhow::anyhow!("Unsupported database type for drop_schema")),
        }
    }

    pub async fn get_schema_metadata(
        &self,
        connection_id: Uuid,
        schema: &str,
    ) -> Result<Vec<crate::services::db_driver::TableMetadata>> {
        let connection = self
            .get_connection_by_id(connection_id)
            .await?
            .ok_or(anyhow::anyhow!("Connection not found"))?;

        let password = self.encryption.decrypt(&connection.password)?;
        let connection = self.apply_database_override(connection);
        let database_name = connection.database.clone();

        use crate::services::db_driver::DatabaseDriver;
        use crate::services::postgres_driver::PostgresDriver;
        use std::sync::Arc;

        let driver: Arc<dyn DatabaseDriver> = match connection.db_type.as_str() {
            "postgres" | "cockroachdb" | "cockroach" => {
                Arc::new(PostgresDriver::new(&connection, &password).await?)
            }
            "sqlite" => Arc::new(self.sqlite_driver(&connection, &password).await?),
            "clickhouse" => Arc::new(
                crate::services::clickhouse::ClickHouseDriver::new(&connection, &password).await?,
            ),
            "mysql" | "mariadb" | "tidb" => Arc::new(
                crate::services::mysql::MySqlDriver::from_model(&connection, &password).await?,
            ),
            "couchbase" => Arc::new(
                crate::services::couchbase::CouchbaseDriver::new(&connection, &password).await?,
            ),
            _ => return Ok(vec![]),
        };

        if let Some(cache) = &self.schema_cache {
            return cache
                .get_schema_structure(connection_id, &database_name, schema, driver)
                .await;
        }

        DatabaseDriver::get_schema_metadata(driver.as_ref(), schema).await
    }

    pub async fn get_schema_foreign_keys(
        &self,
        connection_id: Uuid,
        schema: &str,
    ) -> Result<Vec<crate::services::db_driver::SchemaForeignKey>> {
        let connection = self
            .get_connection_by_id(connection_id)
            .await?
            .ok_or(anyhow::anyhow!("Connection not found"))?;

        let password = self.encryption.decrypt(&connection.password)?;
        let connection = self.apply_database_override(connection);

        use crate::services::driver::SchemaIntrospection;
        use crate::services::postgres_driver::PostgresDriver;

        match connection.db_type.as_str() {
            "postgres" | "cockroachdb" | "cockroach" => {
                let driver = PostgresDriver::new(&connection, &password).await?;
                driver.get_schema_foreign_keys(schema).await
            }
            "sqlite" => {
                let driver = self.sqlite_driver(&connection, &password).await?;
                driver.get_schema_foreign_keys(schema).await
            }
            "mysql" | "mariadb" | "tidb" => {
                let driver =
                    crate::services::mysql::MySqlDriver::from_model(&connection, &password).await?;
                driver.get_schema_foreign_keys(schema).await
            }
            "couchbase" => {
                let driver =
                    crate::services::couchbase::CouchbaseDriver::new(&connection, &password)
                        .await?;
                driver.get_schema_foreign_keys(schema).await
            }
            _ => Ok(vec![]),
        }
    }
}
