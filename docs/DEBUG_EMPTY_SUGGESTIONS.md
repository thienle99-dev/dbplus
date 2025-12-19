# Debug: Empty Suggestions Array

## Vấn Đề

Request: `"select id, spo from account.user_referrals;"`
Response: `[]` (empty array)

## Logging Đã Thêm

Giờ backend sẽ log:

```
INFO  Autocomplete request - sql: '...', cursor: ...
DEBUG Autocomplete context: ..., Aliases found: {...}
INFO  add_column_suggestions called with X aliases
DEBUG Fetching columns for alias '...' -> table '...'
DEBUG Found X columns for ...
INFO  📊 Before filter: X suggestions
INFO  ✅ After filter: X suggestions (prefix: '...')
INFO  Returning X suggestions
```

## Các Trường Hợp Có Thể

### Case 1: Aliases Rỗng

```
INFO  add_column_suggestions called with 0 aliases
WARN  ❌ No aliases found - cannot suggest columns
```

**Nguyên nhân**: Parser không extract được table từ FROM clause
**Fix**: Debug parser

### Case 2: Schema Cache Rỗng

```
INFO  add_column_suggestions called with 1 aliases
DEBUG Fetching columns for alias 'user_referrals' -> table 'account.user_referrals'
WARN  Failed to fetch columns for account.user_referrals
```

**Nguyên nhân**: Table chưa được cache
**Fix**: Refresh schema

### Case 3: Suggestions Bị Filter Hết

```
INFO  📊 Before filter: 10 suggestions
INFO  ✅ After filter: 0 suggestions (prefix: 'spo')
```

**Nguyên nhân**: Prefix "spo" không match với bất kỳ column nào
**Fix**: Check filter logic hoặc column names

### Case 4: Context Sai

```
DEBUG Autocomplete context: Unknown, Aliases found: {}
```

**Nguyên nhân**: Parser không nhận ra context
**Fix**: Debug context detection

## Cách Debug

### Bước 1: Check Logs

```bash
# Run backend
set RUST_LOG=debug
cargo run

# Hoặc nếu đã chạy, check terminal output
```

### Bước 2: Trigger Autocomplete

Gõ:

```sql
select id, spo from account.user_referrals;
```

Cursor sau "spo" (hoặc sau dấu phẩy)

### Bước 3: Analyze Logs

Tìm sequence:

```
INFO  Autocomplete request
  ↓
DEBUG Autocomplete context: ...
  ↓
INFO  add_column_suggestions called with X aliases
  ↓
DEBUG Fetching columns...
  ↓
INFO  Before filter: X suggestions
  ↓
INFO  After filter: X suggestions
  ↓
INFO  Returning X suggestions
```

Xem ở bước nào số lượng = 0?

### Bước 4: Quick Tests

#### Test 1: Check Schema Cache

```bash
sqlite3 backend/dbplus.db "
  SELECT COUNT(*) as column_count
  FROM schema_cache
  WHERE schema_name='account'
    AND parent_name='user_referrals'
    AND object_type='column';
"
```

Should return > 0

#### Test 2: Manual Refresh

```bash
curl -X POST http://localhost:3000/api/connections/{uuid}/refresh_schema \
  -H "Content-Type: application/json" \
  -d '{"scope": "all"}'
```

#### Test 3: Simple Query

Try simpler SQL:

```sql
select from account.user_referrals;
```

(cursor after "select ")

## Expected Log Output

### Success Case:

```
INFO  Autocomplete request - sql: 'select id, spo from account.user_referrals;', cursor: 14
DEBUG Autocomplete context: Select, Aliases found: {"user_referrals": "account.user_referrals"}
INFO  add_column_suggestions called with 1 aliases
DEBUG Fetching columns for alias 'user_referrals' -> table 'account.user_referrals'
DEBUG Found 5 columns for account.user_referrals
INFO  📊 Before filter: 5 suggestions
INFO  ✅ After filter: 1 suggestions (prefix: 'spo')  // If column starts with 'spo'
INFO  Returning 1 suggestions
```

### Failure Case (No Cache):

```
INFO  Autocomplete request - sql: 'select id, spo from account.user_referrals;', cursor: 14
DEBUG Autocomplete context: Select, Aliases found: {"user_referrals": "account.user_referrals"}
INFO  add_column_suggestions called with 1 aliases
DEBUG Fetching columns for alias 'user_referrals' -> table 'account.user_referrals'
WARN  Failed to fetch columns for account.user_referrals  // ← Problem here!
INFO  📊 Before filter: 0 suggestions
INFO  ✅ After filter: 0 suggestions (prefix: 'spo')
INFO  Returning 0 suggestions
```

## Next Steps

1. Rebuild: `cargo build`
2. Restart backend
3. Trigger autocomplete
4. Share logs từ "Autocomplete request" đến "Returning X suggestions"
