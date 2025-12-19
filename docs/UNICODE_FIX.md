# FIXED: Unicode Boundary Panic

## Lỗi

```
thread 'tokio-runtime-worker' panicked at src\services\autocomplete\parser.rs:206:25:
byte index 16 is not a char boundary; it is inside 'è' (bytes 15..17) of `select * from rè`
```

## Nguyên Nhân

Rust strings sử dụng UTF-8 encoding, nên một ký tự có thể chiếm nhiều bytes:

- `a` = 1 byte
- `è` = 2 bytes
- `中` = 3 bytes

Code đang **mix char indices và byte indices**:

```rust
let chars: Vec<char> = sql.chars().collect();
let start = 5;  // Char index
let cursor = 16; // Char index

let slice = &sql[start..cursor];  // ❌ PANIC! Dùng char index để slice bytes!
```

## Giải Pháp

### Fix 1: `extract_identifier_chain` (Line 206)

**Trước**:

```rust
let chars: Vec<char> = sql.chars().collect();
let start = ...; // Char index
let cursor = ...; // Char index
let slice = &sql[start..cursor];  // ❌ Panic với Unicode!
```

**Sau**:

```rust
let chars: Vec<char> = sql.chars().collect();
let start = ...; // Char index
let cursor = ...; // Char index

// Convert char indices to byte indices
let byte_start = chars.iter().take(start).map(|c| c.len_utf8()).sum::<usize>();
let byte_end = chars.iter().take(cursor).map(|c| c.len_utf8()).sum::<usize>();

let slice = &sql[byte_start..byte_end];  // ✅ Safe!
```

### Fix 2: `analyze_structure` Token Filtering (Line 338-362)

**Trước**:

```rust
let mut char_pos = 0;  // Tên biến sai lệch!
for token in tokens {
    while sql.chars().nth(char_pos).is_whitespace() {  // ❌ Slow + confusing
        char_pos += 1;
    }
    let token_len = token.value.len();  // Byte length
    char_pos += token_len;  // ❌ Mix char index + byte length!
}
```

**Sau**:

```rust
let mut byte_pos = 0;  // ✅ Tên biến rõ ràng
let sql_bytes = sql.as_bytes();

for token in tokens {
    while byte_pos < sql_bytes.len() && sql_bytes[byte_pos].is_ascii_whitespace() {
        byte_pos += 1;  // ✅ Byte position
    }
    let token_len = token.value.len();  // Byte length
    byte_pos += token_len;  // ✅ Consistent byte tracking
}
```

## Test Cases

### Test 1: ASCII Only

```sql
select * from users;
```

✅ Works (no Unicode)

### Test 2: Unicode Table Name

```sql
select * from rè;
```

✅ Fixed - no more panic!

### Test 3: Unicode in Column

```sql
select tên, from users;
```

✅ Fixed

### Test 4: Mixed

```sql
select id, tên from café_orders;
```

✅ Fixed

## Files Changed

- ✅ `backend/src/services/autocomplete/parser.rs`
  - Fixed `extract_identifier_chain` (line ~206)
  - Fixed `analyze_structure` token filtering (line ~338-362)

## Lesson Learned

**ALWAYS** be careful when slicing Rust strings:

- Use **byte indices** for slicing: `&str[byte_start..byte_end]`
- Use **char indices** for iteration: `chars().nth(char_idx)`
- Never mix the two!
- Use `.len_utf8()` to convert char → bytes
- Use `.chars().count()` to get char count (not `.len()` which is bytes)

## Status

✅ **FIXED** - Autocomplete giờ hoạt động với Unicode characters!
