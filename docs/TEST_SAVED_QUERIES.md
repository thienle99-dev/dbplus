# 🧪 Test Saved Query Loading - Quick Steps

## Đã thêm debug logs vào code!

Bây giờ hãy test và xem console logs:

### 1. Mở Browser Console
- Press `F12` hoặc `Cmd+Option+I` (Mac)
- Chọn tab **Console**

### 2. Click vào Saved Queries Icon
- Click icon 📖 (bookmark) ở sidebar bên trái
- Xem console có log gì:

**Expected:**
```
[SavedQueriesList] Fetching saved queries for connection: <uuid>
[SavedQueriesList] Received queries: [...]
```

### 3. Click vào một saved query
- Click vào bất kỳ query nào trong list
- Xem console có logs:

**Expected:**
```
[SavedQueriesList] Query clicked: "Query Name" "SELECT ..."
[QueryTabs] handleLoadQuery called: { sql: "SELECT ...", metadata: {...}, activeTabId: "..." }
[QueryEditor] initialSql/Metadata changed: { initialSql: "SELECT ...", initialMetadata: {...} }
```

## Các trường hợp có thể xảy ra:

### Case 1: "No saved queries found"
**Nghĩa là**: Bạn chưa có saved queries
**Fix**: 
1. Viết một query: `SELECT 1;`
2. Click button "Save"
3. Đặt tên: "Test Query"
4. Save
5. Thử lại

### Case 2: Console log "Received queries: []"
**Nghĩa là**: API trả về empty array
**Fix**: Tạo saved query mới (như Case 1)

### Case 3: Console log error khi fetch
**Nghĩa là**: Backend API có vấn đề
**Check**: Backend có đang chạy không? (`cargo run`)

### Case 4: Không có log "[SavedQueriesList] Query clicked"
**Nghĩa là**: Click handler không fire
**Possible causes**:
- Không có queries để click
- UI bị block
- Event listener issue

### Case 5: Có log "Query clicked" nhưng không có "handleLoadQuery called"
**Nghĩa là**: `onSelectQuery` prop không được pass đúng
**This is a bug** - báo lại kèm logs

### Case 6: Có tất cả logs nhưng editor không update
**Nghĩa là**: State update nhưng UI không re-render
**This is a bug** - báo lại kèm logs

## Hãy test và cho tôi biết:

1. **Bạn thấy log nào trong console?**
2. **Có saved queries trong list không?**
3. **Click vào query có log gì xuất hiện?**

Screenshot console logs sẽ rất hữu ích! 📸
