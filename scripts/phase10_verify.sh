#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." >/dev/null 2>&1 && pwd)"

PG_HOST="${PG_HOST:-127.0.0.1}"
PG_PORT="${PG_PORT:-15432}"
PG_DB="${PG_DB:-dbplus}"
PG_USER="${PG_USER:-dbplus}"
PG_PASSWORD="${PG_PASSWORD:-dbplus}"

BACKEND_PORT="${BACKEND_PORT:-19999}"
BACKEND_ADDR="http://127.0.0.1:${BACKEND_PORT}"

TMP_DIR="${ROOT_DIR}/.tmp"
mkdir -p "${TMP_DIR}"
BACKEND_DB_PATH="${BACKEND_DB_PATH:-${TMP_DIR}/phase10.db}"

echo "[phase10] root: ${ROOT_DIR}"
echo "[phase10] backend db: ${BACKEND_DB_PATH}"

compose_file="${ROOT_DIR}/dev/postgres/docker-compose.yml"

if ! command -v docker >/dev/null 2>&1; then
  echo "[phase10] ERROR: docker not found"
  exit 1
fi

echo "[phase10] starting postgres (docker compose)..."
docker compose -f "${compose_file}" up -d

echo "[phase10] waiting for postgres health..."
for i in {1..60}; do
  status="$(docker inspect --format='{{.State.Health.Status}}' dbplus-postgres 2>/dev/null || true)"
  if [[ "${status}" == "healthy" ]]; then
    echo "[phase10] postgres is healthy"
    break
  fi
  if [[ $i -eq 60 ]]; then
    echo "[phase10] ERROR: postgres did not become healthy (status=${status})"
    docker logs --tail 200 dbplus-postgres || true
    exit 1
  fi
  sleep 1
done

echo "[phase10] starting backend..."
backend_log="${TMP_DIR}/phase10_backend.log"
rm -f "${backend_log}"

(
  cd "${ROOT_DIR}"
  exec cargo run --manifest-path backend/Cargo.toml --quiet -- "${BACKEND_DB_PATH}"
) >"${backend_log}" 2>&1 &
backend_pid=$!

cleanup() {
  echo "[phase10] shutting down backend (pid=${backend_pid})"
  kill "${backend_pid}" >/dev/null 2>&1 || true
  wait "${backend_pid}" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "[phase10] waiting for backend..."
for i in {1..60}; do
  if curl -fsS "${BACKEND_ADDR}/" >/dev/null 2>&1; then
    echo "[phase10] backend is up"
    break
  fi
  if [[ $i -eq 60 ]]; then
    echo "[phase10] ERROR: backend did not start"
    tail -n 200 "${backend_log}" || true
    exit 1
  fi
  sleep 0.5
done

echo "[phase10] testing postgres connection via API..."
test_payload="$(
  cat <<JSON
{
  "name": "phase10-postgres",
  "type": "postgres",
  "host": "${PG_HOST}",
  "port": ${PG_PORT},
  "database": "${PG_DB}",
  "username": "${PG_USER}",
  "password": "${PG_PASSWORD}",
  "ssl": false
}
JSON
)"

curl -fsS "${BACKEND_ADDR}/api/connections/test" \
  -H "content-type: application/json" \
  -d "${test_payload}" >/dev/null

echo "[phase10] creating connection..."
conn_json="$(curl -fsS "${BACKEND_ADDR}/api/connections" -H "content-type: application/json" -d "${test_payload}")"
conn_id="$(node -e 'const s=process.argv[1]; const j=JSON.parse(s); process.stdout.write(j.id);' "${conn_json}")"
echo "[phase10] connection id: ${conn_id}"

echo "[phase10] execute: SELECT items..."
curl -fsS "${BACKEND_ADDR}/api/connections/${conn_id}/execute" \
  -H "content-type: application/json" \
  -d '{"query":"SELECT id, name FROM public.items ORDER BY id","limit":100,"offset":0,"include_total_count":true}' \
  | node -e 'const j=require("fs").readFileSync(0,"utf8"); const o=JSON.parse(j); if(!o.rows||o.rows.length<3) process.exit(1); process.stdout.write("[ok] rows="+o.rows.length+"\\n");'

echo "[phase10] execute-script: multi statement..."
curl -fsS "${BACKEND_ADDR}/api/connections/${conn_id}/execute-script" \
  -H "content-type: application/json" \
  -d '{"script":"CREATE TABLE IF NOT EXISTS public.phase10_tmp(id int); INSERT INTO public.phase10_tmp(id) VALUES (1),(2);"}' \
  | node -e 'const j=require("fs").readFileSync(0,"utf8"); const o=JSON.parse(j); if(!o.success) process.exit(1); process.stdout.write("[ok] statements_executed="+o.statements_executed+"\\n");'

if [[ "${PHASE10_PERF:-0}" == "1" ]]; then
  echo "[phase10] perf: seeding big_items (100000 rows)..."
  curl -fsS "${BACKEND_ADDR}/api/connections/${conn_id}/execute" \
    -H "content-type: application/json" \
    -d '{"query":"INSERT INTO public.big_items(payload) SELECT md5(g::text) FROM generate_series(1,100000) g ON CONFLICT DO NOTHING;","limit":1,"offset":0}' >/dev/null || true

  echo "[phase10] perf: streaming 100000 rows (NDJSON)..."
  /usr/bin/time -p curl -sS "${BACKEND_ADDR}/api/connections/${conn_id}/execute/stream" \
    -H "content-type: application/json" \
    -d '{"query":"SELECT * FROM public.big_items ORDER BY id","limit":null,"offset":null,"include_total_count":false}' \
    -o /dev/null
fi

echo "[phase10] ok"
