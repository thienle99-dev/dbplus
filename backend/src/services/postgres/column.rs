use crate::services::db_driver::ColumnDefinition;
use crate::services::driver::ColumnManagement;
use anyhow::Result;
use async_trait::async_trait;
use deadpool_postgres::Pool;

pub struct PostgresColumn {
    pool: Pool,
}

impl PostgresColumn {
    pub fn new(pool: Pool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl ColumnManagement for PostgresColumn {
    async fn add_column(
        &self,
        schema: &str,
        table: &str,
        column: &ColumnDefinition,
    ) -> Result<()> {
        let client = self.pool.get().await?;
        let mut query = format!(
            "ALTER TABLE \"{}\".\"{}\" ADD COLUMN \"{}\" {}",
            schema, table, column.name, column.data_type
        );

        if !column.is_nullable {
            query.push_str(" NOT NULL");
        }

        if let Some(default) = &column.default_value {
            if !default.is_empty() {
                query.push_str(&format!(" DEFAULT {}", default));
            }
        }

        tracing::info!("[PostgresColumn] add_column - query: {}", query);
        client.execute(&query, &[]).await?;
        Ok(())
    }

    async fn alter_column(
        &self,
        schema: &str,
        table: &str,
        column_name: &str,
        new_def: &ColumnDefinition,
    ) -> Result<()> {
        let client = self.pool.get().await?;

        if column_name != new_def.name {
            let query = format!(
                "ALTER TABLE \"{}\".\"{}\" RENAME COLUMN \"{}\" TO \"{}\"",
                schema, table, column_name, new_def.name
            );
            tracing::info!("[PostgresColumn] rename column - query: {}", query);
            client.execute(&query, &[]).await?;
        }

        let current_column_name = &new_def.name;

        let type_query = format!(
            "ALTER TABLE \"{}\".\"{}\" ALTER COLUMN \"{}\" TYPE {} USING \"{}\"::{}",
            schema,
            table,
            current_column_name,
            new_def.data_type,
            current_column_name,
            new_def.data_type
        );
        tracing::info!("[PostgresColumn] alter column type - query: {}", type_query);
        client.execute(&type_query, &[]).await?;

        let null_query = if new_def.is_nullable {
            format!(
                "ALTER TABLE \"{}\".\"{}\" ALTER COLUMN \"{}\" DROP NOT NULL",
                schema, table, current_column_name
            )
        } else {
            format!(
                "ALTER TABLE \"{}\".\"{}\" ALTER COLUMN \"{}\" SET NOT NULL",
                schema, table, current_column_name
            )
        };
        tracing::info!(
            "[PostgresColumn] alter column nullability - query: {}",
            null_query
        );
        client.execute(&null_query, &[]).await?;

        let default_query = if let Some(default) = &new_def.default_value {
            if default.is_empty() {
                format!(
                    "ALTER TABLE \"{}\".\"{}\" ALTER COLUMN \"{}\" DROP DEFAULT",
                    schema, table, current_column_name
                )
            } else {
                format!(
                    "ALTER TABLE \"{}\".\"{}\" ALTER COLUMN \"{}\" SET DEFAULT {}",
                    schema, table, current_column_name, default
                )
            }
        } else {
            format!(
                "ALTER TABLE \"{}\".\"{}\" ALTER COLUMN \"{}\" DROP DEFAULT",
                schema, table, current_column_name
            )
        };
        tracing::info!(
            "[PostgresColumn] alter column default - query: {}",
            default_query
        );
        client.execute(&default_query, &[]).await?;

        Ok(())
    }

    async fn drop_column(&self, schema: &str, table: &str, column_name: &str) -> Result<()> {
        let client = self.pool.get().await?;
        let query = format!(
            "ALTER TABLE \"{}\".\"{}\" DROP COLUMN \"{}\"",
            schema, table, column_name
        );
        tracing::info!("[PostgresColumn] drop_column - query: {}", query);
        client.execute(&query, &[]).await?;
        Ok(())
    }
}
