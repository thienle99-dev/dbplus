use crate::services::schema_diff::extractor::*;
use deadpool_postgres::Pool;

pub struct PostgresSchemaExtractor {
    pool: Pool,
}

impl PostgresSchemaExtractor {
    pub fn new(pool: Pool) -> Self {
        Self { pool }
    }

    /// Extract complete schema snapshot from PostgreSQL
    pub async fn extract_schema(&self, schema_name: &str) -> Result<SchemaSnapshot, String> {
        let mut snapshot = SchemaSnapshot::new(schema_name.to_string());

        // Extract tables
        snapshot.tables = self.extract_tables(schema_name).await?;

        // Extract indexes
        snapshot.indexes = self.extract_indexes(schema_name).await?;

        // Extract foreign keys
        snapshot.foreign_keys = self.extract_foreign_keys(schema_name).await?;

        Ok(snapshot)
    }

    async fn extract_tables(&self, schema_name: &str) -> Result<Vec<TableDefinition>, String> {
        let client = self.pool.get().await.map_err(|e| e.to_string())?;

        let tables_query = r#"
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = $1
            AND table_type = 'BASE TABLE'
            ORDER BY table_name
        "#;

        let rows = client
            .query(tables_query, &[&schema_name])
            .await
            .map_err(|e| e.to_string())?;

        let mut tables = Vec::new();
        for row in rows {
            let table_name: String = row.get(0);
            let columns = self.extract_columns(schema_name, &table_name).await?;
            let primary_key = self.extract_primary_key(schema_name, &table_name).await?;

            tables.push(TableDefinition {
                name: table_name,
                columns,
                primary_key,
            });
        }

        Ok(tables)
    }

    async fn extract_columns(
        &self,
        schema_name: &str,
        table_name: &str,
    ) -> Result<Vec<ColumnDefinition>, String> {
        let client = self.pool.get().await.map_err(|e| e.to_string())?;

        let columns_query = r#"
            SELECT 
                column_name,
                data_type,
                is_nullable,
                column_default,
                character_maximum_length,
                numeric_precision,
                numeric_scale
            FROM information_schema.columns
            WHERE table_schema = $1
            AND table_name = $2
            ORDER BY ordinal_position
        "#;

        let rows = client
            .query(columns_query, &[&schema_name, &table_name])
            .await
            .map_err(|e| e.to_string())?;

        let columns = rows
            .iter()
            .map(|row| {
                let column_name: String = row.get(0);
                let data_type: String = row.get(1);
                let is_nullable: String = row.get(2);
                let column_default: Option<String> = row.get(3);
                let character_maximum_length: Option<i32> = row.get(4);
                let numeric_precision: Option<i32> = row.get(5);
                let numeric_scale: Option<i32> = row.get(6);

                let is_auto_increment = column_default
                    .as_ref()
                    .map(|d| d.starts_with("nextval("))
                    .unwrap_or(false);

                ColumnDefinition {
                    name: column_name,
                    data_type,
                    is_nullable: is_nullable == "YES",
                    default_value: column_default,
                    is_auto_increment,
                    character_maximum_length,
                    numeric_precision,
                    numeric_scale,
                }
            })
            .collect();

        Ok(columns)
    }

    async fn extract_primary_key(
        &self,
        schema_name: &str,
        table_name: &str,
    ) -> Result<Option<Vec<String>>, String> {
        let client = self.pool.get().await.map_err(|e| e.to_string())?;

        let pk_query = r#"
            SELECT a.attname
            FROM pg_index i
            JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
            WHERE i.indrelid = ($1 || '.' || $2)::regclass
            AND i.indisprimary
            ORDER BY array_position(i.indkey, a.attnum)
        "#;

        let rows = client
            .query(pk_query, &[&schema_name, &table_name])
            .await
            .map_err(|e| e.to_string())?;

        if rows.is_empty() {
            Ok(None)
        } else {
            let columns: Vec<String> = rows.iter().map(|row| row.get(0)).collect();
            Ok(Some(columns))
        }
    }

    async fn extract_indexes(&self, schema_name: &str) -> Result<Vec<IndexDefinition>, String> {
        let client = self.pool.get().await.map_err(|e| e.to_string())?;

        let indexes_query = r#"
            SELECT
                i.relname as index_name,
                t.relname as table_name,
                ix.indisunique as is_unique,
                am.amname as index_type,
                ARRAY_AGG(a.attname ORDER BY a.attnum) as columns
            FROM pg_class t
            JOIN pg_index ix ON t.oid = ix.indrelid
            JOIN pg_class i ON i.oid = ix.indexrelid
            JOIN pg_am am ON i.relam = am.oid
            JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
            JOIN pg_namespace n ON t.relnamespace = n.oid
            WHERE n.nspname = $1
            AND NOT ix.indisprimary
            GROUP BY i.relname, t.relname, ix.indisunique, am.amname
            ORDER BY t.relname, i.relname
        "#;

        let rows = client
            .query(indexes_query, &[&schema_name])
            .await
            .map_err(|e| e.to_string())?;

        let indexes = rows
            .iter()
            .map(|row| {
                let index_name: String = row.get(0);
                let table_name: String = row.get(1);
                let is_unique: bool = row.get(2);
                let index_type: String = row.get(3);
                let columns: Vec<String> = row.get(4);

                IndexDefinition {
                    name: index_name,
                    table_name,
                    columns,
                    is_unique,
                    index_type: Some(index_type),
                }
            })
            .collect();

        Ok(indexes)
    }

    async fn extract_foreign_keys(
        &self,
        schema_name: &str,
    ) -> Result<Vec<ForeignKeyDefinition>, String> {
        let client = self.pool.get().await.map_err(|e| e.to_string())?;

        let fk_query = r#"
            SELECT
                tc.constraint_name,
                tc.table_name,
                kcu.column_name,
                ccu.table_name AS referenced_table_name,
                ccu.column_name AS referenced_column_name,
                rc.delete_rule as on_delete,
                rc.update_rule as on_update
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
                ON ccu.constraint_name = tc.constraint_name
                AND ccu.table_schema = tc.table_schema
            JOIN information_schema.referential_constraints AS rc
                ON rc.constraint_name = tc.constraint_name
                AND rc.constraint_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_schema = $1
            ORDER BY tc.table_name, tc.constraint_name
        "#;

        let rows = client
            .query(fk_query, &[&schema_name])
            .await
            .map_err(|e| e.to_string())?;

        let foreign_keys = rows
            .iter()
            .map(|row| {
                let constraint_name: String = row.get(0);
                let table_name: String = row.get(1);
                let column_name: String = row.get(2);
                let referenced_table_name: String = row.get(3);
                let referenced_column_name: String = row.get(4);
                let on_delete: Option<String> = row.get(5);
                let on_update: Option<String> = row.get(6);

                ForeignKeyDefinition {
                    constraint_name,
                    table_name,
                    column_name,
                    referenced_table_name,
                    referenced_column_name,
                    on_delete,
                    on_update,
                }
            })
            .collect();

        Ok(foreign_keys)
    }
}
