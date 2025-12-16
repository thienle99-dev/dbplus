#!/bin/bash

# Test Query History API
# Usage: ./test_history_api.sh <connection_id>

CONNECTION_ID=${1:-"your-connection-id-here"}
API_BASE="http://localhost:19999"

echo "🧪 Testing Query History API"
echo "Connection ID: $CONNECTION_ID"
echo ""

# Test 1: Add a test history entry
echo "📝 Test 1: Adding history entry..."
curl -X POST "$API_BASE/api/connections/$CONNECTION_ID/history" \
  -H "Content-Type: application/json" \
  -d '{
    "sql": "SELECT * FROM test_table LIMIT 10",
    "row_count": 10,
    "execution_time": 150,
    "success": true,
    "error_message": null
  }' \
  -w "\nStatus: %{http_code}\n\n"

# Test 2: Get history
echo "📋 Test 2: Fetching history..."
curl -X GET "$API_BASE/api/connections/$CONNECTION_ID/history?limit=10" \
  -w "\nStatus: %{http_code}\n\n"

# Test 3: Add error entry
echo "❌ Test 3: Adding error entry..."
curl -X POST "$API_BASE/api/connections/$CONNECTION_ID/history" \
  -H "Content-Type: application/json" \
  -d '{
    "sql": "SELECT * FROM nonexistent_table",
    "row_count": null,
    "execution_time": 50,
    "success": false,
    "error_message": "Table does not exist"
  }' \
  -w "\nStatus: %{http_code}\n\n"

# Test 4: Get history again
echo "📋 Test 4: Fetching history again..."
curl -X GET "$API_BASE/api/connections/$CONNECTION_ID/history?limit=10" \
  -w "\nStatus: %{http_code}\n\n"

echo "✅ Tests complete!"
