use serde::{Deserialize, Serialize};

/// Represents a complete schema snapshot
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SchemaSnapshot {
    pub schema_name: String,
    pub tables: Vec<TableDefinition>,
    pub indexes: Vec<IndexDefinition>,
    pub foreign_keys: Vec<ForeignKeyDefinition>,
}

/// Table definition
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct TableDefinition {
    pub name: String,
    pub columns: Vec<ColumnDefinition>,
    pub primary_key: Option<Vec<String>>,
}

/// Column definition
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ColumnDefinition {
    pub name: String,
    pub data_type: String,
    pub is_nullable: bool,
    pub default_value: Option<String>,
    pub is_auto_increment: bool,
    pub character_maximum_length: Option<i32>,
    pub numeric_precision: Option<i32>,
    pub numeric_scale: Option<i32>,
}

/// Index definition
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct IndexDefinition {
    pub name: String,
    pub table_name: String,
    pub columns: Vec<String>,
    pub is_unique: bool,
    pub index_type: Option<String>,
}

/// Foreign key definition
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ForeignKeyDefinition {
    pub constraint_name: String,
    pub table_name: String,
    pub column_name: String,
    pub referenced_table_name: String,
    pub referenced_column_name: String,
    pub on_delete: Option<String>,
    pub on_update: Option<String>,
}

impl SchemaSnapshot {
    pub fn new(schema_name: String) -> Self {
        Self {
            schema_name,
            tables: Vec::new(),
            indexes: Vec::new(),
            foreign_keys: Vec::new(),
        }
    }

    /// Find a table by name
    pub fn find_table(&self, name: &str) -> Option<&TableDefinition> {
        self.tables.iter().find(|t| t.name == name)
    }

    /// Find an index by name
    pub fn find_index(&self, name: &str) -> Option<&IndexDefinition> {
        self.indexes.iter().find(|i| i.name == name)
    }

    /// Find a foreign key by constraint name
    pub fn find_foreign_key(&self, name: &str) -> Option<&ForeignKeyDefinition> {
        self.foreign_keys
            .iter()
            .find(|fk| fk.constraint_name == name)
    }
}

impl TableDefinition {
    /// Find a column by name
    pub fn find_column(&self, name: &str) -> Option<&ColumnDefinition> {
        self.columns.iter().find(|c| c.name == name)
    }

    /// Check if column is part of primary key
    pub fn is_primary_key_column(&self, column_name: &str) -> bool {
        self.primary_key
            .as_ref()
            .map(|pk| pk.contains(&column_name.to_string()))
            .unwrap_or(false)
    }
}

impl ColumnDefinition {
    /// Check if two columns have the same type
    pub fn same_type(&self, other: &ColumnDefinition) -> bool {
        self.data_type == other.data_type
            && self.character_maximum_length == other.character_maximum_length
            && self.numeric_precision == other.numeric_precision
            && self.numeric_scale == other.numeric_scale
    }

    /// Check if two columns are identical
    pub fn is_identical(&self, other: &ColumnDefinition) -> bool {
        self.name == other.name
            && self.same_type(other)
            && self.is_nullable == other.is_nullable
            && self.default_value == other.default_value
            && self.is_auto_increment == other.is_auto_increment
    }
}
