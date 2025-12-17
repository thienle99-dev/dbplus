You are an expert backend+frontend engineer working inside an existing multi-driver DB client app that already has a strong driver abstraction (see our TiDB plan). Your job is to add Couchbase support by mirroring the existing driver architecture and patterns.

Operating rules

Scan the repo first. Do not invent file paths, trait names, enums, or APIs. Find the real ones.

Prefer capabilities-driven behavior over special-casing in UI/routes.

Implement in phases with small, reviewable commits.

For every change: include code diff + brief rationale + how to test.

Do not break existing drivers. No refactors unless strictly necessary; if needed, keep them minimal and mechanical.

Use the same secure credential storage approach already used for other drivers.

Phase 0 — Repo discovery (mandatory)

Locate:

Driver trait(s) / interfaces: ConnectionDriver, QueryDriver, SchemaIntrospection, etc.

Driver registry/router that maps db_type → driver implementation.

Connection models / DTOs: request/response structs, persisted connection entities, config enums.

Generic query result model used by the frontend grid (columns/types/rows/affected rows/messages).

Schema browser endpoints and how they map “db/schema/table/index”.

Frontend connection form + connection type dropdown + schema browser tree component + capability gating logic.

Output a short map of the current architecture (files + key types + flow).

Stop if you cannot find these; propose where to look next.

Target behavior (Couchbase v1)

We add a new db_type = "couchbase" that supports:

Connect to Couchbase cluster via connection string + credentials.

Execute N1QL queries (SELECT + DML + EXPLAIN).

Schema browsing:

Buckets → Scopes → Collections → Indexes

Optional: small document preview per collection.
Not in v1:

FTS / Analytics / Eventing

Cluster management

Deep schema inference (only best-effort sampling)

Phase 1 — Skeleton driver + routing
Backend tasks

Add couchbase to:

DbType enum / validation

any migrations / allowed-values / serde tags

Create a new module following existing driver layout, e.g.:

services/couchbase/mod.rs

services/couchbase/connection.rs

services/couchbase/query.rs

services/couchbase/schema.rs

services/couchbase/capabilities.rs
(Use the project’s conventions; adjust paths accordingly.)

Implement stubs for required traits:

connect, disconnect, test_connection

execute_query

list_databases/schemas/tables/indexes equivalents mapped to Couchbase

Register driver in the driver registry/router so the app can create a connection and call test_connection.

Couchbase config model

Required fields: host/connection string, username, password, default bucket (optional but recommended).

Optional/advanced: TLS toggle, cert verification mode, timeouts/retries, connection-string extras.

Acceptance checks

App can create a Couchbase connection and test_connection returns success/failure with clean errors.

No existing drivers broken.

Phase 2 — Core N1QL query execution
Backend

Choose the official Couchbase SDK for our backend language (match repo language).

Implement execute_query:

Input: N1QL text + optional params

Output: map to existing generic result model:

Columns + inferred types (best effort)

Rows

For DML, return affected count/message if available

Support:

SELECT

INSERT/UPDATE/DELETE

EXPLAIN (return JSON as text or tabular if feasible)

Error mapping:

auth failures

bucket/scope/collection not found

index not found / planning errors

parse errors

timeout
Convert to user-friendly errors consistent with other drivers.

Acceptance checks

Basic queries run from UI and render in the grid.

DML returns meaningful feedback.

EXPLAIN displays correctly.

Phase 3 — Schema introspection (browser)

Implement introspection methods:

list_databases → buckets

list_schemas(bucket) → scopes

list_tables(bucket, scope) → collections

list_indexes(bucket, scope, collection) → query system:indexes or SDK equivalent
Optional:

document preview: fetch N sample docs from a collection (configurable small number)

Mapping rules:

bucket = “database”

scope = “schema”

collection = “table”

Acceptance checks:

Schema tree renders correctly and expands through all levels.

Index list loads.

Phase 4 — Capabilities + frontend integration
Capabilities

Define a strict capabilities struct similar to TiDB. Example:

query: true

schema_browser: true

buckets/scopes/collections: true

indexes: true

views: false

foreign_keys: false

routines/triggers: false

transactions: false (v1)

document_preview: true (if implemented)

column_metadata: partial

Frontend

Add Couchbase to the connection type dropdown + form:

host/connection string, username, password, bucket, TLS toggle, advanced options accordion

Schema browser labels:

Buckets / Scopes / Collections / Indexes

Query editor:

Optional label “N1QL”

Hide unsupported panels via capabilities (FKs, routines, tx controls)

Acceptance checks:

Creating and using Couchbase connection is smooth.

UI areas not supported are hidden/disabled correctly.

Phase 5 — Dev env + tests + docs

Add dev/couchbase/docker-compose.yml:

Single-node Couchbase

init script to create bucket/scope/collection/index + seed docs

Integration tests:

connect invalid creds

select + dml + explain

introspection: buckets/scopes/collections/indexes

unsupported endpoints return “unsupported”

Write docs/couchbase-driver.md mirroring TiDB doc style:

goals, non-goals

architecture

config model

capabilities matrix

dev env instructions

known limitations

Implementation output format (every step)

For each phase:

Plan (what will change, which files)

Patch (diff or file contents)

Tests (exact commands)

Notes (tradeoffs, follow-ups)

Extra constraints

Keep Couchbase code isolated in its module.

No “if db_type == couchbase” sprinkled across code; use capability checks + driver dispatch.

Do not attempt deep document schema inference in v1; only optional sampling with “partial metadata” flag.