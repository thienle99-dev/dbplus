# Schema Diff & Migration Generator ⭐⭐⭐⭐⭐

## Overview

So sánh 2 schema và tự động sinh migration scripts (ALTER TABLE, CREATE/DROP INDEX, ADD/DROP COLUMN)

## Features

### Compare Options

1. **DB A ↔ DB B**: So sánh 2 databases khác nhau
2. **Schema ↔ Schema**: So sánh 2 schemas trong cùng DB
3. **Local SQL file ↔ DB**: So sánh file DDL với database hiện tại

### Generate Migrations

- `ALTER TABLE` statements
- `CREATE / DROP INDEX`
- `ADD / DROP COLUMN`
- `MODIFY COLUMN` (data type, constraints)
- `ADD / DROP FOREIGN KEY`
- Preview + chọn từng change

## Implementation Plan

### Phase 1: Backend - Diff Engine (Rust)

#### 1.1 Schema Extraction

```rust
// backend/src/services/schema_diff/extractor.rs
pub struct SchemaSnapshot {
    pub tables: Vec<TableDefinition>,
    pub indexes: Vec<IndexDefinition>,
    pub foreign_keys: Vec<ForeignKeyDefinition>,
}

pub struct TableDefinition {
    pub name: String,
    pub columns: Vec<ColumnDefinition>,
    pub primary_key: Option<Vec<String>>,
}

pub struct ColumnDefinition {
    pub name: String,
    pub data_type: String,
    pub is_nullable: bool,
    pub default_value: Option<String>,
    pub is_auto_increment: bool,
}
```

#### 1.2 Diff Algorithm

```rust
// backend/src/services/schema_diff/differ.rs
pub enum SchemaDiff {
    TableAdded(TableDefinition),
    TableDropped(String),
    TableModified {
        table_name: String,
        changes: Vec<TableChange>,
    },
}

pub enum TableChange {
    ColumnAdded(ColumnDefinition),
    ColumnDropped(String),
    ColumnModified {
        old: ColumnDefinition,
        new: ColumnDefinition,
    },
    IndexAdded(IndexDefinition),
    IndexDropped(String),
    ForeignKeyAdded(ForeignKeyDefinition),
    ForeignKeyDropped(String),
}
```

#### 1.3 Migration Generator

```rust
// backend/src/services/schema_diff/generator.rs
pub struct MigrationScript {
    pub statements: Vec<MigrationStatement>,
}

pub struct MigrationStatement {
    pub sql: String,
    pub description: String,
    pub is_destructive: bool,
    pub dependencies: Vec<usize>,
}
```

### Phase 2: Backend - API Endpoints

```rust
POST /api/schema-diff/compare
POST /api/schema-diff/compare-file
POST /api/schema-diff/generate-migration
```

### Phase 3: Frontend - UI Components

- SchemaDiffModal.tsx
- DiffViewer.tsx (side-by-side)
- MigrationPreview.tsx (checklist + SQL preview)

## File Structure

```
backend/src/services/schema_diff/
├── mod.rs
├── extractor.rs
├── differ.rs
├── generator.rs
└── parser.rs

frontend/src/components/schema-diff/
├── SchemaDiffModal.tsx
├── DiffViewer.tsx
├── MigrationPreview.tsx
└── ChangeItem.tsx
```

## Implementation Steps

1. Backend: Schema extractor
2. Backend: Diff algorithm
3. Backend: Migration generator
4. Backend: API endpoints
5. Frontend: UI components
6. Integration & testing

## Success Metrics

- Compare schemas in < 2 seconds
- Generate accurate migrations
- Support 95%+ of common schema changes
- Zero data loss in safe mode
