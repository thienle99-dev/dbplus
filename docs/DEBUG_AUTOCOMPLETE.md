# Debug Guide: Column Autocomplete Not Working

## Vấn Đề

Column autocomplete không hoạt động khi gõ:

```sql
SELECT id, FROM payment.invoice_items;
```

## Các Bước Debug

### 1. Kiểm Tra Backend Có Chạy Không

```bash
# Check if backend is running
curl http://localhost:3000/health
```

### 2. Kiểm Tra Frontend Có Gửi Request Không

Mở DevTools > Network tab, gõ autocomplete và xem:

- Có request đến `/autocomplete` không?
- Request body có đúng không? (sql, cursor_pos, connection_id)
- Response status code là gì?

### 3. Kiểm Tra Logs

Enable debug logging:

```bash
RUST_LOG=debug cargo run
```

Hoặc trong code, thêm logging:

```rust
tracing::info!("Autocomplete request: {:?}", req);
```

### 4. Test Trực Tiếp API

```bash
curl -X POST http://localhost:3000/api/autocomplete \
  -H "Content-Type: application/json" \
  -d '{
    "sql": "SELECT id, FROM payment.invoice_items",
    "cursor_pos": 11,
    "connection_id": "your-uuid-here",
    "database_name": "your_db",
    "active_schema": "payment"
  }'
```

### 5. Kiểm Tra Schema Cache

```bash
# Check if schema cache has data
sqlite3 backend/dbplus.db "SELECT * FROM schema_cache WHERE schema_name='payment' LIMIT 5;"
```

### 6. Test Parser Riêng

Chạy unit test:

```bash
cargo test test_schema_table_alias_extraction -- --nocapture
```

## Các Vấn Đề Thường Gặp

### A. Backend Không Nhận Request

- Check route có được register không trong `main.rs`
- Check CORS settings
- Check port number

### B. Parser Detect Sai Context

- Thêm log trong `determine_context`
- Verify tokens được parse đúng
- Check cursor position có chính xác không

### C. Schema Cache Rỗng

- Chạy refresh schema: `POST /api/connections/{id}/refresh_schema`
- Check database connection có hoạt động không
- Verify schema "payment" tồn tại

### D. Driver Không Support

- Check `db_type` của connection
- Verify driver được implement đúng
- Check `list_functions` và `get_columns` có hoạt động không

## Quick Fix: Thêm Logging

### File: `backend/src/handlers/autocomplete.rs`

```rust
pub async fn get_suggestions(
    State(state): State<AppState>,
    Json(req): Json<AutocompleteRequest>,
) -> Result<Json<Vec<Suggestion>>, (StatusCode, String)> {
    // ADD THIS
    tracing::info!("🔍 Autocomplete: sql='{}', cursor={}", req.sql, req.cursor_pos);

    // ... existing code ...

    // ADD THIS
    tracing::info!("✅ Returning {} suggestions", suggestions.len());
    Ok(Json(suggestions))
}
```

### File: `backend/src/services/autocomplete/engine.rs`

```rust
pub async fn suggest(...) -> Result<Vec<Suggestion>> {
    // ADD THIS
    tracing::debug!("📝 Parse result: context={:?}, aliases={:?}",
        parse_result.context, parse_result.aliases);

    // ... existing code ...
}
```

### File: `backend/src/services/autocomplete/parser.rs`

```rust
fn determine_context(tokens: &[Token]) -> CursorContext {
    // ADD THIS at the end
    let result = /* ... your logic ... */;
    tracing::debug!("🎯 Context determined: {:?}", result);
    result
}
```

## Expected Log Output

Khi autocomplete hoạt động đúng:

```
INFO  🔍 Autocomplete: sql='SELECT id, FROM payment.invoice_items', cursor=11
DEBUG 📝 Parse result: context=Select, aliases={"invoice_items": "payment.invoice_items"}
DEBUG Fetching columns for alias 'invoice_items' -> table 'payment.invoice_items'
DEBUG Found 10 columns for payment.invoice_items
INFO  ✅ Returning 10 suggestions
```

Khi có lỗi:

```
INFO  🔍 Autocomplete: sql='SELECT id, FROM payment.invoice_items', cursor=11
DEBUG 📝 Parse result: context=From, aliases={}  # ❌ Wrong context!
WARN  Failed to fetch columns for payment.invoice_items  # ❌ No columns!
INFO  ✅ Returning 0 suggestions  # ❌ No suggestions!
```

## Next Steps

1. Add logging như trên
2. Restart backend với `RUST_LOG=debug`
3. Test autocomplete và check logs
4. Share log output để debug tiếp
