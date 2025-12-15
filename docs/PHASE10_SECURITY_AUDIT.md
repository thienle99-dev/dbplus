# Phase 10: Security Audit (Lightweight)

Scope: local desktop app backend (`127.0.0.1:19999`) + critical data movement endpoints.

## What was checked

- **Network exposure**: backend binds to `127.0.0.1` (local-only).
- **Request limits**: added a global request body limit (10MB) to reduce accidental huge payloads.
- **Backup execution**:
  - Uses `tokio::process::Command` (no shell).
  - Password passed via `PGPASSWORD` env var.
  - Response capped at 50MB to avoid giant in-memory responses.
- **SQL script execution**: `POST /api/connections/:id/execute-script` is intended for trusted local UI usage; guarded by body limit and runs on local-only server.

## Notes / Follow-ups (optional)

- Add dependency vulnerability scanning to CI:
  - Rust: `cargo audit` (requires installing `cargo-audit` and network access).
  - JS: `pnpm audit` (requires network access).
- Consider tightening CORS in production builds (safe today because the server is local-only).

