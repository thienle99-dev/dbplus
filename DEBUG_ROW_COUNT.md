# 🔍 Debug Guide - Finding the -1 Row Count

## ✅ Debug Logging Added

### Frontend Logging
**File**: `src/components/TableInfoTab.tsx`

```typescript
const fetchStatistics = async () => {
    // ...
    const response = await api.get(...);
    console.log('[DEBUG] Table stats response:', response.data);
    console.log('[DEBUG] row_count value:', response.data.row_count, 'type:', typeof response.data.row_count);
    // ...
};
```

### Backend Logging
**File**: `backend/src/services/postgres/table.rs`

```rust
// After fetching from database
tracing::info!(
    "[PostgresTable] get_table_statistics - RAW VALUES: row_count={:?}, table_size={:?}, index_size={:?}, total_size={:?}",
    row_count, table_size, index_size, total_size
);

// Before returning
tracing::info!(
    "[PostgresTable] get_table_statistics - FINAL RESULT: {:?}",
    result
);
```

## 🧪 How to Test

### Step 1: Open Browser DevTools
1. Open your app in browser
2. Press `F12` or `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)
3. Go to **Console** tab

### Step 2: Navigate to Table Info
1. Click on any database connection
2. Click on a table in the sidebar
3. Go to **Table Info** tab

### Step 3: Check Console Logs

You should see logs like:

```
[DEBUG] Table stats response: {
  row_count: -1,          ← This is the problem!
  table_size: 8192,
  index_size: 4096,
  total_size: 12288,
  created_at: null,
  last_modified: "2024-01-01T00:00:00Z"
}
[DEBUG] row_count value: -1 type: number
```

**OR** (if backend returns null correctly):

```
[DEBUG] Table stats response: {
  row_count: null,        ← Good!
  table_size: 8192,
  index_size: 4096,
  total_size: 12288,
  created_at: null,
  last_modified: "2024-01-01T00:00:00Z"
}
[DEBUG] row_count value: null type: object
```

### Step 4: Check Backend Logs

In your backend terminal, look for:

```
[PostgresTable] get_table_statistics - RAW VALUES: row_count=Some(-1), table_size=Some(8192), index_size=Some(4096), total_size=Some(12288)
```

**OR**:

```
[PostgresTable] get_table_statistics - RAW VALUES: row_count=None, table_size=Some(8192), index_size=Some(4096), total_size=Some(12288)
```

**OR**:

```
[PostgresTable] get_table_statistics - RAW VALUES: row_count=Some(12345), table_size=Some(8192), index_size=Some(4096), total_size=Some(12288)
```

## 🎯 Interpretation

### Case 1: Backend Returns -1
```
Backend: row_count=Some(-1)
Frontend: row_count: -1
```
**Root Cause**: PostgreSQL query `c.reltuples::bigint` is returning -1
**Why**: Table has never been analyzed, or stats are stale
**Fix**: Run `ANALYZE table_name;` in PostgreSQL

### Case 2: Backend Returns None
```
Backend: row_count=None
Frontend: row_count: null
```
**Root Cause**: Table not found in `pg_class` or `reltuples` is NULL
**Why**: Table doesn't exist or stats not available
**Fix**: Check table exists, run `ANALYZE`

### Case 3: Backend Returns Positive Number
```
Backend: row_count=Some(12345)
Frontend: row_count: 12345
```
**Status**: ✅ Working correctly!

## 🔧 Fixes Based on Findings

### If PostgreSQL Returns -1

**Option 1: Run ANALYZE (Recommended)**
```sql
-- For specific table
ANALYZE public.users;

-- For all tables in schema
ANALYZE;

-- For entire database
VACUUM ANALYZE;
```

**Option 2: Use Exact Count (Slower)**

Update backend query to use `COUNT(*)` instead of `reltuples`:

```rust
// In backend/src/services/postgres/table.rs
let stats_query = "
    SELECT 
        (SELECT COUNT(*) FROM \"{schema}\".\"{table}\")::bigint AS row_count,
        pg_total_relation_size(c.oid) AS total_size,
        pg_relation_size(c.oid) AS table_size,
        pg_indexes_size(c.oid) AS index_size
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = $1
        AND c.relname = $2
        AND c.relkind = 'r'";
```

**Option 3: Fallback to COUNT(*) if -1**

```rust
let row_count: Option<i64> = row.get(0);

// If reltuples is -1, use COUNT(*)
let row_count = if row_count == Some(-1) {
    let count_query = format!(
        "SELECT COUNT(*) FROM \\\"{}\\\".\\\"{}\\\"",
        schema, table
    );
    let count_row = client.query_one(&count_query, &[]).await?;
    Some(count_row.get::<_, i64>(0))
} else {
    row_count
};
```

### If Table Not Found

Check:
1. Table name spelling
2. Schema name spelling
3. User permissions
4. Table actually exists

## 📊 Expected Behavior

### Fresh Table (Never Analyzed)
- `reltuples` = `-1` or `0`
- Need to run `ANALYZE`

### After ANALYZE
- `reltuples` = approximate row count
- Fast, but may be outdated

### Using COUNT(*)
- Always exact
- Slow for large tables (full table scan)

## 🎯 Next Steps

1. ✅ **Check console logs** - See what frontend receives
2. ✅ **Check backend logs** - See what database returns
3. 🔧 **Run ANALYZE** - If -1 is from PostgreSQL
4. 🔧 **Update query** - If need exact count
5. ✅ **Verify fix** - Refresh and check again

## 📝 Cleanup

After debugging, you can remove the console.log statements:

**Frontend** (`TableInfoTab.tsx`):
```typescript
// Remove these lines:
console.log('[DEBUG] Table stats response:', response.data);
console.log('[DEBUG] row_count value:', response.data.row_count, 'type:', typeof response.data.row_count);
```

**Backend** (`table.rs`):
```rust
// Keep or remove these - they're useful for monitoring:
tracing::info!("[PostgresTable] get_table_statistics - RAW VALUES: ...");
tracing::info!("[PostgresTable] get_table_statistics - FINAL RESULT: ...");
```

---

**Status**: Debug logging active. Check console and backend logs to find the source of -1!
