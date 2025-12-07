# Database Driver Interface Guide

## Tổng quan

Bộ interface được thiết kế để hỗ trợ tất cả các loại database driver (SQL, NoSQL, Cloud) với kiến trúc modular và linh hoạt.

## Cấu trúc Interface

### 1. Core Traits (Bắt buộc cho SQL databases)

#### `ConnectionDriver` (base.rs)
- `test_connection()` - Kiểm tra kết nối

#### `QueryDriver` (base.rs)
- `execute(query)` - Thực thi query (INSERT/UPDATE/DELETE)
- `query(query)` - Query và trả về kết quả
- `execute_query(query)` - Thực thi query (hỗ trợ cả SELECT và non-SELECT)

#### `SchemaIntrospection` (schema.rs)
- `get_databases()` - Lấy danh sách databases
- `get_schemas()` - Lấy danh sách schemas
- `get_tables(schema)` - Lấy danh sách tables
- `get_columns(schema, table)` - Lấy thông tin columns

#### `TableOperations` (table.rs)
- `get_table_data(schema, table, limit, offset)` - Lấy dữ liệu table với pagination
- `get_table_constraints(schema, table)` - Lấy constraints (FK, Check, Unique)
- `get_table_statistics(schema, table)` - Lấy thống kê table
- `get_table_indexes(schema, table)` - Lấy danh sách indexes

#### `ColumnManagement` (column.rs)
- `add_column(schema, table, column)` - Thêm column mới
- `alter_column(schema, table, column_name, new_def)` - Sửa column
- `drop_column(schema, table, column_name)` - Xóa column

#### `ViewOperations` (view.rs)
- `list_views(schema)` - Liệt kê views
- `get_view_definition(schema, view_name)` - Lấy definition của view

#### `FunctionOperations` (function.rs)
- `list_functions(schema)` - Liệt kê functions
- `get_function_definition(schema, function_name)` - Lấy definition của function

### 2. NoSQL Traits

#### `NoSQLOperations` (nosql.rs)
- `list_collections(database)` - Liệt kê collections
- `get_collection_data(database, collection, limit, offset)` - Lấy dữ liệu collection
- `get_collection_count(database, collection)` - Lấy số lượng documents

### 3. Optional/Extension Traits

#### `TransactionDriver` (capabilities.rs)
- `begin_transaction()` - Bắt đầu transaction
- `commit_transaction(transaction_id)` - Commit transaction
- `rollback_transaction(transaction_id)` - Rollback transaction

#### `PreparedStatementDriver` (capabilities.rs)
- `prepare(query)` - Chuẩn bị statement
- `execute_prepared(statement_id, params)` - Thực thi prepared statement

#### `StreamingDriver` (extension.rs)
- `stream_query(query, batch_size)` - Streaming query results

#### `BulkOperationsDriver` (extension.rs)
- `bulk_insert(schema, table, columns, rows)` - Bulk insert
- `bulk_update(schema, table, updates, where_clause)` - Bulk update
- `bulk_delete(schema, table, where_clause)` - Bulk delete

#### `DatabaseManagementDriver` (extension.rs)
- `create_database(name)` - Tạo database
- `drop_database(name)` - Xóa database
- `create_schema(name)` - Tạo schema
- `drop_schema(name)` - Xóa schema

#### `DriverMetadata` (traits.rs)
- `driver_name()` - Tên driver
- `driver_version()` - Phiên bản
- `database_type()` - Loại database
- `supports_transactions()` - Hỗ trợ transactions?
- `supports_prepared_statements()` - Hỗ trợ prepared statements?

#### `ConnectionPoolDriver` (traits.rs)
- `get_pool_size()` - Kích thước pool
- `get_active_connections()` - Số connection đang active
- `get_idle_connections()` - Số connection idle

#### `HealthCheckDriver` (traits.rs)
- `health_check()` - Kiểm tra sức khỏe connection

## Main Driver Traits

### `DatabaseDriver`
Trait chính compose tất cả core traits:
```rust
trait DatabaseDriver: 
    ConnectionDriver 
    + QueryDriver 
    + SchemaIntrospection 
    + TableOperations 
    + ColumnManagement 
    + ViewOperations 
    + FunctionOperations 
    + Send + Sync
```

### `SQLDatabaseDriver`
Marker trait cho SQL databases (extends DatabaseDriver)

### `NoSQLDatabaseDriver`
Trait cho NoSQL databases:
```rust
trait NoSQLDatabaseDriver: 
    ConnectionDriver 
    + NoSQLOperations 
    + Send + Sync
```

## Implementation Pattern

### Ví dụ: MySQL Driver

```rust
// mysql/mod.rs
pub struct MySQLDriver {
    query: MySQLQuery,
    schema: MySQLSchema,
    table: MySQLTable,
    column: MySQLColumn,
    view: MySQLView,
    function: MySQLFunction,
}

#[async_trait]
impl ConnectionDriver for MySQLDriver { ... }
#[async_trait]
impl QueryDriver for MySQLDriver { ... }
#[async_trait]
impl SchemaIntrospection for MySQLDriver { ... }
// ... implement các trait khác

// MySQLDriver tự động implement DatabaseDriver nhờ blanket implementation
```

### Ví dụ: MongoDB Driver (NoSQL)

```rust
// mongodb/mod.rs
pub struct MongoDBDriver {
    client: MongoClient,
}

#[async_trait]
impl ConnectionDriver for MongoDBDriver { ... }
#[async_trait]
impl NoSQLOperations for MongoDBDriver { ... }

// MongoDBDriver implement NoSQLDatabaseDriver
```

## Driver Capabilities

Sử dụng `DriverCapabilities` trait để kiểm tra tính năng:

```rust
if driver.has_capability(DriverCapability::Transactions) {
    // Driver hỗ trợ transactions
}
```

## Lợi ích

1. **Modularity** - Mỗi capability là một trait riêng
2. **Composability** - Driver chỉ implement các trait cần thiết
3. **Extensibility** - Dễ dàng thêm tính năng mới
4. **Type Safety** - Đảm bảo type safety tại compile time
5. **Testability** - Mỗi trait có thể test độc lập
6. **Backward Compatible** - DatabaseDriver trait vẫn giữ nguyên API

## Migration Guide

Khi implement driver mới:

1. Tạo module structure: `{database}/mod.rs`, `{database}/query.rs`, etc.
2. Implement các core traits cho từng module
3. Compose trong `{database}/mod.rs` và implement `DatabaseDriver`
4. Thêm vào `connection_service.rs` match case
5. Update frontend để mark driver là available
