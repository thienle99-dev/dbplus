use super::ConnectionService;
use crate::services::driver::QueryDriver;
use anyhow::Result;
use uuid::Uuid;

impl ConnectionService {
    pub async fn execute_query(
        &self,
        connection_id: Uuid,
        query: &str,
    ) -> Result<crate::services::db_driver::QueryResult> {
        self.execute_query_with_options(connection_id, query, None, None, false)
            .await
    }

    pub async fn execute_script(&self, connection_id: Uuid, script: &str) -> Result<u64> {
        let connection = self
            .get_connection_by_id(connection_id)
            .await?
            .ok_or(anyhow::anyhow!("Connection not found"))?;

        let password = self.encryption.decrypt(&connection.password)?;
        let connection = self.apply_database_override(connection);

        use crate::services::driver::QueryDriver;
        use crate::services::postgres_driver::PostgresDriver;

        match connection.db_type.as_str() {
            "postgres" => {
                let driver = PostgresDriver::new(&connection, &password).await?;
                QueryDriver::execute(&driver, script).await
            }
            "sqlite" => {
                let driver = self.sqlite_driver(&connection, &password).await?;
                QueryDriver::execute_script(&driver, script).await
            }
            _ => Err(anyhow::anyhow!("Unsupported database type")),
        }
    }

    pub async fn execute_query_with_options(
        &self,
        connection_id: Uuid,
        query: &str,
        limit: Option<i64>,
        offset: Option<i64>,
        include_total_count: bool,
    ) -> Result<crate::services::db_driver::QueryResult> {
        let connection = self
            .get_connection_by_id(connection_id)
            .await?
            .ok_or(anyhow::anyhow!("Connection not found"))?;

        let password = self.encryption.decrypt(&connection.password)?;
        let connection = self.apply_database_override(connection);

        use crate::services::db_driver::DatabaseDriver;
        use crate::services::postgres_driver::PostgresDriver;

        let mut result = match connection.db_type.as_str() {
            "postgres" => {
                let driver = PostgresDriver::new(&connection, &password).await?;
                DatabaseDriver::execute_query(&driver, query).await?
            }
            "sqlite" => {
                let driver = self.sqlite_driver(&connection, &password).await?;
                DatabaseDriver::execute_query(&driver, query).await?
            }
            _ => return Err(anyhow::anyhow!("Unsupported database type")),
        };

        // Apply pagination if specified
        if let (Some(limit_val), Some(offset_val)) = (limit, offset) {
            let total_rows = result.rows.len();
            let start = offset_val.min(total_rows as i64) as usize;
            let end = (offset_val + limit_val).min(total_rows as i64) as usize;

            result.rows = result.rows[start..end].to_vec();
            result.limit = Some(limit_val);
            result.offset = Some(offset_val);
            result.has_more = Some(end < total_rows);

            if include_total_count {
                result.total_count = Some(total_rows as i64);
            }
        }

        Ok(result)
    }

    pub async fn execute(&self, connection_id: Uuid, query: &str) -> Result<u64> {
        let connection = self
            .get_connection_by_id(connection_id)
            .await?
            .ok_or(anyhow::anyhow!("Connection not found"))?;

        let password = self.encryption.decrypt(&connection.password)?;
        let connection = self.apply_database_override(connection);

        use crate::services::postgres_driver::PostgresDriver;

        match connection.db_type.as_str() {
            "postgres" => {
                let driver = PostgresDriver::new(&connection, &password).await?;
                QueryDriver::execute(&driver, query).await
            }
            "sqlite" => {
                let driver = self.sqlite_driver(&connection, &password).await?;
                QueryDriver::execute(&driver, query).await
            }
            _ => Err(anyhow::anyhow!("Unsupported database type")),
        }
    }

    pub async fn explain_query(
        &self,
        connection_id: Uuid,
        query: &str,
        analyze: bool,
    ) -> Result<serde_json::Value> {
        let connection = self
            .get_connection_by_id(connection_id)
            .await?
            .ok_or(anyhow::anyhow!("Connection not found"))?;

        let password = self.encryption.decrypt(&connection.password)?;
        let connection = self.apply_database_override(connection);

        use crate::services::postgres_driver::PostgresDriver;

        match connection.db_type.as_str() {
            "postgres" => {
                let driver = PostgresDriver::new(&connection, &password).await?;
                QueryDriver::explain(&driver, query, analyze).await
            }
            "sqlite" => {
                let driver = self.sqlite_driver(&connection, &password).await?;
                QueryDriver::explain(&driver, query, analyze).await
            }
            _ => Err(anyhow::anyhow!("Unsupported database type")),
        }
    }

    pub async fn search_objects(
        &self,
        connection_id: Uuid,
        query: &str,
    ) -> Result<Vec<crate::services::db_driver::SearchResult>> {
        let connection = self
            .get_connection_by_id(connection_id)
            .await?
            .ok_or(anyhow::anyhow!("Connection not found"))?;

        let password = self.encryption.decrypt(&connection.password)?;
        let connection = self.apply_database_override(connection);

        use crate::services::driver::SchemaIntrospection;
        use crate::services::postgres_driver::PostgresDriver;

        match connection.db_type.as_str() {
            "postgres" => {
                let driver = PostgresDriver::new(&connection, &password).await?;
                driver.search_objects(query).await
            }
            "sqlite" => {
                let driver = self.sqlite_driver(&connection, &password).await?;
                driver.search_objects(query).await
            }
            _ => Err(anyhow::anyhow!("Unsupported database type")),
        }
    }
}
