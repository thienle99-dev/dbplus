# NEXT STEPS: Debug Column Autocomplete

## Tình Huống Hiện Tại

✅ Context detection đã FIXED - giờ detect đúng là `Select`  
❌ Nhưng chỉ thấy functions, không thấy columns

## Cần Làm NGAY

### 1. Check Backend Logs

Run backend với debug logging:

```bash
cd backend
set RUST_LOG=debug
cargo run
```

Hoặc nếu đã chạy, check logs hiện tại.

### 2. Trigger Autocomplete

Gõ lại:

```sql
SELECT id, FROM account.user_referrals;
```

Đặt cursor sau dấu phẩy và trigger autocomplete.

### 3. Tìm Trong Logs

Tìm các dòng sau:

```
INFO  Autocomplete request - sql: '...', cursor: 11
DEBUG Autocomplete context: Select, Aliases found: {...}
```

**QUAN TRỌNG**: Check xem `Aliases found:` có rỗng `{}` không?

### 4. Nếu Aliases Rỗng `{}`

→ Parser không extract được table từ FROM clause  
→ Cần debug parser

### 5. Nếu Aliases Có Data `{"user_referrals": "account.user_referrals"}`

Tìm tiếp:

```
DEBUG Processing X table aliases for column suggestions
DEBUG Fetching columns for alias 'user_referrals' -> table 'account.user_referrals'
```

- Nếu thấy `WARN Failed to fetch columns` → Schema cache rỗng, cần refresh
- Nếu thấy `DEBUG Found 0 columns` → Table không có columns hoặc database name sai
- Nếu thấy `DEBUG Found 10 columns` → Columns được fetch nhưng bị filter/rank sai

## Khả Năng Cao Nhất

Dựa vào code review, tôi nghĩ vấn đề là:

**Schema cache chưa được refresh cho schema "account"**

Vì:

1. Parser code trông đúng (extract aliases từ ALL tokens)
2. Engine code trông đúng (add columns với score 800)
3. Nhưng nếu `get_columns` return empty → không có suggestions

## Quick Test

Refresh schema manually:

```bash
# Trong app, click vào connection
# Chọn "Refresh Schema"
# Hoặc call API:
curl -X POST http://localhost:3000/api/connections/{uuid}/refresh_schema \
  -H "Content-Type: application/json" \
  -d '{"scope": "all"}'
```

Sau đó test lại autocomplete.

## Share Logs

Sau khi có logs, share đoạn log từ lúc trigger autocomplete để tôi có thể debug chính xác.

Tìm từ:

```
INFO  Autocomplete request
```

đến

```
INFO  Returning X suggestions
```

Copy toàn bộ đoạn đó.
