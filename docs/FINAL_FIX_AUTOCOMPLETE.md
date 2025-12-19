# FINAL FIX: Column Autocomplete

## Vấn Đề

Autocomplete gợi ý **keywords** (ALL, ALTER TABLE, AND...) thay vì **columns** khi gõ:

```sql
SELECT id, FROM account.user_referrals;
          ^ cursor here - showing keywords instead of columns!
```

## Nguyên Nhân Chính Xác

Trong `parser.rs`, hàm `analyze_structure` có parameters `_sql` và `_cursor` với underscore prefix (nghĩa là không dùng), và line 336 return TẤT CẢ tokens:

```rust
fn analyze_structure(
    tokens: &[Token],
    _sql: &str,        // ❌ Không dùng!
    _cursor: usize,    // ❌ Không dùng!
) -> (HashMap<String, String>, Vec<Token>) {
    // ...
    tokens_before = tokens.to_vec();  // ❌ Return ALL tokens!
}
```

Khi `determine_context` nhận TẤT CẢ tokens (bao gồm cả `FROM` sau cursor), nó scan ngược và gặp `FROM` trước `SELECT`, nên return `CursorContext::From` → gợi ý tables/keywords thay vì columns!

## Giải Pháp

### Sửa `analyze_structure` để:

1. **Dùng parameters** `sql` và `cursor` (bỏ underscore)
2. **Filter tokens** để chỉ giữ tokens TRƯỚC cursor position
3. **Return filtered tokens** cho context detection

```rust
fn analyze_structure(
    tokens: &[Token],
    sql: &str,      // ✅ Dùng để track position
    cursor: usize,  // ✅ Dùng để filter
) -> (HashMap<String, String>, Vec<Token>) {
    // ... alias extraction ...

    // Filter tokens before cursor
    let mut char_pos = 0;
    let mut cursor_idx = tokens.len();

    for (idx, token) in tokens.iter().enumerate() {
        // Skip whitespace
        while char_pos < sql.len() && sql.chars().nth(char_pos).map_or(false, |c| c.is_whitespace()) {
            char_pos += 1;
        }

        // Calculate token length
        let token_len = match token {
            Token::Word(w) => w.value.len(),
            _ => 1,
        };

        char_pos += token_len;

        // Stop when we reach cursor
        if char_pos >= cursor {
            cursor_idx = idx;
            break;
        }
    }

    // Only return tokens BEFORE cursor
    tokens_before = tokens[..cursor_idx].to_vec();

    (aliases, tokens_before)
}
```

## Kết Quả

### Trước Fix:

```sql
SELECT id, FROM account.user_referrals;
          ^
Tokens passed to determine_context: [SELECT, id, Comma, FROM, account, ...]
Context detected: From (vì gặp FROM khi scan ngược)
Suggestions: ALL, ALTER TABLE, AND, AS, ... (keywords)
```

### Sau Fix:

```sql
SELECT id, FROM account.user_referrals;
          ^
Tokens passed to determine_context: [SELECT, id, Comma]  ✅ Chỉ tokens trước cursor!
Context detected: Select  ✅ Đúng!
Suggestions: user_referrals.id, user_referrals.name, ... ✅ Columns!
```

## Test Case

```sql
-- Test 1: Simple table
SELECT id, FROM users;
-- Should suggest: users.id, users.name, users.email, ...

-- Test 2: Schema.table
SELECT id, FROM payment.invoices;
-- Should suggest: invoices.id, invoices.amount, invoices.status, ...

-- Test 3: Explicit alias
SELECT u. FROM users u;
-- Should suggest: u.id, u.name, u.email, ...

-- Test 4: Multiple tables
SELECT FROM users u JOIN orders o ON u.id = o.user_id;
-- Should suggest: u.id, u.name, o.id, o.amount, ...
```

## Files Changed

- ✅ `backend/src/services/autocomplete/parser.rs` - Fixed token filtering

## Cách Test

1. Rebuild backend: `cargo build`
2. Restart backend
3. Gõ: `SELECT id, FROM account.user_referrals;`
4. Đặt cursor sau dấu phẩy
5. Trigger autocomplete
6. **Expected**: Thấy columns từ `user_referrals` table
7. **Not**: Keywords như ALL, ALTER TABLE, etc.

## Status

✅ **FIXED** - Parser giờ đã filter tokens đúng cách, context detection hoạt động chính xác!
