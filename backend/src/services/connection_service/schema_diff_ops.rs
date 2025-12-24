use super::ConnectionService;
use crate::services::schema_diff::{
    differ::SchemaDiffResult,
    generator::{DatabaseType, MigrationOptions, MigrationScript},
    postgres_extractor::PostgresSchemaExtractor,
    MigrationGenerator, SchemaDiffer,
};
use anyhow::Result;
use deadpool_postgres::{Manager, ManagerConfig, Pool, RecyclingMethod};
use std::str::FromStr;
use tokio_postgres::{Config, NoTls};
use uuid::Uuid;

impl ConnectionService {
    async fn get_postgres_pool(&self, connection_id: Uuid) -> Result<Pool> {
        let (conn, password) = self.get_connection_with_password(connection_id).await?;

        if conn.db_type != "postgres"
            && conn.db_type != "cockroachdb"
            && conn.db_type != "cockroach"
        {
            return Err(anyhow::anyhow!(
                "Schema comparison currently only supported for PostgreSQL"
            ));
        }

        let mut config = Config::new();
        config.host(&conn.host);
        config.port(conn.port as u16);
        config.user(&conn.username);
        config.password(password);
        if !conn.database.is_empty() {
            config.dbname(&conn.database);
        }

        // Basic SSL handling stub - assuming NoTls for simplicity in this implementation phase
        // TODO: Implement proper SSL support matching sqlx implementation

        let mgr_config = ManagerConfig {
            recycling_method: RecyclingMethod::Fast,
        };
        let mgr = Manager::from_config(config, NoTls, mgr_config);
        let pool = Pool::builder(mgr).max_size(4).build()?;

        Ok(pool)
    }

    pub async fn compare_schemas(
        &self,
        source_connection_id: Uuid,
        target_connection_id: Uuid,
        source_schema: String,
        target_schema: String,
    ) -> Result<SchemaDiffResult> {
        // Source
        let source_pool = self.get_postgres_pool(source_connection_id).await?;
        let source_extractor = PostgresSchemaExtractor::new(source_pool);
        let source_snapshot = source_extractor
            .extract_schema(&source_schema)
            .await
            .map_err(|e| anyhow::anyhow!("Failed to extract source schema: {}", e))?;

        // Target
        let target_pool = self.get_postgres_pool(target_connection_id).await?;
        let target_extractor = PostgresSchemaExtractor::new(target_pool);
        let target_snapshot = target_extractor
            .extract_schema(&target_schema)
            .await
            .map_err(|e| anyhow::anyhow!("Failed to extract target schema: {}", e))?;

        // Compare
        Ok(SchemaDiffer::compare(&source_snapshot, &target_snapshot))
    }

    pub async fn generate_migration(
        &self,
        source_connection_id: Uuid,
        target_connection_id: Uuid,
        source_schema: String,
        target_schema: String,
    ) -> Result<String> {
        let diff_result = self
            .compare_schemas(
                source_connection_id,
                target_connection_id,
                source_schema.clone(),
                target_schema.clone(),
            )
            .await?;

        // TODO: Infer DatabaseType from connection, assuming Postgres for now as we only support Postgres diff
        let options = MigrationOptions {
            include_drops: true,
            safe_mode: true,
            database_type: DatabaseType::PostgreSQL,
        };

        let script = MigrationGenerator::generate(&diff_result.diffs, &options);

        // Format as string
        let mut sql_output = String::new();
        sql_output.push_str(&format!(
            "-- Migration from {}.{} to {}.{}\n",
            source_connection_id, source_schema, target_connection_id, target_schema
        ));
        sql_output.push_str(&format!("-- Generated at {}\n\n", chrono::Local::now()));

        for stmt in script.statements {
            sql_output.push_str(&format!("-- {}\n", stmt.description));
            sql_output.push_str(&stmt.sql);
            sql_output.push_str("\n\n");
        }

        Ok(sql_output)
    }
}
