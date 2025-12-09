# 🔍 Backend Investigation - Total Rows -1 Issue

## ✅ Frontend Fix Applied

**File**: `src/components/TableStatistics.tsx`

```typescript
function formatNumber(num: number | null): string {
    if (num === null || num === undefined) return 'N/A';
    if (num === -1) return 'Loading...'; // ✅ Now shows "Loading..." instead of "-1"
    if (num < 0) return 'N/A';
    return num.toLocaleString();
}
```

## 🔍 Backend Analysis

### Type Definitions

**Backend** (`backend/src/services/db_driver.rs:62`):
```rust
pub struct TableStatistics {
    pub row_count: Option<i64>,  // ✅ Correct - can be None
    pub table_size: Option<i64>,
    pub index_size: Option<i64>,
    pub total_size: Option<i64>,
    pub created_at: Option<String>,
    pub last_modified: Option<String>,
}
```

**Frontend** (`frontend/src/types/table.ts:55`):
```typescript
export interface TableStats {
    row_count: number | null;  // ✅ Correct - can be null
    table_size: number | null;
    index_size: number | null;
    total_size: number | null;
    created_at: string | null;
    last_modified: string | null;
}
```

### Backend Implementation

**File**: `backend/src/services/postgres/table.rs:197-287`

```rust
async fn get_table_statistics(...) -> Result<TableStatistics> {
    let stats_query = "
        SELECT 
            c.reltuples::bigint AS row_count,  // ← This should work
            pg_total_relation_size(c.oid) AS total_size,
            pg_relation_size(c.oid) AS table_size,
            pg_indexes_size(c.oid) AS index_size,
            obj_description(c.oid) AS table_comment
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = $1
            AND c.relname = $2
            AND c.relkind = 'r'";
    
    let stats_row = client.query_opt(stats_query, &[&schema, &table]).await?;
    
    if let Some(row) = stats_row {
        let row_count: Option<i64> = row.get(0);  // ← Gets value from query
        // ...
        Ok(TableStatistics {
            row_count,  // ← Should be Some(value) or None
            // ...
        })
    } else {
        Ok(TableStatistics {
            row_count: None,  // ← Returns None if table not found
            // ...
        })
    }
}
```

## 🐛 Possible Issues

### 1. **Query Returns NULL**
If `c.reltuples` is NULL in PostgreSQL:
- Backend returns `row_count: None`
- JSON serializes to `"row_count": null`
- Frontend receives `null`
- ✅ Frontend now shows "N/A"

### 2. **Table Not Found**
If table doesn't exist in `pg_class`:
- `query_opt` returns `None`
- Backend returns all fields as `None`
- ✅ Frontend now shows "N/A"

### 3. **Mysterious -1**
If frontend shows `-1`, it's NOT coming from backend because:
- Backend never sets `-1`
- Backend only uses `Option<i64>` (Some/None)
- JSON serialization: `None` → `null`, not `-1`

**Where could -1 come from?**
- ❓ Default value in frontend state?
- ❓ Error handling that sets -1?
- ❓ Old cached data?

## 🔧 Debug Steps

### 1. Check Backend Logs

```bash
# In backend terminal, look for:
grep "table-stats" backend.log

# Should see:
# [API] GET /table-stats - SUCCESS - rows: Some(12345), total_size: Some(8192)
# or
# [API] GET /table-stats - SUCCESS - rows: None, total_size: Some(8192)
```

### 2. Check Network Response

**In browser DevTools → Network tab:**
```bash
# Request:
GET /api/connections/xxx/table-stats?schema=public&table=users

# Expected Response:
{
  "row_count": 12345,      // ← Should be number or null
  "table_size": 8192,
  "index_size": 4096,
  "total_size": 12288,
  "created_at": null,
  "last_modified": "2024-01-01T00:00:00Z"
}

# If you see -1:
{
  "row_count": -1,  // ❌ This is the problem!
}
```

### 3. Check Frontend State

**In TableInfoTab.tsx**, check initial state:
```typescript
// Look for something like:
const [statistics, setStatistics] = useState<TableStats>({
    row_count: -1,  // ❌ Bad default!
    // ...
});

// Should be:
const [statistics, setStatistics] = useState<TableStats | null>(null);
// or
const [statistics, setStatistics] = useState<TableStats>({
    row_count: null,  // ✅ Good default
    // ...
});
```

### 4. Test PostgreSQL Query Directly

```sql
-- Connect to your database and run:
SELECT 
    c.reltuples::bigint AS row_count,
    pg_total_relation_size(c.oid) AS total_size,
    pg_relation_size(c.oid) AS table_size,
    pg_indexes_size(c.oid) AS index_size
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
    AND c.relname = 'users'
    AND c.relkind = 'r';

-- Expected result:
-- row_count | total_size | table_size | index_size
-- ----------|------------|------------|------------
--    12345  |    8192    |    4096    |    4096

-- If row_count is NULL or negative, that's the issue!
```

## 🎯 Most Likely Cause

**Frontend initial state has -1 as default**

Check `TableInfoTab.tsx` for:
```typescript
const [statistics, setStatistics] = useState({
    row_count: -1,  // ← This is probably the culprit!
    table_size: -1,
    index_size: -1,
    total_size: -1,
    created_at: null,
    last_modified: null,
});
```

**Fix**:
```typescript
const [statistics, setStatistics] = useState<TableStats>({
    row_count: null,  // ✅ Use null instead of -1
    table_size: null,
    index_size: null,
    total_size: null,
    created_at: null,
    last_modified: null,
});
```

## 📝 Next Actions

1. ✅ **Frontend display fix** - Already done (shows "Loading..." for -1)
2. 🔍 **Check TableInfoTab.tsx** - Look for initial state with -1
3. 🔍 **Check browser Network tab** - See actual API response
4. 🔍 **Check backend logs** - See what backend is returning
5. 🐛 **Fix root cause** - Update initial state to use null

---

**Status**: Frontend workaround applied. Need to find where -1 is coming from in frontend code.
