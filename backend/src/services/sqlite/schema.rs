use crate::services::db_driver::{
    SchemaForeignKey, SearchResult, TableColumn, TableInfo, TableMetadata,
};
use crate::services::driver::SchemaIntrospection;
use anyhow::Result;
use async_trait::async_trait;
use sqlx::{sqlite::SqlitePool, Row};

pub struct SQLiteSchema {
    pool: SqlitePool,
}

impl SQLiteSchema {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl SchemaIntrospection for SQLiteSchema {
    async fn get_databases(&self) -> Result<Vec<String>> {
        self.get_schemas().await
    }

    async fn get_schemas(&self) -> Result<Vec<String>> {
        let rows = sqlx::query("PRAGMA database_list")
            .fetch_all(&self.pool)
            .await?;
        let mut schemas: Vec<String> = rows
            .into_iter()
            .filter_map(|row| row.try_get::<String, _>(1).ok())
            .filter(|name| name != "temp")
            .collect();
        schemas.sort();
        schemas.dedup();
        Ok(schemas)
    }

    async fn get_tables(&self, schema: &str) -> Result<Vec<TableInfo>> {
        let schema = normalize_schema(schema);
        let ident = quote_ident(&schema);
        let schema_literal = quote_literal(&schema);
        let query = format!(
            "SELECT {} as schema, name, type FROM {}.sqlite_master WHERE type IN ('table', 'view') AND name NOT LIKE 'sqlite_%' ORDER BY name",
            schema_literal, ident
        );

        let rows = sqlx::query(&query).fetch_all(&self.pool).await?;

        Ok(rows
            .iter()
            .map(|row| TableInfo {
                schema: row.get::<String, _>(0),
                name: row.get::<String, _>(1),
                table_type: if row.get::<String, _>(2) == "view" {
                    "VIEW".to_string()
                } else {
                    "BASE TABLE".to_string()
                },
            })
            .collect())
    }

    async fn get_columns(&self, schema: &str, table: &str) -> Result<Vec<TableColumn>> {
        tracing::info!(
            "[SQLiteSchema] get_columns - schema: {}, table: {}",
            schema,
            table
        );

        let schema = normalize_schema(schema);
        let query = format!(
            "PRAGMA {}.table_info({})",
            quote_ident(&schema),
            quote_ident(table)
        );
        let rows = sqlx::query(&query).fetch_all(&self.pool).await?;

        let mut pk_columns = std::collections::HashSet::new();
        let pk_query = format!(
            "PRAGMA {}.table_info({})",
            quote_ident(&schema),
            quote_ident(table)
        );
        let pk_rows = sqlx::query(&pk_query).fetch_all(&self.pool).await?;
        for row in pk_rows {
            let pk: i32 = row.get(5);
            if pk > 0 {
                if let Ok(name) = row.try_get::<String, _>(1) {
                    pk_columns.insert(name);
                }
            }
        }

        let columns: Vec<TableColumn> = rows
            .iter()
            .map(|row| {
                let name: String = row.get(1);
                let data_type: String = row.get(2);
                let not_null: i32 = row.get(3);
                let default_value: Option<String> = row.get(4);
                let is_pk = pk_columns.contains(&name);

                TableColumn {
                    name,
                    data_type,
                    is_nullable: not_null == 0,
                    default_value,
                    is_primary_key: is_pk,
                    is_foreign_key: false, // TODO: Implement proper FK check
                }
            })
            .collect();

        tracing::info!(
            "[SQLiteSchema] get_columns - found {} columns",
            columns.len()
        );

        Ok(columns)
    }

    async fn get_schema_metadata(&self, schema: &str) -> Result<Vec<TableMetadata>> {
        let schema = normalize_schema(schema);
        let ident = quote_ident(&schema);
        let tables_query = format!(
            "SELECT name FROM {}.sqlite_master WHERE type IN ('table', 'view') AND name NOT LIKE 'sqlite_%' ORDER BY name",
            ident
        );
        let rows = sqlx::query(&tables_query).fetch_all(&self.pool).await?;

        let mut result = Vec::new();
        for row in rows {
            let table_name: String = row.get(0);
            let col_query = format!(
                "PRAGMA {}.table_info({})",
                quote_ident(&schema),
                quote_ident(&table_name)
            );
            let col_rows = sqlx::query(&col_query).fetch_all(&self.pool).await?;
            let columns: Vec<String> = col_rows.iter().map(|r| r.get(1)).collect();

            result.push(TableMetadata {
                table_name,
                columns,
            });
        }
        Ok(result)
    }

    async fn search_objects(&self, query: &str) -> Result<Vec<SearchResult>> {
        let schemas = self.get_schemas().await?;
        let search_term = format!("%{}%", query);
        let mut results = Vec::new();

        for schema_name in schemas {
            let schema = normalize_schema(&schema_name);
            let ident = quote_ident(&schema);

            let sql = format!(
                "SELECT CAST($1 AS TEXT) as schema, name, type FROM {}.sqlite_master 
                 WHERE type IN ('table', 'view', 'trigger') 
                 AND name NOT LIKE 'sqlite_%' 
                 AND name LIKE $2
                 LIMIT 50",
                ident
            );

            // We use fetch_all. The error handling loop continues?
            // If one schema fails (e.g. detached), log and continue?
            // For now propagate error, but optimally should skip.

            if let Ok(rows) = sqlx::query(&sql)
                .bind(&schema)
                .bind(&search_term)
                .fetch_all(&self.pool)
                .await
            {
                for row in rows {
                    let type_str: String = row.get(2);
                    let unified_type = match type_str.as_str() {
                        "table" => "TABLE",
                        "view" => "VIEW",
                        "trigger" => "TRIGGER",
                        _ => "OTHER",
                    };

                    results.push(SearchResult {
                        schema: row.get(0),
                        name: row.get(1),
                        r#type: unified_type.to_string(),
                    });
                }
            }

            if results.len() >= 50 {
                results.truncate(50);
                break;
            }
        }

        Ok(results)
    }

    async fn get_schema_foreign_keys(&self, schema: &str) -> Result<Vec<SchemaForeignKey>> {
        let tables = self.get_tables(schema).await?;
        let schema_name = normalize_schema(schema);
        let mut fks = Vec::new();

        for table in tables {
            let unique_table_id = quote_ident(&table.name); // Ensure we format it correctly

            // Skip views if table_type is VIEW, because views don't have FKs in SQLite standard
            if table.table_type == "VIEW" {
                continue;
            }

            let query = format!(
                "PRAGMA {}.foreign_key_list({})",
                quote_ident(&schema_name),
                unique_table_id
            );

            let rows = sqlx::query(&query).fetch_all(&self.pool).await?;

            for row in rows {
                // id, seq, table, from, to, on_update, on_delete, match
                let target_table: String = row.get(2);
                let source_column: String = row.get(3);
                let target_column: String = row.get(4);

                fks.push(SchemaForeignKey {
                    name: format!("fk_{}_{}", table.name, source_column),
                    source_schema: schema_name.clone(),
                    source_table: table.name.clone(),
                    source_column,
                    target_schema: schema_name.clone(),
                    target_table,
                    target_column,
                });
            }
        }
        Ok(fks)
    }

    async fn get_extensions(&self) -> Result<Vec<crate::services::db_driver::ExtensionInfo>> {
        // SQLite doesn't have extensions in the same way PostgreSQL does
        Ok(Vec::new())
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

fn quote_literal(s: &str) -> String {
    format!("'{}'", s.replace('\'', "''"))
}

