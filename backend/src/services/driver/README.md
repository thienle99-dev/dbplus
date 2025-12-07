# Driver Interface Architecture

## Overview

This directory contains the modular interface system for database drivers. The architecture is designed to support multiple database types (SQL, NoSQL, Cloud) with a flexible trait-based system.

## Structure

### Core Traits

- **`base.rs`** - Fundamental driver capabilities:
  - `ConnectionDriver` - Connection testing
  - `QueryDriver` - Query execution (execute, query, execute_query)

- **`schema.rs`** - Schema introspection:
  - `SchemaIntrospection` - Databases, schemas, tables, columns

- **`table.rs`** - Table operations:
  - `TableOperations` - Data retrieval, constraints, statistics, indexes

- **`column.rs`** - Column management:
  - `ColumnManagement` - Add, alter, drop columns

- **`view.rs`** - View operations:
  - `ViewOperations` - List views, get view definitions

- **`function.rs`** - Function operations:
  - `FunctionOperations` - List functions, get function definitions

### Specialized Traits

- **`nosql.rs`** - NoSQL-specific operations:
  - `NoSQLOperations` - Collections, documents

- **`capabilities.rs`** - Advanced features:
  - `DriverCapabilities` - Feature detection
  - `TransactionDriver` - Transaction support
  - `PreparedStatementDriver` - Prepared statements

- **`extension.rs`** - Optional extensions:
  - `StreamingDriver` - Streaming query results
  - `BulkOperationsDriver` - Bulk insert/update/delete
  - `DatabaseManagementDriver` - Create/drop databases and schemas

- **`traits.rs`** - Metadata and monitoring:
  - `DriverMetadata` - Driver information
  - `ConnectionPoolDriver` - Pool statistics
  - `HealthCheckDriver` - Health monitoring

## Main Driver Trait

The `DatabaseDriver` trait in `db_driver.rs` composes all core traits:
- ConnectionDriver
- QueryDriver
- SchemaIntrospection
- TableOperations
- ColumnManagement
- ViewOperations
- FunctionOperations

## Driver Types

- **`SQLDatabaseDriver`** - Marker trait for SQL databases
- **`NoSQLDatabaseDriver`** - Trait for NoSQL databases (ConnectionDriver + NoSQLOperations)

## Implementation Pattern

For a new driver (e.g., MySQL):

```rust
// mysql/mod.rs
pub struct MySQLDriver {
    query: MySQLQuery,
    schema: MySQLSchema,
    // ... other modules
}

#[async_trait]
impl DatabaseDriver for MySQLDriver {
    // Default implementations delegate to composed modules
}
```

## Benefits

1. **Modularity** - Each capability is a separate trait
2. **Composability** - Drivers implement only needed traits
3. **Extensibility** - Easy to add new capabilities
4. **Type Safety** - Compile-time guarantees
5. **Testability** - Each trait can be tested independently
