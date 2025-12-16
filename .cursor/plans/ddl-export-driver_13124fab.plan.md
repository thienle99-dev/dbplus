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

