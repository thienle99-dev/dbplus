use crate::services::db_driver::ColumnDefinition;
use crate::services::driver::ColumnManagement;
use anyhow::Result;
use async_trait::async_trait;
use sqlx::sqlite::SqlitePool;

pub struct SQLiteColumn {
    pool: SqlitePool,
}

impl SQLiteColumn {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl ColumnManagement for SQLiteColumn {
    async fn add_column(
        &self,
        schema: &str,
        table: &str,
        column: &ColumnDefinition,
    ) -> Result<()> {
        if schema != "main" && !schema.is_empty() {
            return Err(anyhow::anyhow!("SQLite only supports 'main' schema"));
        }

        let mut query = format!(
            "ALTER TABLE \"{}\" ADD COLUMN \"{}\" {}",
            table, column.name, column.data_type
        );

        if !column.is_nullable {
            query.push_str(" NOT NULL");
        }

        if let Some(ref default) = column.default_value {
            query.push_str(&format!(" DEFAULT {}", default));
        }

        sqlx::query(&query)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    async fn alter_column(
        &self,
        schema: &str,
        table: &str,
        column_name: &str,
        new_def: &ColumnDefinition,
    ) -> Result<()> {
        if schema != "main" && !schema.is_empty() {
            return Err(anyhow::anyhow!("SQLite only supports 'main' schema"));
        }

        return Err(anyhow::anyhow!(
            "SQLite does not support ALTER COLUMN. You need to recreate the table."
        ));
    }

    async fn drop_column(&self, schema: &str, table: &str, column_name: &str) -> Result<()> {
        if schema != "main" && !schema.is_empty() {
            return Err(anyhow::anyhow!("SQLite only supports 'main' schema"));
        }

        return Err(anyhow::anyhow!(
            "SQLite does not support DROP COLUMN directly. You need to recreate the table."
        ));
    }
}
