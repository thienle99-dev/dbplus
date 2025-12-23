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
    async fn add_column(&self, schema: &str, table: &str, column: &ColumnDefinition) -> Result<()> {
        let schema = normalize_schema(schema);

        let mut query = format!(
            "ALTER TABLE {}.{} ADD COLUMN {} {}",
            quote_ident(&schema),
            quote_ident(table),
            quote_ident(&column.name),
            column.data_type
        );

        if !column.is_nullable {
            query.push_str(" NOT NULL");
        }

        if let Some(ref default) = column.default_value {
            query.push_str(&format!(" DEFAULT {}", default));
        }

        sqlx::query(&query).execute(&self.pool).await?;

        Ok(())
    }

    async fn alter_column(
        &self,
        _schema: &str,
        _table: &str,
        _column_name: &str,
        _new_def: &ColumnDefinition,
    ) -> Result<()> {
        return Err(anyhow::anyhow!(
            "SQLite does not support ALTER COLUMN. You need to recreate the table."
        ));
    }

    async fn drop_column(&self, _schema: &str, _table: &str, _column_name: &str) -> Result<()> {
        return Err(anyhow::anyhow!(
            "SQLite does not support DROP COLUMN directly. You need to recreate the table."
        ));
    }
}

fn normalize_schema(schema: &str) -> String {
    let s = schema.trim();
    if s.is_empty() {
        "main".to_string()
    } else {
        s.to_string()
    }
}

fn quote_ident(s: &str) -> String {
    format!("\"{}\"", s.replace('"', "\"\""))
}


