# Couchbase Driver for Database Client

## Overview
This driver enables support for Couchbase (v7+) using the N1QL query language. It maps Couchbase's hierarchy to the application's standard relational model.

## Architecture

### Hierarchy Mapping
| Couchbase Concept | Application Concept | Notes |
|-------------------|---------------------|-------|
| Bucket            | Database            | Top-level container |
| Scope             | Schema              | Logical grouping within bucket |
| Collection        | Table               | Document container |
| Document          | Row                 | Single record |

### Driver Structure
- **Connection**: Uses `couchbase` Rust SDK (official).
- **Querying**: Executes N1QL strings directly.
- **Introspection**: Uses `Cluster` and `Bucket` management APIs to list scopes and collections.

## Configuration Model

### Required Fields
- **Host**: Hostname or IP of the Couchbase node/cluster (e.g., `localhost` or `couchbase://...`).
- **Username**: Cluster username (e.g., `Administrator`).
- **Password**: Cluster password.
- **Bucket**: (Optional) Default bucket to use.

### Capabilities Matrix
| Capability | Supported | Notes |
|------------|-----------|-------|
| Query (N1QL)| ✅ | SELECT, INSERT, UPDATE, DELETE |
| Explains | ✅ | Visualized as JSON |
| Schema Browser | ✅ | Buckets -> Scopes -> Collections |
| Indexes | ⚠️ | Partial (Basic listing planed) |
| Foreign Keys | ❌ | Not supported in NoSQL |
| Transactions | ❌ | Not implemented in v1 |
| Document Preview | ❌ | Not implemented in v1 |

## Development Environment
Located in `dev/couchbase/docker-compose.yml`.

### Quick Start
1. `cd dev/couchbase`
2. `docker-compose up -d`
3. Access UI at `http://localhost:8091` (User: `Administrator`, Pass: `password`)
4. Setup a bucket named `default` and add a user if needed (though Administrator works).

## Known Limitations (v1)
1. **Schema Inference**: We do not infer column types from documents. Queries return JSON objects or key-value pairs.
2. **Performance**: Large result sets are fetched into memory.
3. **Schemas**: Creating/Dropping scopes/collections via UI is not yet supported.
