# 🔧 Fix: Table Statistics Total Rows Display

## ❌ Vấn Đề

**Table Statistics hiển thị "Total Rows: -1" thay vì số thực tế**

### Triệu Chứng
- Total Rows field hiển thị `-1`
- Confusing cho user
- Không rõ là loading hay error

## ✅ Giải Pháp Frontend

### Cải Thiện formatNumber()

```typescript
// BEFORE
function formatNumber(num: number | null): string {
    if (num === null || num === undefined) return 'N/A';
    return num.toLocaleString(); // ❌ -1 → "-1"
}

// AFTER
function formatNumber(num: number | null): string {
    if (num === null || num === undefined) return 'N/A';
    if (num === -1) return 'Loading...'; // ✅ Better UX
    if (num < 0) return 'N/A'; // Handle other negative values
    return num.toLocaleString();
}
```

### Display States

| Value | Display | Meaning |
|-------|---------|---------|
| `null` | N/A | No data available |
| `undefined` | N/A | Not initialized |
| `-1` | **Loading...** | Data is being fetched |
| `< 0` | N/A | Invalid/error state |
| `>= 0` | Formatted number | Actual row count |

## 🎯 Root Cause Analysis

### Possible Backend Issues

1. **Query Not Executed**
   - Backend might return -1 as placeholder
   - Actual query to count rows not running

2. **Permission Issues**
   - User might not have permission to query `pg_stat_user_tables`
   - Falls back to -1

3. **Table Not Found**
   - Table doesn't exist in `pg_stat_user_tables`
   - Returns -1 as default

### Backend API Endpoint

```
GET /api/connections/:id/table-stats?schema=:schema&table=:table
```

**Expected Response:**
```json
{
  "row_count": 12345,
  "table_size": 8192,
  "index_size": 4096,
  "total_size": 12288,
  "last_modified": "2024-01-01T00:00:00Z"
}
```

**Current Response (Issue):**
```json
{
  "row_count": -1,  // ❌ Problem
  "table_size": 8192,
  "index_size": 4096,
  "total_size": 12288,
  "last_modified": "2024-01-01T00:00:00Z"
}
```

## 🔍 Backend Investigation Needed

### Check Backend Code

File: `backend/src/handlers/table_info.rs` (or similar)

```rust
// Likely issue:
pub async fn get_table_stats(...) -> Result<TableStats> {
    // TODO: Implement actual row count query
    Ok(TableStats {
        row_count: -1,  // ❌ Hardcoded placeholder
        // ...
    })
}
```

### Proper Implementation

```rust
pub async fn get_table_stats(
    schema: &str,
    table: &str,
    pool: &PgPool
) -> Result<TableStats> {
    // Query actual row count
    let row_count = sqlx::query_scalar!(
        r#"
        SELECT n_live_tup 
        FROM pg_stat_user_tables 
        WHERE schemaname = $1 AND relname = $2
        "#,
        schema,
        table
    )
    .fetch_optional(pool)
    .await?
    .unwrap_or(0); // Default to 0 if not found
    
    // Or use COUNT(*) for exact count:
    let row_count = sqlx::query_scalar!(
        r#"SELECT COUNT(*) FROM {}.{}"#,
        schema,
        table
    )
    .fetch_one(pool)
    .await?;
    
    Ok(TableStats {
        row_count,
        // ...
    })
}
```

## 📊 Display Improvements

### Before Fix
```
📊 Total Rows
-1              ← Confusing!
```

### After Fix (Frontend)
```
📊 Total Rows
Loading...      ← Clear status
```

### After Full Fix (Backend + Frontend)
```
📊 Total Rows
12,345          ← Actual count
```

## ✅ Testing Checklist

### Frontend (Done)
- [x] -1 displays as "Loading..."
- [x] null displays as "N/A"
- [x] Positive numbers format correctly
- [x] Removed unused import

### Backend (TODO)
- [ ] Verify table-stats API endpoint
- [ ] Check if row_count query is implemented
- [ ] Test with actual database
- [ ] Handle permission errors gracefully
- [ ] Add proper error logging

## 🎯 Next Steps

1. **Check Backend Logs**
   ```bash
   # Look for errors in table stats query
   grep "table-stats" backend.log
   ```

2. **Test API Directly**
   ```bash
   curl "http://localhost:8080/api/connections/1/table-stats?schema=public&table=users"
   ```

3. **Fix Backend Implementation**
   - Implement actual row count query
   - Handle errors properly
   - Return 0 instead of -1 for empty tables

4. **Verify Fix**
   - Refresh statistics in UI
   - Check if actual row count appears

## 📝 Files Changed

**Frontend:**
- `src/components/TableStatistics.tsx`
  - Updated `formatNumber()` to handle -1
  - Removed unused import

**Backend (Needs Investigation):**
- `backend/src/handlers/table_info.rs` (or similar)
  - Need to implement actual row count query

## 💡 Alternative Solutions

### Option 1: Use Estimated Count (Fast)
```sql
SELECT n_live_tup 
FROM pg_stat_user_tables 
WHERE schemaname = 'public' AND relname = 'users';
```
- ✅ Very fast
- ❌ Approximate (may be outdated)

### Option 2: Use Exact Count (Slow for large tables)
```sql
SELECT COUNT(*) FROM public.users;
```
- ✅ Exact count
- ❌ Slow for large tables (full table scan)

### Option 3: Hybrid Approach
```sql
-- Use estimate for large tables, exact for small
SELECT 
  CASE 
    WHEN n_live_tup > 100000 THEN n_live_tup
    ELSE (SELECT COUNT(*) FROM public.users)
  END as row_count
FROM pg_stat_user_tables 
WHERE schemaname = 'public' AND relname = 'users';
```

---

**Kết luận**: Frontend đã được cải thiện để hiển thị "Loading..." thay vì "-1". Cần kiểm tra backend để fix root cause! 🔧
