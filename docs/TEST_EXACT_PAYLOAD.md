# Test With Exact Payload

## Payload

```json
{
  "sql": "select id from account.user_referrals;",
  "cursor_pos": 9,
  "connection_id": "d462a09b-88e7-4f01-9b61-4ef33f62a90e",
  "database_name": "affscale_v2",
  "active_schema": "public"
}
```

## Analysis

### Cursor Position

```
s e l e c t   i d   f r o m   a c c o u n t . u s e r _ r e f e r r a l s ;
0 1 2 3 4 5 6 7 8 9
                  ^
                  cursor_pos = 9 (after "select id")
```

### Expected Behavior

1. **Tokens**: `[SELECT, id, FROM, account, ., user_referrals, ;]`
2. **Tokens before cursor**: `[SELECT, id]` (only these 2!)
3. **Aliases extracted**: Should scan ALL tokens → `{"user_referrals": "account.user_referrals"}`
4. **Context**: `Select` (from tokens before cursor)
5. **Suggestions**: Columns from `account.user_referrals`

### Logging to Check

With new logging, you should see:

```
DEBUG Extracting aliases from 7 tokens
DEBUG Found alias: 'user_referrals' -> 'account.user_referrals'
DEBUG Alias extraction complete: 1 aliases, 2 tokens before cursor (out of 7)
DEBUG Autocomplete context: Select, Aliases found: {"user_referrals": "account.user_referrals"}
INFO  add_column_suggestions called with 1 aliases
DEBUG Fetching columns for alias 'user_referrals' -> table 'account.user_referrals'
```

### If Aliases Empty

```
DEBUG Extracting aliases from 7 tokens
// No "Found alias" message!
DEBUG Alias extraction complete: 0 aliases, 2 tokens before cursor (out of 7)
WARN  ❌ No aliases found - cannot suggest columns
```

**Possible causes**:

1. Tokenizer không parse đúng SQL
2. FROM keyword không được recognize
3. Table name parsing có bug

## Test Steps

### 1. Rebuild

```bash
cd backend
cargo build
```

### 2. Run with Debug Logging

```bash
set RUST_LOG=debug
cargo run
```

### 3. Send Request

```bash
curl -X POST http://localhost:3000/api/autocomplete \
  -H "Content-Type: application/json" \
  -d '{
    "sql": "select id from account.user_referrals;",
    "cursor_pos": 9,
    "connection_id": "d462a09b-88e7-4f01-9b61-4ef33f62a90e",
    "database_name": "affscale_v2",
    "active_schema": "public"
  }'
```

Or trigger from UI.

### 4. Check Logs

Look for:

```
INFO  Autocomplete request - sql: 'select id from account.user_referrals;', cursor: 9
DEBUG Extracting aliases from X tokens
DEBUG Found alias: ...  // ← Should see this!
DEBUG Alias extraction complete: X aliases, ...
```

### 5. If No Aliases Found

Add more logging to see what tokens are:

```rust
// In analyze_structure, after tokenization
for (idx, token) in tokens.iter().enumerate() {
    tracing::debug!("Token {}: {:?}", idx, token);
}
```

## Expected Issues

### Issue 1: Schema Mismatch

- `active_schema`: "public"
- Actual table schema: "account"

When fetching columns, code might use "public" instead of "account".

**Check in logs**:

```
DEBUG Fetching columns for alias 'user_referrals' -> table 'public.user_referrals'
// Should be 'account.user_referrals'!
```

**Fix**: Parser correctly extracts "account.user_referrals", so schema should be correct.

### Issue 2: Database Name

- `database_name`: "affscale_v2"
- Schema cache might be for different database

**Check**:

```sql
SELECT database_name, schema_name, COUNT(*)
FROM schema_cache
WHERE parent_name='user_referrals'
GROUP BY database_name, schema_name;
```

### Issue 3: No Cache

Table not in cache yet.

**Fix**: Refresh schema

```bash
POST /api/connections/d462a09b-88e7-4f01-9b61-4ef33f62a90e/refresh_schema
Body: {"scope": "all"}
```

## Quick Verification

### Test 1: Check Parser

```bash
cargo test test_user_referrals_query -- --nocapture
```

Should show:

```
Context: Select
Aliases: {"user_referrals": "account.user_referrals"}
```

### Test 2: Check Cache

```bash
sqlite3 backend/dbplus.db "
  SELECT object_name, object_type
  FROM schema_cache
  WHERE database_name='affscale_v2'
    AND schema_name='account'
    AND parent_name='user_referrals'
  LIMIT 5;
"
```

Should return column names.

## Next Steps

1. Rebuild & restart with debug logging
2. Send the exact payload
3. Share logs from "Autocomplete request" to "Returning X suggestions"
4. We'll identify exactly where it fails
