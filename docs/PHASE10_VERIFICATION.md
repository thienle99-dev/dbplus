# Phase 10: Final Verification

This phase is about validating DBPlus against a real Postgres instance, doing a basic performance check, and recording a lightweight security review.

## 1) Real PostgreSQL Instance (Docker)

Start the dev Postgres:

- `docker compose -f dev/postgres/docker-compose.yml up -d`
- Port: `127.0.0.1:15432`
- DB: `dbplus`
- User/pass: `dbplus` / `dbplus`

## 2) Smoke Verification (Backend + Postgres)

Runs:
- brings up Postgres (docker compose)
- starts backend with a temp local sqlite DB
- creates a Postgres connection via API
- executes a basic query + a multi-statement script

Command:
- `./scripts/phase10_verify.sh`

Optional perf run (streams 100k rows via NDJSON):
- `PHASE10_PERF=1 ./scripts/phase10_verify.sh`

## 3) Security Notes (What we check)

- Server binds to `127.0.0.1` (local-only).
- Request body limit applied (10MB) to reduce accidental huge-payload issues.
- Backup endpoint limits returned dump size (50MB) and fails with a clear message if too large.
- Backup uses `pg_dump` via `tokio::process::Command` (no shell), with password via env var `PGPASSWORD`.

If you want dependency vulnerability scanning:
- Rust: `cargo audit` (requires `cargo-audit` + network access)
- JS: `pnpm audit` (requires network)

