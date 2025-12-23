# Plan: Mongo Driver & UI for MongoDB

## Backend

- Implement Mongo driver: new module for connection, CRUD, aggregate pipelines, index and collection management leveraging official Mongo Rust driver. Likely under `backend/src/services/mongo/` with connection pooling and error mapping to existing driver traits.
- Wire into driver registry: add Mongo to driver enums/traits in `backend/src/services/driver/` (e.g., `ConnectionDriver`, `NoSQLOperations`) and config loading in `backend/src/config/database.rs` or a dedicated mongo config section.
- Add handlers/routes: Mongo-specific endpoints for CRUD, aggregate, and index/collection ops, using patterns from other drivers (e.g., `handlers/database.rs`, `handlers/query.rs`).
- Update models/schemas: introduce Mongo connection model (URI, db name, optional auth) and request/response DTOs for Mongo ops, matching UI field names.
- Tests: add targeted unit/integration tests or mocks for driver methods; feature-gate live tests behind env vars.

## UI

- Add Mongo UI surface: new Mongo-focused pages/components to select connection, list collections, view documents, run queries/aggregations, and manage indexes/collections.
- Field naming alignment: ensure form fields and displayed labels match Mongo terminology (e.g., Database, Collection, Document, Pipeline, Index spec) and update any shared types used by the API client.
- API client: extend frontend API layer to call new Mongo endpoints; add types matching backend DTOs.
- UX details: include basic table/grid for documents, JSON editor for filters and pipelines, and controls for index creation/deletion and collection create/drop.

## Notes/Assumptions

- Use official Mongo Rust driver for backend connectivity.
- Feature-flag or env-gate any operations requiring live Mongo; document required env vars (URI, DB name, credentials).
- Keep Couchbase/other drivers unaffected.

## Todos

- backend-driver: Add Mongo driver module (connect CRUD aggregate index/collection ops) and tests.
- backend-wiring: Register Mongo in driver traits/enums/config and expose routes/handlers.
- backend-dto: Define Mongo request/response DTOs with Mongo-aligned field names.
- frontend-api: Extend frontend API client/types for Mongo endpoints.
- frontend-ui: Build Mongo UI pages/components with Mongo terminology and controls (crud/aggregate/index/collection).
