---
name: ddl-export-driver
overview: "Xây dựng hệ thống DDL Export với 3 phương thức: (1) Bundle pg_dump trong app, (2) Dùng pg_dump của user (PATH hoặc custom path), (3) Driver-based export từ metadata. User có thể chọn phương thức ưa thích."
todos:
  - id: create-pg-dump-finder
    content: Tạo pg_dump_finder utility để tìm bundled và user's pg_dump
    status: pending
  - id: update-export-options
    content: Update ExportDdlOptions model để thêm export_method và pg_dump_path fields
    status: pending
  - id: bundle-postgres-tools
    content: Bundle PostgreSQL client tools vào Tauri app resources
    status: pending
  - id: update-pg-dump-service
    content: Update pg_dump.rs service để nhận pg_dump_path parameter
    status: pending
  - id: create-ddl-export-trait
    content: Tạo trait DdlExportDriver trong backend/src/services/driver/ddl_export.rs
    status: pending
  - id: create-postgres-ddl-export
    content: Tạo PostgresDdlExport module với các method query metadata và build DDL statements
    status: pending
  - id: implement-trait-postgres
    content: Implement DdlExportDriver trait cho PostgresDriver trong postgres/mod.rs
    status: pending
  - id: update-export-handler
    content: Cập nhật export_ddl.rs handler để route theo export_method (bundled/user/driver)
    status: pending
  - id: query-metadata-types
    content: Query metadata cho sequences, types, triggers, extensions từ pg_catalog
    status: pending
  - id: build-ddl-statements
    content: Implement các build_*_ddl() methods cho tất cả object types
    status: pending
  - id: handle-options-scope
    content: Xử lý các options (include_drop, if_exists, etc.) và scope (database/schema/objects)
    status: pending
  - id: format-output
    content: Format output với proper ordering, comments, và blank lines
    status: pending
  - id: error-handling
    content: Thêm error handling và validation cho scope/objects
    status: pending
  - id: testing
    content: Viết tests cho các scenarios khác nhau và compare với pg_dump output
    status: pending
---

## DDL Export Driver Implementation Plan

### Mục tiêu

Xây dựng hệ thống export DDL script trực tiếp từ database metadata thông qua driver system hiện có, thay thế việc phụ thuộc vào `pg_dump` external tool. Hỗ trợ đầy đủ các object types và giữ backward compatibility với pg_dump.

### Kiến trúc tổng quan

```
ExportDdlHandler
    ↓
    ├─→ method = "bundled_pg_dump" → run_pg_dump(bundled_path)
    ├─→ method = "user_pg_dump" → run_pg_dump(user_path or PATH)
    └─→ method = "driver" → DdlExportDriver.export_ddl()
                                        ↓
                                PostgresDdlExport
                                        ↓
                    Query metadata từ các traits hiện có:
     - SchemaIntrospection
     - TableOperations  
     - ViewOperations
     - FunctionOperations
                                        ↓
                                Build DDL statements
                                        ↓
                                Format output string
```

### Phương thức export

1. **Bundled pg_dump**: Bundle PostgreSQL client tools vào app (macOS/Windows/Linux binaries)
2. **User's pg_dump**: Tìm và dùng pg_dump từ PATH hoặc custom path do user chỉ định
3. **Driver-based**: Export trực tiếp từ metadata queries (không cần pg_dump)

### Các bước implementation

#### Bước 0: Tạo pg_dump finder utility

**File mới**: `backend/src/utils/pg_dump_finder.rs`

Utility để tìm và validate pg_dump binary:

- `find_bundled_pg_dump() -> Option<PathBuf>`:
  - Tìm pg_dump trong bundled resources của app
  - Trên macOS: `{executable_dir}/../Resources/postgres/bin/pg_dump` hoặc `{executable_dir}/postgres/bin/pg_dump`
  - Trên Windows: `{executable_dir}/postgres/bin/pg_dump.exe`
  - Trên Linux: `{executable_dir}/postgres/bin/pg_dump`
  - Sử dụng `std::env::current_exe()` và `std::path::PathBuf` để locate executable directory
  - Check environment variable `DBPLUS_POSTGRES_BIN_DIR` trước

- `find_user_pg_dump() -> Option<(PathBuf, String)>`:
  - Tìm trong PATH: `which pg_dump` (Unix) hoặc `where pg_dump` (Windows)
  - Scan common locations:
    - macOS: `/opt/homebrew/bin/pg_dump`, `/usr/local/bin/pg_dump`, `/Library/PostgreSQL/*/bin/pg_dump`
    - Linux: `/usr/bin/pg_dump`, `/usr/local/pgsql/*/bin/pg_dump`
    - Windows: `C:\Program Files\PostgreSQL\*\bin\pg_dump.exe`
  - Return `(path, version)` nếu tìm thấy

- `validate_pg_dump(path: &Path) -> Result<String>`:
  - Chạy `{path} --version` để validate
  - Return version string nếu valid

- `get_pg_dump_path(method: &str, custom_path: Option<&str>) -> Result<PathBuf>`:
  - Route theo method:
    - "bundled": gọi `find_bundled_pg_dump()`
    - "user": nếu có `custom_path`, validate và dùng nó; nếu không, gọi `find_user_pg_dump()`
  - Return error nếu không tìm thấy

#### Bước 1: Update ExportDdlOptions model

**File**: `backend/src/models/export_ddl.rs`

Thêm field mới vào `ExportDdlOptions`:

```rust
pub struct ExportDdlOptions {
    // ... existing fields ...
    pub export_method: Option<String>, // "bundled_pg_dump", "user_pg_dump", "driver"
    pub pg_dump_path: Option<String>,   // Custom path nếu user chỉ định
}
```

Hoặc có thể dùng enum:

```rust
#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub enum ExportMethod {
    BundledPgDump,
    UserPgDump,
    Driver,
}
```

Thêm model mới cho status check:

```rust
#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PgDumpStatusResponse {
    pub bundled: PgDumpStatus,
    pub user: PgDumpStatus,
    pub driver: DriverStatus,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DriverStatus {
    pub available: bool,
    pub supports_full_export: bool, // true nếu support Database/Schema scope
}
```

#### Bước 2: Bundle PostgreSQL client tools

**Cấu trúc thư mục trong app**:

```
frontend/src-tauri/
  ├── resources/
  │   └── postgres/
  │       ├── bin/
  │       │   ├── pg_dump (macOS/Linux)
  │       │   └── pg_dump.exe (Windows)
  │       └── lib/ (nếu cần shared libraries)
```

**Cách bundle**:

1. **Download PostgreSQL binaries** cho từng platform:
   - macOS: PostgreSQL official installer hoặc Homebrew build
   - Windows: PostgreSQL installer từ postgresql.org
   - Linux: PostgreSQL package từ distro

2. **Copy vào Tauri resources**:
   - Trong `tauri.conf.json`, thêm vào `bundle.resources`:
     ```json
     "resources": [
       "resources/postgres/**"
     ]
     ```

3. **Set permissions** (macOS/Linux):
   - Trong build script, chạy `chmod +x` cho pg_dump binary

4. **Alternative**: Có thể download và extract tại runtime nếu app size là concern

**Build script**: Thêm vào `frontend/package.json`:
```json
{
  "scripts": {
    "download-postgres-binaries": "node scripts/download-postgres.js",
    "build:with-postgres": "npm run download-postgres-binaries && npm run build"
  }
}
```

#### Bước 3: Update pg_dump service

**File**: `backend/src/services/pg_dump.rs`

- Update `run_pg_dump()` để nhận `pg_dump_path: Option<PathBuf>`:
  ```rust
  pub async fn run_pg_dump(
      pg_dump_path: Option<PathBuf>,  // New parameter
      host: &str,
      port: i32,
      username: &str,
      database: &str,
      password: &str,
      options: &ExportDdlOptions,
  ) -> Result<String>
  ```

- Logic chọn path:
  - Nếu `pg_dump_path` có, dùng nó
  - Nếu không, fallback về "pg_dump" (PATH lookup như hiện tại)

- Update `is_pg_dump_available()` để check cả bundled và user's pg_dump

#### Bước 4: Tạo trait DdlExportDriver

**File mới**: `backend/src/services/driver/ddl_export.rs`

- Định nghĩa trait `DdlExportDriver`:
  ```rust
  #[async_trait]
  pub trait DdlExportDriver: Send + Sync {
      async fn export_ddl(&self, options: &ExportDdlOptions) -> Result<String>;
  }
  ```

- Trait này sẽ được implement bởi các database driver cụ thể (PostgreSQL, MySQL, SQLite...)

#### Bước 5: Tạo PostgresDdlExport module

**File mới**: `backend/src/services/postgres/ddl_export.rs`

Module này sẽ:

- Nhận `Pool` và các module components (schema, table, view, function)
- Query metadata từ các traits hiện có:
  - `SchemaIntrospection::get_tables()`, `get_columns()`
  - `TableOperations::get_table_constraints()`, `get_table_indexes()`
  - `ViewOperations::get_view_definition()`
  - `FunctionOperations::get_function_definition()`
- Query thêm từ `pg_catalog` cho:
  - Sequences: `pg_sequence`, `pg_class`
  - Types: `pg_type`
  - Triggers: `pg_trigger`
  - Extensions: `pg_extension`
  - Comments: `pg_description`
- Build DDL statements theo scope và options
- Reuse logic từ `DdlGenerator` nếu có thể

**Cấu trúc class**:

```rust
pub struct PostgresDdlExport {
    pool: Pool,
    schema: PostgresSchema,
    table: PostgresTable,
    view: PostgresView,
    function: PostgresFunction,
}
```

**Các method chính**:

- `export_ddl()` - Entry point, route theo scope
- `export_database()` - Export toàn bộ database
- `export_schema()` - Export một schema
- `export_objects()` - Export các objects cụ thể
- `build_table_ddl()` - Build CREATE TABLE statement
- `build_view_ddl()` - Build CREATE VIEW statement
- `build_function_ddl()` - Build CREATE FUNCTION statement
- `build_sequence_ddl()` - Build CREATE SEQUENCE statement
- `build_type_ddl()` - Build CREATE TYPE statement
- `build_index_ddl()` - Build CREATE INDEX statement
- `build_trigger_ddl()` - Build CREATE TRIGGER statement
- `build_extension_ddl()` - Build CREATE EXTENSION statement
- `add_comments()` - Thêm COMMENT ON statements
- `add_grants()` - Thêm GRANT statements (nếu include_owner_privileges)

#### Bước 6: Implement DdlExportDriver cho PostgresDriver

**File**: `backend/src/services/postgres/mod.rs`

- Thêm field `ddl_export: PostgresDdlExport` vào struct `PostgresDriver`
- Khởi tạo trong `new()`:
  ```rust
  let ddl_export = PostgresDdlExport::new(
      pool.clone(),
      schema.clone(),
      table.clone(),
      view.clone(),
      function.clone(),
  );
  ```

- Implement trait `DdlExportDriver`:
  ```rust
  #[async_trait]
  impl DdlExportDriver for PostgresDriver {
      async fn export_ddl(&self, options: &ExportDdlOptions) -> Result<String> {
          self.ddl_export.export_ddl(options).await
      }
  }
  ```

#### Bước 7: Cập nhật ExportDdlHandler

**File**: `backend/src/handlers/export_ddl.rs`

- Modify `export_postgres_ddl()` để route theo `export_method`:

```rust
let method = options.export_method.as_deref().unwrap_or("driver");
let (ddl, method_used) = match method {
    "bundled_pg_dump" | "user_pg_dump" => {
        use crate::utils::pg_dump_finder::get_pg_dump_path;
        let pg_dump_path = get_pg_dump_path(method, options.pg_dump_path.as_deref())?;
        let ddl = run_pg_dump(Some(pg_dump_path), ...).await?;
        (ddl, method.to_string())
    }
    "driver" => {
        let driver = PostgresDriver::new(&connection, &password).await?;
        let ddl = driver.export_ddl(&options).await?;
        (ddl, "driver".to_string())
    }
    _ => return Err("Invalid export method".to_string()),
};
```

- Fallback logic:
  - Nếu bundled không tìm thấy → fallback về user's pg_dump
  - Nếu user's không tìm thấy → fallback về driver
  - Log warnings khi fallback

- Update `ExportDdlResult.method` để reflect method được dùng

- Update `check_pg_dump()` endpoint thành `check_pg_dump_status()` để check cả 3 methods:
  ```rust
  pub async fn check_pg_dump_status() -> Json<PgDumpStatusResponse> {
      // Check bundled
      // Check user's pg_dump
      // Check driver availability
      // Return status cho từng method
  }
  ```

#### Bước 8: Query metadata cho các object types mới

**File**: `backend/src/services/postgres/ddl_export.rs`

Cần query thêm từ `pg_catalog`:

**Sequences**:
```sql
SELECT schemaname, sequencename, data_type, start_value, 
       increment_by, max_value, min_value, cycle
FROM pg_sequences WHERE schemaname = $1
```

**Types**:
```sql
SELECT n.nspname, t.typname, pg_catalog.format_type(t.oid, NULL)
FROM pg_type t
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = $1 AND t.typtype = 'c' -- composite types
```

**Triggers**:
```sql
SELECT trigger_name, event_manipulation, event_object_table,
       action_statement, action_timing
FROM information_schema.triggers
WHERE trigger_schema = $1
```

**Extensions**:
```sql
SELECT extname, extversion
FROM pg_extension
```

**Comments**: Query từ `pg_description` join với các catalog tables

#### Bước 9: Build DDL statements

**File**: `backend/src/services/postgres/ddl_export.rs`

Mỗi `build_*_ddl()` method sẽ:

1. **build_table_ddl()**:
   - Query columns từ `get_columns()`
   - Query constraints từ `get_table_constraints()`
   - Query indexes từ `get_table_indexes()`
   - Build: `CREATE TABLE ... (columns, constraints)`
   - Append indexes sau (CREATE INDEX statements)
   - Append foreign keys nếu cần
   - Reuse logic từ `DdlGenerator::generate_table_ddl()` nếu có thể

2. **build_view_ddl()**:
   - Query từ `get_view_definition()`
   - Build: `CREATE OR REPLACE VIEW ... AS ...`

3. **build_function_ddl()**:
   - Query từ `get_function_definition()`
   - Output definition trực tiếp (đã có CREATE FUNCTION)

4. **build_sequence_ddl()**:
   - Query sequence metadata
   - Build: `CREATE SEQUENCE ... START WITH ... INCREMENT BY ...`

5. **build_type_ddl()**:
   - Query type definition
   - Build: `CREATE TYPE ... AS ...`

6. **build_index_ddl()**:
   - Query từ `get_table_indexes()`
   - Build: `CREATE INDEX ... ON ...`

7. **build_trigger_ddl()**:
   - Query trigger metadata
   - Build: `CREATE TRIGGER ...`

8. **add_comments()**:
   - Query từ `pg_description`
   - Build: `COMMENT ON TABLE/COLUMN/... IS ...`

9. **add_grants()**:
   - Query từ `pg_class`, `pg_authid`
   - Build: `ALTER ... OWNER TO ...` và `GRANT ... ON ... TO ...`

#### Bước 10: Xử lý options

**File**: `backend/src/services/postgres/ddl_export.rs`

- `include_drop`: Prepend `DROP ... IF EXISTS` trước mỗi CREATE
- `if_exists`: Dùng `CREATE ... IF NOT EXISTS` (PostgreSQL 9.5+)
- `include_owner_privileges`: Gọi `add_grants()` sau CREATE statements
- `include_comments`: Gọi `add_comments()` sau CREATE statements

**Scope handling**:

- `DdlScope::Database`: Query tất cả schemas, export từng schema
- `DdlScope::Schema`: Export một schema cụ thể
- `DdlScope::Objects`: Export các objects được chỉ định trong `options.objects`

#### Bước 11: Format output và ordering

**File**: `backend/src/services/postgres/ddl_export.rs`

- Order dependencies đúng:

  1. Extensions
  2. Types
  3. Sequences
  4. Tables
  5. Views (depend on tables)
  6. Functions
  7. Triggers (depend on tables/functions)
  8. Indexes (có thể inline trong CREATE TABLE hoặc separate)
  9. Foreign keys (sau tables)
  10. Comments
  11. Grants

- Format output:
  - Mỗi statement trên một dòng
  - Thêm blank line giữa các objects
  - Thêm header comments: `-- Exported by DBPlus Driver`
  - Thêm section comments: `-- Tables`, `-- Views`, etc.

#### Bước 12: Update module exports

**File**: `backend/src/services/postgres/mod.rs`

- Export `ddl_export` module:
  ```rust
  pub mod ddl_export;
  ```

**File**: `backend/src/services/driver/mod.rs`

- Export `ddl_export` trait:
  ```rust
  pub mod ddl_export;
  ```

**File**: `backend/src/services/db_driver.rs`

- Import và re-export trait:
  ```rust
  pub use crate::services::driver::ddl_export::DdlExportDriver;
  ```

**File**: `backend/src/utils/mod.rs`

- Export `pg_dump_finder`:
  ```rust
  pub mod pg_dump_finder;
  ```

#### Bước 13: Error handling và validation

**File**: `backend/src/services/postgres/ddl_export.rs`

- Validate scope và objects:
  - Schema tồn tại không?
  - Objects được chỉ định có tồn tại không?
- Handle errors gracefully:
  - Nếu một object fail, log warning nhưng tiếp tục với objects khác
  - Return partial result với error message
- Validate PostgreSQL version cho `IF NOT EXISTS` (9.5+)

#### Bước 14: Testing

- Unit tests cho từng `build_*_ddl()` method
- Integration tests:
  - Test export database scope
  - Test export schema scope
  - Test export objects scope
  - Test các options combinations
  - Compare output với pg_dump (nếu có)
- Test với các PostgreSQL versions khác nhau (10, 11, 12, 13, 14, 15, 16)
- Test fallback scenarios

#### Bước 15: Update frontend

**File**: `frontend/src/features/export-ddl/ExportDdlModal.tsx`

- Thêm UI để user chọn export method:
  - Radio buttons hoặc dropdown: "Bundled pg_dump", "User's pg_dump", "Driver-based"
  - Nếu chọn "User's pg_dump", hiển thị:
    - Input field để nhập custom path (optional)
    - Hoặc hiển thị detected path từ auto-detect
    - Button "Auto-detect" để tự động tìm pg_dump

- Hiển thị status cho từng method:
  - Bundled: "Available" hoặc "Not found"
  - User's: "Available (version X.Y)" hoặc "Not found in PATH"
  - Driver: "Always available"

- Update `ExportDdlOptions` interface để include:
  ```typescript
  exportMethod?: "bundled_pg_dump" | "user_pg_dump" | "driver";
  pgDumpPath?: string;
  ```

- Call API `check_pg_dump_status()` khi modal mở để hiển thị status

**File**: `frontend/src/features/export-ddl/exportDdl.service.ts`

- Update API call để gửi `exportMethod` và `pgDumpPath` trong request body
- Thêm method mới:
  ```typescript
  export async function checkPgDumpStatus(): Promise<PgDumpStatusResponse> {
    const response = await api.get('/api/export-ddl/pg-dump-status');
    return response.data;
  }
  ```

**File**: `frontend/src/features/export-ddl/exportDdl.types.ts`

- Thêm types:
  ```typescript
  export interface PgDumpStatusResponse {
    bundled: PgDumpStatus;
    user: PgDumpStatus;
    driver: DriverStatus;
  }

  export interface DriverStatus {
    available: boolean;
    supportsFullExport: boolean;
  }
  ```

### Files sẽ được tạo/sửa đổi

**Files mới**:

- `backend/src/utils/pg_dump_finder.rs` - Utility để tìm và validate pg_dump
- `backend/src/services/driver/ddl_export.rs` - Trait definition
- `backend/src/services/postgres/ddl_export.rs` - PostgreSQL implementation
- `frontend/scripts/download-postgres.js` - Script để download PostgreSQL binaries

**Files sửa đổi**:

- `backend/src/models/export_ddl.rs` - Thêm export_method, pg_dump_path fields và PgDumpStatusResponse
- `backend/src/services/pg_dump.rs` - Update để nhận pg_dump_path parameter
- `backend/src/services/postgres/mod.rs` - Thêm ddl_export field và implement trait
- `backend/src/handlers/export_ddl.rs` - Update handler logic để route theo method
- `backend/src/services/driver/mod.rs` - Export ddl_export module
- `backend/src/services/db_driver.rs` - Re-export trait nếu cần
- `backend/src/utils/mod.rs` - Export pg_dump_finder module
- `frontend/src/features/export-ddl/ExportDdlModal.tsx` - UI để chọn export method
- `frontend/src/features/export-ddl/exportDdl.service.ts` - Update API calls
- `frontend/src/features/export-ddl/exportDdl.types.ts` - Thêm types mới
- `frontend/src-tauri/tauri.conf.json` - Thêm PostgreSQL binaries vào bundle resources
- `frontend/package.json` - Thêm scripts để download PostgreSQL binaries

### Dependencies

Không cần thêm Rust dependencies mới, sử dụng:

- `deadpool_postgres` (đã có)
- `tokio-postgres` (đã có)
- `anyhow` (đã có)
- `async-trait` (đã có)
- `std::process`, `std::path`, `std::env` (standard library)

**External binaries cần bundle**:

- PostgreSQL client tools (pg_dump, pg_restore) cho macOS, Windows, Linux
- Có thể download từ:
  - macOS: Homebrew hoặc PostgreSQL official installer
  - Windows: PostgreSQL installer từ postgresql.org
  - Linux: PostgreSQL package từ distro repositories

### Chi tiết bổ sung

#### Access bundled resources từ backend sidecar

Vì backend là sidecar process riêng (không chạy trong Tauri context), cần detect bundled pg_dump bằng cách:

1. **Tìm trong cùng directory với executable**:
   - Backend executable location: `std::env::current_exe()`
   - Bundled pg_dump location: `{executable_dir}/../Resources/postgres/bin/pg_dump` (macOS) hoặc `{executable_dir}/postgres/bin/pg_dump` (Windows/Linux)

2. **Hoặc qua environment variable**:
   - Tauri có thể set `DBPLUS_POSTGRES_BIN_DIR` khi spawn backend
   - Backend đọc env var này để locate bundled binaries

3. **Fallback logic**:
   ```
   1. Check environment variable DBPLUS_POSTGRES_BIN_DIR
   2. Check relative to executable directory
   3. Check common installation paths
   4. Fallback to PATH lookup
   ```

#### Backward Compatibility

- Giữ `prefer_pg_dump` field trong `ExportDdlOptions` (deprecated nhưng vẫn support)
- Nếu `prefer_pg_dump = true` và không có `export_method`, tự động set `export_method = "user_pg_dump"`
- Migration path: Frontend có thể gradually migrate từ `preferPgDump` sang `exportMethod`

### Lưu ý

- **Backend sidecar**: Backend không thể trực tiếp access Tauri resources, cần detect qua executable directory hoặc env var
- **App size**: Bundle pg_dump sẽ tăng app size ~10-20MB. Có thể làm optional hoặc download tại first run
- **Platform-specific**: Cần test trên cả macOS, Windows, Linux
- **Version compatibility**: Bundled pg_dump version nên tương thích với PostgreSQL 10+ (phổ biến nhất)
- **Driver limitations**: Driver-based export có thể không cover một số edge cases của pg_dump (materialized views, complex partitions, custom types phức tạp)
- **Output format**: Driver output có thể khác pg_dump một chút nhưng vẫn valid SQL
- **Performance**: Driver-based export có thể chậm hơn pg_dump cho large databases vì query nhiều metadata
