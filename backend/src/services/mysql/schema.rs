use anyhow::Result;
use async_trait::async_trait;
use mysql_async::prelude::Queryable;

use super::MySqlDriver;
use crate::services::db_driver::{
    ExtensionInfo, SchemaForeignKey, SearchResult, TableColumn, TableInfo, TableMetadata,
};
use crate::services::driver::SchemaIntrospection;

#[async_trait]
impl SchemaIntrospection for MySqlDriver {
    async fn get_databases(&self) -> Result<Vec<String>> {
        let mut conn = self.pool.get_conn().await?;
        let dbs: Vec<String> = conn.query("SHOW DATABASES").await?;
        Ok(dbs)
    }

    async fn get_schemas(&self) -> Result<Vec<String>> {
        self.get_databases().await
    }

    async fn get_tables(&self, schema: &str) -> Result<Vec<TableInfo>> {
        let mut conn = self.pool.get_conn().await?;
        let query = r#"
            SELECT TABLE_NAME, TABLE_TYPE 
            FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = ?
        "#;

        let rows: Vec<(String, String)> = conn.exec(query, (schema,)).await?;

        Ok(rows
            .into_iter()
            .map(|(name, type_)| TableInfo {
                schema: schema.to_string(),
                name,
                table_type: type_,
            })
            .collect())
    }

    async fn get_columns(&self, schema: &str, table: &str) -> Result<Vec<TableColumn>> {
        let mut conn = self.pool.get_conn().await?;
        let query = r#"
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY, COLUMN_DEFAULT
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
            ORDER BY ORDINAL_POSITION
        "#;

        let result: Vec<(String, String, String, String, Option<String>)> =
            conn.exec(query, (schema, table)).await?;

        Ok(result
            .into_iter()
            .map(
                |(name, data_type, is_nullable, col_key, default_val)| TableColumn {
                    name,
                    data_type,
                    is_nullable: is_nullable == "YES",
                    is_primary_key: col_key == "PRI",
                    is_foreign_key: false, // TODO: Implement proper FK check for MySQL
                    default_value: default_val,
                },
            )
            .collect())
    }

    async fn get_schema_metadata(&self, schema: &str) -> Result<Vec<TableMetadata>> {
        let mut conn = self.pool.get_conn().await?;
        let query = r#"
            SELECT TABLE_NAME, COLUMN_NAME
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = ?
            ORDER BY TABLE_NAME, ORDINAL_POSITION
        "#;

        let rows: Vec<(String, String)> = conn.exec(query, (schema,)).await?;

        let mut map = std::collections::HashMap::new();
        for (table, col) in rows {
            map.entry(table).or_insert_with(Vec::new).push(col);
        }

        Ok(map
            .into_iter()
            .map(|(table_name, columns)| TableMetadata {
                table_name,
                columns,
            })
            .collect())
    }

    async fn search_objects(&self, query_str: &str) -> Result<Vec<SearchResult>> {
        let mut conn = self.pool.get_conn().await?;
        let like_query = format!("%{}%", query_str);

        // Search tables and views
        let sql = r#"
            SELECT TABLE_SCHEMA, TABLE_NAME, TABLE_TYPE
            FROM information_schema.TABLES
            WHERE TABLE_NAME LIKE ?
            LIMIT 50
         "#;

        let rows: Vec<(String, String, String)> = conn.exec(sql, (&like_query,)).await?;

        Ok(rows
            .into_iter()
            .map(|(schema, name, type_)| {
                let r#type = if type_ == "VIEW" {
                    "VIEW".to_string()
                } else {
                    "TABLE".to_string()
                };
                SearchResult {
                    schema,
                    name,
                    r#type,
                }
            })
            .collect())
    }

    async fn get_schema_foreign_keys(&self, schema: &str) -> Result<Vec<SchemaForeignKey>> {
        let mut conn = self.pool.get_conn().await?;
        let query = r#"
            SELECT 
                CONSTRAINT_NAME, 
                TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME, 
                REFERENCED_TABLE_SCHEMA, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
            FROM information_schema.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = ? AND REFERENCED_TABLE_NAME IS NOT NULL
        "#;

        let rows: Vec<(
            String,
            String,
            String,
            String,
            Option<String>,
            Option<String>,
            Option<String>,
        )> = conn.exec(query, (schema,)).await?;

        Ok(rows
            .into_iter()
            .filter_map(
                |(name, s_schema, s_table, s_col, t_schema, t_table, t_col)| {
                    if let (Some(ts), Some(tt), Some(tc)) = (t_schema, t_table, t_col) {
                        Some(SchemaForeignKey {
                            name,
                            source_schema: s_schema,
                            source_table: s_table,
                            source_column: s_col,
                            target_schema: ts,
                            target_table: tt,
                            target_column: tc,
                        })
                    } else {
                        None
                    }
                },
            )
            .collect())
    }

    async fn get_extensions(&self) -> Result<Vec<ExtensionInfo>> {
        Ok(vec![])
    }
}
