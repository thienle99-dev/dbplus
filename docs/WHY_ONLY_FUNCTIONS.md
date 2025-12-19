# Debug: Tại Sao Chỉ Thấy Functions?

## Hiện Tượng

Autocomplete gợi ý **functions** (AVG, CAST, COUNT...) thay vì **columns** khi gõ:

```sql
SELECT id, FROM account.user_referrals;
```

## Phân Tích

### Context Detection: ✅ FIXED

Parser giờ đã filter tokens đúng, nên context = `Select` (không phải `From` nữa).

### Vấn Đề Mới: Tại Sao Không Có Columns?

Có 3 khả năng:

#### 1. ❓ Aliases Map Rỗng

Parser không extract được `user_referrals` từ FROM clause.

**Cách check**: Xem logs:

```
DEBUG Autocomplete context: Select, Aliases found: {}  // ❌ Empty!
```

**Nguyên nhân có thể**:

- Tokens bị filter quá sớm, FROM clause không được parse
- Logic extract aliases có bug

#### 2. ❓ Schema Cache Rỗng

Table `account.user_referrals` chưa được cache.

**Cách check**: Xem logs:

```
DEBUG Fetching columns for alias 'user_referrals' -> table 'account.user_referrals'
WARN  Failed to fetch columns for account.user_referrals  // ❌ No columns!
```

**Giải pháp**: Refresh schema cache

```bash
POST /api/connections/{id}/refresh_schema
```

#### 3. ❓ Database Name Sai

`req.database_name` không match với database thực tế.

**Cách check**: Xem logs:

```
DEBUG Fetching columns for alias 'user_referrals' -> table 'account.user_referrals'
// No columns found because database_name mismatch
```

## Cách Debug

### Bước 1: Check Logs

Run backend với:

```bash
RUST_LOG=debug cargo run
```

Trigger autocomplete và tìm:

```
INFO  Autocomplete request - sql: '...', cursor: 11
DEBUG Autocomplete context: Select, Aliases found: {...}  // ← Check this!
DEBUG Processing X table aliases for column suggestions    // ← Check this!
DEBUG Fetching columns for alias '...' -> table '...'
DEBUG Found X columns for ...                              // ← Check this!
```

### Bước 2: Test Parser Riêng

```bash
cargo test quick_test::test_current_issue -- --nocapture
```

Expected output:

```
=== PARSER TEST RESULTS ===
Context: Select
Aliases: {"user_referrals": "account.user_referrals"}
===========================
```

### Bước 3: Check Schema Cache

```bash
sqlite3 backend/dbplus.db "
  SELECT object_name, object_type, parent_name
  FROM schema_cache
  WHERE schema_name='account'
  LIMIT 10;
"
```

Should see columns from `user_referrals` table.

### Bước 4: Manual Refresh

```bash
curl -X POST http://localhost:3000/api/connections/{uuid}/refresh_schema \
  -H "Content-Type: application/json" \
  -d '{"scope": "all"}'
```

## Khả Năng Cao Nhất

Dựa vào screenshot, tôi nghĩ vấn đề là **Aliases Map Rỗng** vì:

1. Context đã đúng (Select) → parser đã filter tokens
2. Nhưng có thể filter QUÁ SỚM → FROM clause cũng bị filter
3. Nên aliases extraction không thấy FROM keyword

## Quick Fix Idea

Trong `analyze_structure`, aliases extraction nên scan **TẤT CẢ tokens** (không filter), nhưng `tokens_before` cho context detection thì filter:

```rust
fn analyze_structure(...) -> (HashMap, Vec<Token>) {
    // 1. Extract aliases from ALL tokens (không filter)
    for token in tokens {  // Scan all
        if token == FROM || token == JOIN {
            // Extract table + alias
        }
    }

    // 2. Filter tokens for context detection
    let tokens_before = tokens[..cursor_idx].to_vec();

    (aliases, tokens_before)  // aliases từ ALL, tokens_before filtered
}
```

Hiện tại code đang filter tokens trước khi extract aliases!

## Next Step

Check logs để confirm aliases map có rỗng không.
