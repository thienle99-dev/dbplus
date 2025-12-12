#!/bin/bash

# Test Database/Schema management APIs
# Usage:
#   ./test_database_management_api.sh <connection_id> <database_name> <schema_name>
#
# Notes:
# - `create_database`/`drop_database` are supported for Postgres connections.
# - `create_schema`/`drop_schema` operate on the database configured in the saved connection.

set -euo pipefail

CONNECTION_ID=${1:-"your-connection-id-here"}
DB_NAME=${2:-"dbplus_test_db"}
SCHEMA_NAME=${3:-"dbplus_test_schema"}
API_BASE="http://localhost:19999"

echo "Testing Database/Schema Management API"
echo "Connection ID: $CONNECTION_ID"
echo "Database name: $DB_NAME"
echo "Schema name:   $SCHEMA_NAME"
echo ""

echo "[1] Create database..."
curl -sS -X POST "$API_BASE/api/connections/$CONNECTION_ID/databases" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"$DB_NAME\"}" \
  -w "\nStatus: %{http_code}\n\n"

echo "[2] List databases..."
curl -sS -X GET "$API_BASE/api/connections/$CONNECTION_ID/databases" \
  -w "\nStatus: %{http_code}\n\n"

echo "[3] Create schema (in the connection's configured database)..."
curl -sS -X POST "$API_BASE/api/connections/$CONNECTION_ID/schemas" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"$SCHEMA_NAME\"}" \
  -w "\nStatus: %{http_code}\n\n"

echo "[4] Drop schema..."
curl -sS -X DELETE "$API_BASE/api/connections/$CONNECTION_ID/schemas/$SCHEMA_NAME" \
  -w "\nStatus: %{http_code}\n\n"

echo "[5] Drop database..."
curl -sS -X DELETE "$API_BASE/api/connections/$CONNECTION_ID/databases/$DB_NAME" \
  -w "\nStatus: %{http_code}\n\n"

echo "Done."

