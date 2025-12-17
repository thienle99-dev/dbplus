use super::extractor::*;
use serde::{Deserialize, Serialize};

/// Represents all differences between two schemas
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SchemaDiffResult {
    pub source_schema: String,
    pub target_schema: String,
    pub diffs: Vec<SchemaDiff>,
    pub stats: DiffStats,
}

/// Statistics about the diff
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiffStats {
    pub tables_added: usize,
    pub tables_dropped: usize,
    pub tables_modified: usize,
    pub columns_added: usize,
    pub columns_dropped: usize,
    pub columns_modified: usize,
    pub indexes_added: usize,
    pub indexes_dropped: usize,
    pub foreign_keys_added: usize,
    pub foreign_keys_dropped: usize,
}

/// Types of schema differences
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum SchemaDiff {
    TableAdded {
        table: TableDefinition,
    },
    TableDropped {
        table_name: String,
    },
    TableModified {
        table_name: String,
        changes: Vec<TableChange>,
    },
}

/// Types of table changes
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum TableChange {
    ColumnAdded {
        column: ColumnDefinition,
    },
    ColumnDropped {
        column_name: String,
    },
    ColumnModified {
        column_name: String,
        old: ColumnDefinition,
        new: ColumnDefinition,
        changes: Vec<ColumnChange>,
    },
    PrimaryKeyAdded {
        columns: Vec<String>,
    },
    PrimaryKeyDropped {
        columns: Vec<String>,
    },
    PrimaryKeyModified {
        old_columns: Vec<String>,
        new_columns: Vec<String>,
    },
    IndexAdded {
        index: IndexDefinition,
    },
    IndexDropped {
        index_name: String,
    },
    ForeignKeyAdded {
        foreign_key: ForeignKeyDefinition,
    },
    ForeignKeyDropped {
        constraint_name: String,
    },
}

/// Specific column changes
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ColumnChange {
    DataTypeChanged {
        old: String,
        new: String,
    },
    NullabilityChanged {
        old: bool,
        new: bool,
    },
    DefaultValueChanged {
        old: Option<String>,
        new: Option<String>,
    },
    AutoIncrementChanged {
        old: bool,
        new: bool,
    },
}

/// Schema differ
pub struct SchemaDiffer;

impl SchemaDiffer {
    /// Compare two schema snapshots
    pub fn compare(source: &SchemaSnapshot, target: &SchemaSnapshot) -> SchemaDiffResult {
        let mut diffs = Vec::new();
        let mut stats = DiffStats::default();

        // Compare tables
        Self::compare_tables(source, target, &mut diffs, &mut stats);

        SchemaDiffResult {
            source_schema: source.schema_name.clone(),
            target_schema: target.schema_name.clone(),
            diffs,
            stats,
        }
    }

    fn compare_tables(
        source: &SchemaSnapshot,
        target: &SchemaSnapshot,
        diffs: &mut Vec<SchemaDiff>,
        stats: &mut DiffStats,
    ) {
        // Find added tables (in target but not in source)
        for table in &target.tables {
            if source.find_table(&table.name).is_none() {
                diffs.push(SchemaDiff::TableAdded {
                    table: table.clone(),
                });
                stats.tables_added += 1;
            }
        }

        // Find dropped tables (in source but not in target)
        for table in &source.tables {
            if target.find_table(&table.name).is_none() {
                diffs.push(SchemaDiff::TableDropped {
                    table_name: table.name.clone(),
                });
                stats.tables_dropped += 1;
            }
        }

        // Find modified tables (in both)
        for source_table in &source.tables {
            if let Some(target_table) = target.find_table(&source_table.name) {
                let changes = Self::compare_table_structure(source_table, target_table, stats);
                if !changes.is_empty() {
                    diffs.push(SchemaDiff::TableModified {
                        table_name: source_table.name.clone(),
                        changes,
                    });
                    stats.tables_modified += 1;
                }
            }
        }
    }

    fn compare_table_structure(
        source: &TableDefinition,
        target: &TableDefinition,
        stats: &mut DiffStats,
    ) -> Vec<TableChange> {
        let mut changes = Vec::new();

        // Compare columns
        Self::compare_columns(source, target, &mut changes, stats);

        // Compare primary keys
        Self::compare_primary_keys(source, target, &mut changes);

        changes
    }

    fn compare_columns(
        source: &TableDefinition,
        target: &TableDefinition,
        changes: &mut Vec<TableChange>,
        stats: &mut DiffStats,
    ) {
        // Find added columns
        for column in &target.columns {
            if source.find_column(&column.name).is_none() {
                changes.push(TableChange::ColumnAdded {
                    column: column.clone(),
                });
                stats.columns_added += 1;
            }
        }

        // Find dropped columns
        for column in &source.columns {
            if target.find_column(&column.name).is_none() {
                changes.push(TableChange::ColumnDropped {
                    column_name: column.name.clone(),
                });
                stats.columns_dropped += 1;
            }
        }

        // Find modified columns
        for source_col in &source.columns {
            if let Some(target_col) = target.find_column(&source_col.name) {
                if !source_col.is_identical(target_col) {
                    let col_changes = Self::detect_column_changes(source_col, target_col);
                    if !col_changes.is_empty() {
                        changes.push(TableChange::ColumnModified {
                            column_name: source_col.name.clone(),
                            old: source_col.clone(),
                            new: target_col.clone(),
                            changes: col_changes,
                        });
                        stats.columns_modified += 1;
                    }
                }
            }
        }
    }

    fn detect_column_changes(old: &ColumnDefinition, new: &ColumnDefinition) -> Vec<ColumnChange> {
        let mut changes = Vec::new();

        if !old.same_type(new) {
            changes.push(ColumnChange::DataTypeChanged {
                old: old.data_type.clone(),
                new: new.data_type.clone(),
            });
        }

        if old.is_nullable != new.is_nullable {
            changes.push(ColumnChange::NullabilityChanged {
                old: old.is_nullable,
                new: new.is_nullable,
            });
        }

        if old.default_value != new.default_value {
            changes.push(ColumnChange::DefaultValueChanged {
                old: old.default_value.clone(),
                new: new.default_value.clone(),
            });
        }

        if old.is_auto_increment != new.is_auto_increment {
            changes.push(ColumnChange::AutoIncrementChanged {
                old: old.is_auto_increment,
                new: new.is_auto_increment,
            });
        }

        changes
    }

    fn compare_primary_keys(
        source: &TableDefinition,
        target: &TableDefinition,
        changes: &mut Vec<TableChange>,
    ) {
        match (&source.primary_key, &target.primary_key) {
            (None, Some(new_pk)) => {
                changes.push(TableChange::PrimaryKeyAdded {
                    columns: new_pk.clone(),
                });
            }
            (Some(old_pk), None) => {
                changes.push(TableChange::PrimaryKeyDropped {
                    columns: old_pk.clone(),
                });
            }
            (Some(old_pk), Some(new_pk)) if old_pk != new_pk => {
                changes.push(TableChange::PrimaryKeyModified {
                    old_columns: old_pk.clone(),
                    new_columns: new_pk.clone(),
                });
            }
            _ => {}
        }
    }
}

impl Default for DiffStats {
    fn default() -> Self {
        Self {
            tables_added: 0,
            tables_dropped: 0,
            tables_modified: 0,
            columns_added: 0,
            columns_dropped: 0,
            columns_modified: 0,
            indexes_added: 0,
            indexes_dropped: 0,
            foreign_keys_added: 0,
            foreign_keys_dropped: 0,
        }
    }
}
