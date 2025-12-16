# ✨ Query Editor - Enhanced Features

## 🎯 Tính Năng Thực Thi Query Được Chọn

### Cách Sử Dụng

#### 1. **Chạy Toàn Bộ Query**
- Nhấn nút **"Run"** hoặc `Cmd/Ctrl + Enter`
- Tất cả SQL trong editor sẽ được thực thi

#### 2. **Chạy Chỉ Phần Được Chọn** ⭐ NEW
- **Bước 1**: Bôi đen (select) phần SQL bạn muốn chạy
- **Bước 2**: Nhấn nút **"Run Selection"** hoặc `Cmd/Ctrl + Enter`
- Chỉ phần được chọn sẽ được thực thi

### 📊 Visual Feedback

#### Button States
- **"Run"** - Khi không có text được chọn
- **"Run Selection"** - Khi có text được chọn
- **"Running..."** - Đang thực thi query
- Icon Play sẽ pulse khi đang chạy

#### Tooltips
- Hover vào button Run để xem hướng dẫn nhanh
- Tooltip sẽ thay đổi dựa trên trạng thái selection

#### Toast Notifications
- "Executing selected query..." - Khi chạy selection
- "Query executed successfully" - Khi thành công
- "Query execution failed" - Khi có lỗi

### 💡 Use Cases

#### 1. Test Từng Phần Query
```sql
-- Bạn có nhiều queries
SELECT * FROM users;

SELECT * FROM orders;

SELECT * FROM products;
```
**Cách dùng**: Chọn từng query một và chạy riêng lẻ để test

#### 2. Debug Query Phức Tạp
```sql
-- Query phức tạp với nhiều CTEs
WITH user_stats AS (
  SELECT user_id, COUNT(*) as order_count
  FROM orders
  GROUP BY user_id
),
high_value_users AS (
  SELECT * FROM user_stats WHERE order_count > 10
)
SELECT * FROM high_value_users;
```
**Cách dùng**: Chọn từng CTE để kiểm tra kết quả trung gian

#### 3. Chạy Một Phần Của Query Dài
```sql
SELECT 
  u.id,
  u.name,
  u.email,
  COUNT(o.id) as order_count,
  SUM(o.total) as total_spent
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.created_at > '2024-01-01'
GROUP BY u.id, u.name, u.email
HAVING COUNT(o.id) > 5
ORDER BY total_spent DESC
LIMIT 100;
```
**Cách dùng**: Chọn chỉ phần SELECT để xem columns, hoặc chỉ WHERE clause để test filter

### ⚠️ Dangerous Query Detection

Khi chạy query nguy hiểm (DROP, DELETE, TRUNCATE, UPDATE, ALTER), hệ thống sẽ:
1. Hiển thị modal xác nhận
2. Yêu cầu bạn confirm trước khi thực thi
3. Áp dụng cho cả full query và selected query

### ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + Enter` | Run query (full hoặc selection) |
| `Cmd/Ctrl + S` | Save query |
| Mouse select + `Cmd/Ctrl + Enter` | Run selected text |

### 🎨 Visual Indicators

#### Selection Highlighting
- Text được chọn sẽ có background màu nhạt
- Dark mode: Light pink selection (#FCE7F3)
- Light mode: Light pink selection (#FCE7F3)

#### Button Animation
- Icon Play sẽ pulse khi đang thực thi
- Button text thay đổi theo trạng thái
- Smooth transitions cho tất cả state changes

### 📝 Tips & Best Practices

1. **Multi-statement Testing**
   - Tách các statements bằng dấu `;`
   - Select từng statement để test riêng

2. **Performance Testing**
   - Chọn chỉ phần SELECT để test query plan
   - Thêm EXPLAIN trước query được chọn

3. **Data Exploration**
   - Chọn và chạy các phần khác nhau của query
   - Dễ dàng so sánh kết quả

4. **Safe Execution**
   - Test SELECT trước khi chạy UPDATE/DELETE
   - Chọn WHERE clause để verify điều kiện

### 🔄 How It Works

```typescript
// Khi nhấn Run button:
1. Kiểm tra có text được select không
2. Nếu có → lấy text được select
3. Nếu không → lấy toàn bộ query
4. Kiểm tra dangerous keywords
5. Thực thi query
6. Hiển thị kết quả
```

### 🎯 Example Workflow

```sql
-- Bước 1: Viết query
SELECT id, name, email FROM users WHERE status = 'active';

-- Bước 2: Select chỉ "SELECT id, name, email FROM users"
-- Bước 3: Cmd+Enter → Xem tất cả users

-- Bước 4: Select "SELECT id, name, email FROM users WHERE status = 'active'"
-- Bước 5: Cmd+Enter → Xem chỉ active users

-- Bước 6: Thêm LIMIT
SELECT id, name, email FROM users WHERE status = 'active' LIMIT 10;

-- Bước 7: Select toàn bộ → Cmd+Enter → Xem 10 active users đầu tiên
```

---

## 🚀 Additional Features

### Auto-save for Drafts
- Queries được auto-save mỗi 500ms
- Indicator "Draft - Auto-saved" hiển thị khi đang draft

### Visual/SQL Mode Toggle
- Switch giữa SQL editor và Visual Query Builder
- Dữ liệu được sync giữa 2 modes

### Query History
- Tất cả queries được lưu vào history
- Có thể load lại từ sidebar

---

**Enjoy coding! 🎉**
