use crate::models::export_ddl::{DdlObjectType, DdlScope, ExportDdlOptions};
use crate::services::driver::{
    FunctionOperations, SchemaIntrospection, TableOperations, ViewOperations,
};
use crate::services::postgres::{PostgresFunction, PostgresSchema, PostgresTable, PostgresView};
use anyhow::{anyhow, Result};
use deadpool_postgres::Pool;
use std::fmt::Write;

pub struct PostgresDdlExport {
    pool: Pool,
    schema: PostgresSchema,
    table: PostgresTable,
    view: PostgresView,
    function: PostgresFunction,
}

impl PostgresDdlExport {
    pub fn new(
        pool: Pool,
        schema: PostgresSchema,
        table: PostgresTable,
        view: PostgresView,
        function: PostgresFunction,
    ) -> Self {
        Self {
            pool,
            schema,
            table,
            view,
            function,
        }
    }

    pub async fn export_ddl(&self, options: &ExportDdlOptions) -> Result<String> {
        let mut ddl = String::new();

        ddl.push_str("-- DBPlus DDL Export\n");
        ddl.push_str(&format!("-- Generated at: {}\n\n", chrono::Utc::now()));

        match options.scope {
            DdlScope::Objects => {
                if let Some(objects) = &options.objects {
                    for obj in objects {
                        match obj.object_type {
                            DdlObjectType::Table => {
                                let table_ddl =
                                    self.build_table_ddl(&obj.schema, &obj.name).await?;
                                ddl.push_str(&table_ddl);
                                ddl.push_str("\n\n");
                            }
                            DdlObjectType::View => {
                                let view_ddl = self.build_view_ddl(&obj.schema, &obj.name).await?;
                                ddl.push_str(&view_ddl);
                                ddl.push_str("\n\n");
                            }
                            DdlObjectType::Function => {
                                let func_ddl =
                                    self.build_function_ddl(&obj.schema, &obj.name).await?;
                                ddl.push_str(&func_ddl);
                                ddl.push_str("\n\n");
                            }
                            _ => {
                                ddl.push_str(&format!(
                                    "-- Unsupported object type: {:?}\n\n",
                                    obj.object_type
                                ));
                            }
                        }
                    }
                }
            }
            DdlScope::Schema => {
                // To be implemented: Iterate all tables/views/functions in schemas
                ddl.push_str("-- Schema export not fully supported in driver mode yet.\n");
            }
            DdlScope::Database => {
                // To be implemented
                ddl.push_str("-- Database export not fully supported in driver mode yet.\n");
            }
        }

        Ok(ddl)
    }

    async fn build_table_ddl(&self, schema: &str, table: &str) -> Result<String> {
        let mut sql = String::new();

        // 1. Get Columns
        let columns = self.schema.get_columns(schema, table).await?;
        if columns.is_empty() {
            return Err(anyhow!(
                "Table {}.{} not found or has no columns",
                schema,
                table
            ));
        }

        // 2. Get Constraints
        let constraints = self.table.get_table_constraints(schema, table).await?;

        // 3. Start CREATE TABLE
        writeln!(sql, "CREATE TABLE \"{}\".\"{}\" (", schema, table)?;

        let mut lines = Vec::new();

        // Columns
        for col in &columns {
            let mut line = format!("    \"{}\" {}", col.name, col.data_type);

            if !col.is_nullable {
                line.push_str(" NOT NULL");
            }

            if let Some(default) = &col.default_value {
                line.push_str(&format!(" DEFAULT {}", default));
            }

            lines.push(line);
        }

        // Primary Keys
        let pk_cols: Vec<String> = columns
            .iter()
            .filter(|c| c.is_primary_key)
            .map(|c| format!("\"{}\"", c.name))
            .collect();

        if !pk_cols.is_empty() {
            lines.push(format!("    PRIMARY KEY ({})", pk_cols.join(", ")));
        }

        // Unique Constraints
        for uniq in &constraints.unique_constraints {
            let cols: Vec<String> = uniq.columns.iter().map(|c| format!("\"{}\"", c)).collect();
            lines.push(format!(
                "    CONSTRAINT \"{}\" UNIQUE ({})",
                uniq.constraint_name,
                cols.join(", ")
            ));
        }

        // Check Constraints
        for check in &constraints.check_constraints {
            lines.push(format!(
                "    CONSTRAINT \"{}\" CHECK ({})",
                check.constraint_name, check.check_clause
            ));
        }

        // Foreign Keys (Grouped)
        use std::collections::HashMap;
        struct FkGroup {
            constraint_name: String,
            foreign_schema: String,
            foreign_table: String,
            local_cols: Vec<String>,
            foreign_cols: Vec<String>,
            update_rule: String,
            delete_rule: String,
        }

        let mut fk_map: HashMap<String, FkGroup> = HashMap::new();

        for fk in &constraints.foreign_keys {
            let entry = fk_map.entry(fk.constraint_name.clone()).or_insert(FkGroup {
                constraint_name: fk.constraint_name.clone(),
                foreign_schema: fk.foreign_schema.clone(),
                foreign_table: fk.foreign_table.clone(),
                local_cols: vec![],
                foreign_cols: vec![],
                update_rule: fk.update_rule.clone(),
                delete_rule: fk.delete_rule.clone(),
            });
            entry.local_cols.push(fk.column_name.clone());
            entry.foreign_cols.push(fk.foreign_column.clone());
        }

        for (_, fk) in fk_map {
            let local = fk
                .local_cols
                .iter()
                .map(|c| format!("\"{}\"", c))
                .collect::<Vec<_>>()
                .join(", ");
            let foreign = fk
                .foreign_cols
                .iter()
                .map(|c| format!("\"{}\"", c))
                .collect::<Vec<_>>()
                .join(", ");

            lines.push(format!(
                "    CONSTRAINT \"{}\" FOREIGN KEY ({}) REFERENCES \"{}\".\"{}\" ({}) ON UPDATE {} ON DELETE {}",
                fk.constraint_name,
                local,
                fk.foreign_schema,
                fk.foreign_table,
                foreign,
                fk.update_rule,
                fk.delete_rule
            ));
        }

        writeln!(sql, "{}", lines.join(",\n"))?;
        writeln!(sql, ");")?;

        // 4. Indexes
        let indexes = self.table.get_table_indexes(schema, table).await?;
        for idx in indexes {
            if idx.is_primary {
                continue;
            }
            if idx.is_unique {
                if constraints
                    .unique_constraints
                    .iter()
                    .any(|u| u.constraint_name == idx.name)
                {
                    continue;
                }
            }

            let quoted_cols: Vec<String> =
                idx.columns.iter().map(|c| format!("\"{}\"", c)).collect();

            writeln!(
                sql,
                "CREATE INDEX \"{}\" ON \"{}\".\"{}\" USING {} ({});",
                idx.name,
                schema,
                table,
                idx.algorithm,
                quoted_cols.join(", ")
            )?;
        }

        // 5. Comments
        let comment = self.table.get_table_comment(schema, table).await?;
        if let Some(c) = comment.comment {
            writeln!(
                sql,
                "COMMENT ON TABLE \"{}\".\"{}\" IS '{}';",
                schema,
                table,
                c.replace("'", "''")
            )?;
        }

        // 6. Triggers
        let triggers = self.table.get_table_triggers(schema, table).await?;
        for trg in triggers {
            writeln!(sql, "{};", trg.definition)?;
        }

        Ok(sql)
    }

    async fn build_view_ddl(&self, schema: &str, view: &str) -> Result<String> {
        let info = self.view.get_view_definition(schema, view).await?;
        Ok(format!(
            "CREATE OR REPLACE VIEW \"{}\".\"{}\" AS\n{};",
            schema, view, info.definition
        ))
    }

    async fn build_function_ddl(&self, schema: &str, function: &str) -> Result<String> {
        let info = self
            .function
            .get_function_definition(schema, function)
            .await?;
        Ok(format!("{};", info.definition))
    }
}
