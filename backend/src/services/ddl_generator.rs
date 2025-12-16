use crate::services::db_driver::DatabaseDriver;
use anyhow::{anyhow, Result};
use std::fmt::Write;

pub struct DdlGenerator;

impl DdlGenerator {
    pub async fn generate_table_ddl(
        driver: &impl DatabaseDriver,
        schema: &str,
        table: &str,
    ) -> Result<String> {
        let mut sql = String::new();

        // 1. Get Columns
        let columns = DatabaseDriver::get_columns(driver, schema, table).await?;
        if columns.is_empty() {
            return Err(anyhow!(
                "Table {}.{} not found or has no columns",
                schema,
                table
            ));
        }

        // 2. Get Constraints
        let constraints = DatabaseDriver::get_table_constraints(driver, schema, table).await?;

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
        let indexes = DatabaseDriver::get_table_indexes(driver, schema, table).await?;
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
        let comment = DatabaseDriver::get_table_comment(driver, schema, table).await?;
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
        let triggers = DatabaseDriver::get_table_triggers(driver, schema, table).await?;
        for trg in triggers {
            writeln!(sql, "{};", trg.definition)?;
        }

        Ok(sql)
    }

    pub async fn generate_view_ddl(
        driver: &impl DatabaseDriver,
        schema: &str,
        view: &str,
    ) -> Result<String> {
        let info = DatabaseDriver::get_view_definition(driver, schema, view).await?;
        Ok(format!(
            "CREATE OR REPLACE VIEW \"{}\".\"{}\" AS\n{};",
            schema, view, info.definition
        ))
    }

    pub async fn generate_function_ddl(
        driver: &impl DatabaseDriver,
        schema: &str,
        function: &str,
    ) -> Result<String> {
        let info = DatabaseDriver::get_function_definition(driver, schema, function).await?;
        Ok(format!("{};", info.definition))
    }
}
