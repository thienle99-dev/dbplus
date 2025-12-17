use super::differ::*;
use super::extractor::*;
use serde::{Deserialize, Serialize};

/// Migration script containing SQL statements
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MigrationScript {
    pub statements: Vec<MigrationStatement>,
    pub summary: MigrationSummary,
}

/// Individual migration statement
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MigrationStatement {
    pub id: usize,
    pub sql: String,
    pub description: String,
    pub is_destructive: bool,
    pub category: StatementCategory,
    pub dependencies: Vec<usize>,
}

/// Category of migration statement
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum StatementCategory {
    CreateTable,
    DropTable,
    AddColumn,
    DropColumn,
    ModifyColumn,
    AddPrimaryKey,
    DropPrimaryKey,
    AddIndex,
    DropIndex,
    AddForeignKey,
    DropForeignKey,
}

/// Summary of migration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MigrationSummary {
    pub total_statements: usize,
    pub destructive_statements: usize,
    pub safe_statements: usize,
}

/// Options for migration generation
#[derive(Debug, Clone, Deserialize)]
pub struct MigrationOptions {
    pub include_drops: bool,
    pub safe_mode: bool, // Add IF EXISTS, IF NOT EXISTS
    pub database_type: DatabaseType,
}

#[derive(Debug, Clone, Deserialize, PartialEq)]
pub enum DatabaseType {
    PostgreSQL,
    MySQL,
    SQLite,
}

/// Migration generator
pub struct MigrationGenerator;

impl MigrationGenerator {
    /// Generate migration script from diffs
    pub fn generate(diffs: &[SchemaDiff], options: &MigrationOptions) -> MigrationScript {
        let mut statements = Vec::new();
        let mut id_counter = 0;

        // Process diffs in correct order
        for diff in diffs {
            Self::process_diff(diff, &mut statements, &mut id_counter, options);
        }

        // Sort statements by dependencies
        Self::sort_by_dependencies(&mut statements);

        let summary = MigrationSummary {
            total_statements: statements.len(),
            destructive_statements: statements.iter().filter(|s| s.is_destructive).count(),
            safe_statements: statements.iter().filter(|s| !s.is_destructive).count(),
        };

        MigrationScript {
            statements,
            summary,
        }
    }

    fn process_diff(
        diff: &SchemaDiff,
        statements: &mut Vec<MigrationStatement>,
        id_counter: &mut usize,
        options: &MigrationOptions,
    ) {
        match diff {
            SchemaDiff::TableAdded { table } => {
                Self::generate_create_table(table, statements, id_counter, options);
            }
            SchemaDiff::TableDropped { table_name } => {
                if options.include_drops {
                    Self::generate_drop_table(table_name, statements, id_counter, options);
                }
            }
            SchemaDiff::TableModified {
                table_name,
                changes,
            } => {
                Self::generate_table_modifications(
                    table_name, changes, statements, id_counter, options,
                );
            }
        }
    }

    fn generate_create_table(
        table: &TableDefinition,
        statements: &mut Vec<MigrationStatement>,
        id_counter: &mut usize,
        options: &MigrationOptions,
    ) {
        let if_not_exists = if options.safe_mode {
            "IF NOT EXISTS "
        } else {
            ""
        };

        let mut sql = format!("CREATE TABLE {}{} (\n", if_not_exists, table.name);

        // Add columns
        let column_defs: Vec<String> = table
            .columns
            .iter()
            .map(|col| Self::format_column_definition(col, options))
            .collect();

        sql.push_str(&format!("  {}", column_defs.join(",\n  ")));

        // Add primary key
        if let Some(pk) = &table.primary_key {
            sql.push_str(&format!(",\n  PRIMARY KEY ({})", pk.join(", ")));
        }

        sql.push_str("\n);");

        statements.push(MigrationStatement {
            id: *id_counter,
            sql,
            description: format!("Create table '{}'", table.name),
            is_destructive: false,
            category: StatementCategory::CreateTable,
            dependencies: Vec::new(),
        });
        *id_counter += 1;
    }

    fn generate_drop_table(
        table_name: &str,
        statements: &mut Vec<MigrationStatement>,
        id_counter: &mut usize,
        options: &MigrationOptions,
    ) {
        let if_exists = if options.safe_mode { "IF EXISTS " } else { "" };
        let sql = format!("DROP TABLE {}{};", if_exists, table_name);

        statements.push(MigrationStatement {
            id: *id_counter,
            sql,
            description: format!("Drop table '{}'", table_name),
            is_destructive: true,
            category: StatementCategory::DropTable,
            dependencies: Vec::new(),
        });
        *id_counter += 1;
    }

    fn generate_table_modifications(
        table_name: &str,
        changes: &[TableChange],
        statements: &mut Vec<MigrationStatement>,
        id_counter: &mut usize,
        options: &MigrationOptions,
    ) {
        for change in changes {
            match change {
                TableChange::ColumnAdded { column } => {
                    let sql = format!(
                        "ALTER TABLE {} ADD COLUMN {};",
                        table_name,
                        Self::format_column_definition(column, options)
                    );
                    statements.push(MigrationStatement {
                        id: *id_counter,
                        sql,
                        description: format!("Add column '{}.{}'", table_name, column.name),
                        is_destructive: false,
                        category: StatementCategory::AddColumn,
                        dependencies: Vec::new(),
                    });
                    *id_counter += 1;
                }
                TableChange::ColumnDropped { column_name } => {
                    if options.include_drops {
                        let sql =
                            format!("ALTER TABLE {} DROP COLUMN {};", table_name, column_name);
                        statements.push(MigrationStatement {
                            id: *id_counter,
                            sql,
                            description: format!("Drop column '{}.{}'", table_name, column_name),
                            is_destructive: true,
                            category: StatementCategory::DropColumn,
                            dependencies: Vec::new(),
                        });
                        *id_counter += 1;
                    }
                }
                TableChange::ColumnModified {
                    column_name, new, ..
                } => {
                    let sql = Self::generate_modify_column(table_name, column_name, new, options);
                    statements.push(MigrationStatement {
                        id: *id_counter,
                        sql,
                        description: format!("Modify column '{}.{}'", table_name, column_name),
                        is_destructive: true,
                        category: StatementCategory::ModifyColumn,
                        dependencies: Vec::new(),
                    });
                    *id_counter += 1;
                }
                _ => {
                    // TODO: Handle other change types
                }
            }
        }
    }

    fn format_column_definition(col: &ColumnDefinition, options: &MigrationOptions) -> String {
        let mut def = format!("{} {}", col.name, col.data_type);

        if !col.is_nullable {
            def.push_str(" NOT NULL");
        }

        if let Some(default) = &col.default_value {
            def.push_str(&format!(" DEFAULT {}", default));
        }

        if col.is_auto_increment {
            match options.database_type {
                DatabaseType::PostgreSQL => def.push_str(" GENERATED ALWAYS AS IDENTITY"),
                DatabaseType::MySQL => def.push_str(" AUTO_INCREMENT"),
                DatabaseType::SQLite => def.push_str(" AUTOINCREMENT"),
            }
        }

        def
    }

    fn generate_modify_column(
        table_name: &str,
        column_name: &str,
        new_col: &ColumnDefinition,
        options: &MigrationOptions,
    ) -> String {
        match options.database_type {
            DatabaseType::PostgreSQL => {
                format!(
                    "ALTER TABLE {} ALTER COLUMN {} TYPE {};",
                    table_name, column_name, new_col.data_type
                )
            }
            DatabaseType::MySQL => {
                format!(
                    "ALTER TABLE {} MODIFY COLUMN {};",
                    table_name,
                    Self::format_column_definition(new_col, options)
                )
            }
            DatabaseType::SQLite => {
                // SQLite doesn't support ALTER COLUMN, need to recreate table
                format!(
                    "-- SQLite: Recreate table '{}' to modify column '{}'",
                    table_name, column_name
                )
            }
        }
    }

    fn sort_by_dependencies(statements: &mut Vec<MigrationStatement>) {
        // Simple topological sort based on dependencies
        // For now, use category-based ordering:
        // 1. DROP foreign keys
        // 2. DROP indexes
        // 3. DROP/MODIFY columns
        // 4. ADD columns
        // 5. CREATE indexes
        // 6. ADD foreign keys

        statements.sort_by_key(|s| match s.category {
            StatementCategory::DropForeignKey => 0,
            StatementCategory::DropIndex => 1,
            StatementCategory::DropColumn => 2,
            StatementCategory::ModifyColumn => 3,
            StatementCategory::DropTable => 4,
            StatementCategory::CreateTable => 5,
            StatementCategory::AddColumn => 6,
            StatementCategory::AddPrimaryKey => 7,
            StatementCategory::AddIndex => 8,
            StatementCategory::AddForeignKey => 9,
            _ => 10,
        });
    }
}

impl Default for MigrationOptions {
    fn default() -> Self {
        Self {
            include_drops: true,
            safe_mode: true,
            database_type: DatabaseType::PostgreSQL,
        }
    }
}
