use anyhow::Result;
use deadpool_postgres::Pool;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ForeignKeyInfo {
    pub constraint_name: String,
    pub table_schema: String,
    pub table_name: String,
    pub column_name: String,
    pub referenced_table_schema: String,
    pub referenced_table_name: String,
    pub referenced_column_name: String,
    pub on_delete: String,
    pub on_update: String,
}

pub struct PostgresForeignKey {
    pool: Pool,
}

impl PostgresForeignKey {
    pub fn new(pool: Pool) -> Self {
        Self { pool }
    }

    pub async fn get_foreign_keys(&self, schema: &str) -> Result<Vec<ForeignKeyInfo>> {
        let client = self.pool.get().await?;

        let query = r#"
            SELECT
                tc.constraint_name,
                tc.table_schema,
                tc.table_name,
                kcu.column_name,
                ccu.table_schema AS referenced_table_schema,
                ccu.table_name AS referenced_table_name,
                ccu.column_name AS referenced_column_name,
                rc.delete_rule AS on_delete,
                rc.update_rule AS on_update
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
            ORDER BY tc.table_name, kcu.column_name
        "#;

        let rows = client.query(query, &[&schema]).await?;

        let foreign_keys = rows
            .iter()
            .map(|row| ForeignKeyInfo {
                constraint_name: row.get("constraint_name"),
                table_schema: row.get("table_schema"),
                table_name: row.get("table_name"),
                column_name: row.get("column_name"),
                referenced_table_schema: row.get("referenced_table_schema"),
                referenced_table_name: row.get("referenced_table_name"),
                referenced_column_name: row.get("referenced_column_name"),
                on_delete: row.get("on_delete"),
                on_update: row.get("on_update"),
            })
            .collect();

        Ok(foreign_keys)
    }
}
