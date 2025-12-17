Bạn là Senior Backend + Fullstack Engineer.
Mục tiêu: Thêm MySQL/MariaDB async driver vào hệ thống hiện tại, tái sử dụng toàn bộ abstraction driver giống Postgres, không phá vỡ frontend hiện có.

1. Mục tiêu tổng thể

Thêm MySqlDriver (dùng mysql_async) hoạt động như một SQLDatabaseDriver

Near-parity với PostgresDriver (query, schema, table, view, function…)

Frontend có thể:

Tạo connection MySQL/MariaDB

Chạy query

Browse schema / table / column / view / routine

Những feature không tồn tại trong MySQL → return not-supported / empty, không crash UI

2. Backend – Kiến trúc & Module

Thêm dependency mysql_async

Tạo module giống Postgres:

backend/src/services/mysql/
mod.rs
connection.rs
query.rs
schema.rs
table.rs
column.rs
view.rs
function.rs
foreign_key.rs
ddl_export.rs (optional)

Reuse toàn bộ trait hiện có:

ConnectionDriver

QueryDriver

SchemaIntrospection

TableOperations

ColumnManagement

ViewOperations

FunctionOperations

DdlExportDriver (optional)

3. MySqlConnection

Wrap mysql_async::Pool

Build DSN từ connection::Model

Support cả mysql và mariadb

Có helper:

new(&connection, password)

create_database_if_not_exists (optional)

4. Query Driver

Implement QueryDriver:

execute

query

execute_query

explain → EXPLAIN / EXPLAIN ANALYZE

Map result MySQL → QueryResult (serde_json) giống Postgres

5. Schema Introspection (INFORMATION_SCHEMA)

Implement bằng INFORMATION_SCHEMA

Mapping:

databases → SHOW DATABASES

schemas → database (MySQL không có schema thực)

tables → INFORMATION_SCHEMA.TABLES

columns → INFORMATION_SCHEMA.COLUMNS

foreign keys → KEY_COLUMN_USAGE

views → INFORMATION_SCHEMA.VIEWS

routines → INFORMATION_SCHEMA.ROUTINES

Extensions → return empty list

6. Table / Column / View / Function

Table:

data, indexes, triggers, stats

best-effort constraints

unsupported feature → trả default

Column:

ALTER TABLE ADD / MODIFY / DROP COLUMN

View:

VIEW_DEFINITION

Function / Procedure:

SHOW CREATE FUNCTION / PROCEDURE

7. DDL Export (Optional)

Implement bằng:

SHOW CREATE TABLE

SHOW CREATE VIEW

routine metadata

Hook vào flow DDL export hiện tại

8. Driver Assembly

Tạo MySqlDriver tương tự PostgresDriver

Re-export tại mysql_driver.rs

Chia sẻ chung pool cho mọi sub-driver

9. Wiring & Capabilities

Extend ConnectionService:

db_type: mysql | mariadb

Update DriverCapabilities:

Enable: query, schema, table, view, routine

Disable: Postgres-only features

Frontend dùng capability để ẩn feature không hỗ trợ

10. Frontend

Thêm connection type:

MySQL (port 3306)

MariaDB (alias)

Reuse UI hiện tại:

Schema browser

Query editor

Không hardcode Postgres-only logic

11. Dev & Test

Docker MySQL/MariaDB cho local

Integration test:

test connection

query CRUD

schema introspection

Manual test frontend end-to-end

12. Rollout

Phase 1: core query + schema

Phase 2: DDL export, permissions

Phase 3: tuning & UX polish

👉 Nguyên tắc bắt buộc

Không copy-paste Postgres SQL

Luôn map về abstraction chung

Feature MySQL không có → return safe default

Không để frontend crash
