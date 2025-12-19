# Fix: Table Suggestions Appearing in SELECT Clause

## Vấn Đề

Khi gõ `SELECT id, FROM payment.invoice_items`, autocomplete đang gợi ý **table names** thay vì **column names**.

## Nguyên Nhân

Trong `parser.rs`, hàm `analyze_structure` đang return TẤT CẢ tokens cho context detection:

```rust
// Line 336
tokens_before = tokens.to_vec();  // ❌ Returns ALL tokens including FROM
```

Khi `determine_context` scan ngược, nó gặp `FROM` trước `SELECT`, nên return `CursorContext::From` thay vì `CursorContext::Select`.

## Giải Pháp

Cần filter tokens để chỉ giữ lại tokens **TRƯỚC cursor position**:

```rust
// Cần implement logic để:
// 1. Track vị trí của mỗi token trong SQL string
// 2. Chỉ include tokens có position < cursor_pos
// 3. Pass filtered tokens vào determine_context
```

## Workaround Tạm Thời

Có thể thêm logic đặc biệt trong `determine_context`:

- Nếu tìm thấy cả `SELECT` và `FROM`
- Kiểm tra xem có dấu phẩy giữa chúng không
- Nếu có, ưu tiên `SELECT` context

Hoặc đơn giản hơn: **Luôn ưu tiên SELECT nếu có cả SELECT và FROM trong query**

```rust
fn determine_context(tokens: &[Token]) -> CursorContext {
    let mut found_select = false;
    let mut found_from = false;

    // Scan all tokens first
    for token in tokens {
        if let Token::Word(w) = token {
            match w.value.to_uppercase().as_str() {
                "SELECT" => found_select = true,
                "FROM" => found_from = true,
                _ => {}
            }
        }
    }

    // If both SELECT and FROM exist, prefer SELECT context
    // (cursor is likely in column selection area)
    if found_select && found_from {
        return CursorContext::Select;
    }

    // Otherwise, scan backwards as before
    // ...
}
```

## Cần Làm

1. Implement proper token position tracking
2. Filter tokens based on cursor position
3. Update tests to verify correct context detection
