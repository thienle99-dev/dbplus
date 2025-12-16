#!/bin/bash

BASE_URL="http://localhost:3000/api"
SNIPPET_ID=""

echo "Testing Snippets API..."

# 1. Create a Snippet
echo "Creating snippet..."
RESPONSE=$(curl -s -X POST "$BASE_URL/snippets" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Snippet", "description": "A test snippet", "sql": "SELECT 1;", "tags": ["test"]}')

echo "Create Response: $RESPONSE"
SNIPPET_ID=$(echo $RESPONSE | jq -r '.id')
echo "Snippet ID: $SNIPPET_ID"

if [ "$SNIPPET_ID" == "null" ] || [ -z "$SNIPPET_ID" ]; then
  echo "Failed to create snippet"
  exit 1
fi

# 2. Get Snippet List
echo "Listing snippets..."
curl -s "$BASE_URL/snippets" | jq .

# 3. Update Snippet
echo "Updating snippet..."
curl -s -X PUT "$BASE_URL/snippets/$SNIPPET_ID" \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated Snippet", "sql": "SELECT 2;", "tags": ["updated"]}' | jq .

# 4. Get Snippet Detail (implicitly tested by update return, but good to know)
# Note: There isn't a get-by-id endpoint in the plan/handlers, only create/list/update/delete.
# Wait, list returns all.

# 5. Delete Snippet
echo "Deleting snippet..."
curl -s -X DELETE "$BASE_URL/snippets/$SNIPPET_ID"
echo "Deleted."

# 6. Verify Deletion
echo "Verifying deletion..."
COUNT=$(curl -s "$BASE_URL/snippets" | jq ". | map(select(.id == \"$SNIPPET_ID\")) | length")
if [ "$COUNT" -eq "0" ]; then
  echo "Snippet successfully deleted."
else
  echo "Snippet still exists."
  exit 1
fi

echo "Snippets API tests passed!"
