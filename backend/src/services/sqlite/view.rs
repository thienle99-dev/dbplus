use crate::services::db_driver::ViewInfo;
use crate::services::driver::ViewOperations;
use anyhow::Result;
use async_trait::async_trait;
use sqlx::{sqlite::SqlitePool, Row};

pub struct SQLiteView {
    pool: SqlitePool,
}

impl SQLiteView {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl ViewOperations for SQLiteView {
    async fn list_views(&self, schema: &str) -> Result<Vec<ViewInfo>> {
        tracing::info!("[SQLiteView] list_views - schema: {}", schema);

        if schema != "main" && !schema.is_empty() {
            return Ok(vec![]);
        }

        let query = "SELECT 'main' as schema, name, sql FROM sqlite_master WHERE type = 'view' AND name NOT LIKE 'sqlite_%' ORDER BY name";
        let rows = sqlx::query(query)
            .fetch_all(&self.pool)
            .await?;

        Ok(rows
            .iter()
            .map(|row| ViewInfo {
                schema: row.get::<String, _>(0),
                name: row.get::<String, _>(1),
                definition: row.get::<Option<String>, _>(2).unwrap_or_default(),
                owner: None,
                created_at: None,
            })
            .collect())
    }

    async fn get_view_definition(
        &self,
        schema: &str,
        view_name: &str,
    ) -> Result<ViewInfo> {
        tracing::info!(
            "[SQLiteView] get_view_definition - schema: {}, view: {}",
            schema,
            view_name
        );

        if schema != "main" && !schema.is_empty() {
            return Err(anyhow::anyhow!("View not found"));
        }

        let query = "SELECT 'main' as schema, name, sql FROM sqlite_master WHERE type = 'view' AND name = ?";
        let row = sqlx::query(query)
            .bind(view_name)
            .fetch_optional(&self.pool)
            .await?;

        match row {
            Some(row) => Ok(ViewInfo {
                schema: row.get::<String, _>(0),
                name: row.get::<String, _>(1),
                definition: row.get::<Option<String>, _>(2).unwrap_or_default(),
                owner: None,
                created_at: None,
            }),
            None => Err(anyhow::anyhow!("View not found")),
        }
    }
}
