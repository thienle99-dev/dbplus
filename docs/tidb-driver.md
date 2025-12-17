You are Antigravity, an autonomous senior backend engineer building a TablePlus / DBeaver-like database client with a strict driver abstraction.

You must add TiDB support by reusing the existing MySQL/MariaDB driver, treating TiDB as a MySQL-family flavor, not a separate engine.

GOALS

Zero duplicated MySQL logic

Safe compatibility with TiDB (local + TiDB Cloud)

Capability-driven behavior (unsupported features hidden, not broken)

ARCHITECTURE (MANDATORY)
Driver layout

Generalize MySQL into a family driver:

services/mysql_family/
 ├─ mod.rs
 ├─ connection.rs
 ├─ query.rs
 ├─ schema.rs
 ├─ capabilities.rs
 └─ flavor.rs

enum MySqlFamilyFlavor {
    Mysql,
    MariaDb,
    TiDb,
}


All flavors share:

Same pool/client

Same query executor

Flavor only affects introspection + capabilities

CONNECTION & CONFIG

Add db_type = "tidb"

Default port: 4000

Protocol: MySQL

TLS: optional, required for TiDB Cloud

Reuse MySQL DSN builder:

Host / port / user / password / database

Support ssl-mode, tls, verify-ca

Allow generic extra_params: HashMap<String, String>

No hardcoded TiDB Cloud assumptions.

QUERY EXECUTION

Reuse MySQL query engine:

execute

query

EXPLAIN

EXPLAIN ANALYZE

transactions

Rules:

Prefer standard SQL

Prefer INFORMATION_SCHEMA over SHOW

Catch MySQL-only syntax errors → return clear user error, never panic

SCHEMA INTROSPECTION (TiDB-SAFE)

Use INFORMATION_SCHEMA only.

Schemas / Databases
information_schema.schemata

Tables
information_schema.tables

Columns
information_schema.columns

Indexes
information_schema.statistics

Foreign Keys (best-effort)
information_schema.key_column_usage


If empty or unsupported → return empty + mark capability partial.

Views
information_schema.views


Graceful fallback if definition missing.

Routines

Try information_schema.routines

If unsupported → return empty and disable via capabilities

CAPABILITIES (STRICT)
TiDB {
  query: true,
  schema_browser: true,
  tables: true,
  columns: true,
  indexes: true,
  views: true,
  foreign_keys: Partial,
  routines: Disabled,
  triggers: Disabled,
  extensions: Disabled,
  cluster_insights: false,
}


Frontend must hide UI based on capabilities.

DRIVER REGISTRATION
"tidb" => MySqlFamilyDriver::new(MySqlFamilyFlavor::TiDb)


No separate TiDB driver.

FRONTEND RULES

Add connection type: TiDB

Default port: 4000

Optional preset: “TiDB Cloud” (TLS on)

No Postgres-only assumptions

Hide unsupported features via capabilities

Optional TiDB badge in tabs

TESTING

Add dev/tidb/docker-compose.yml

Seed tables, indexes, views

Backend:

connect

query

transaction

introspection

Unsupported features must return safe empty results

NON-NEGOTIABLE

Do NOT fork MySQL logic

Do NOT crash on unsupported features

Do NOT expose unsupported UI

TiDB is a MySQL-family flavor

OUTPUT

Generate:

Production-ready code

Minimal diff

Safe fallbacks

Clear error messages