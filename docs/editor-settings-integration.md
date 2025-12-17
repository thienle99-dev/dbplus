# Editor Settings Integration

## ✅ Đã hoàn thành

Tất cả Editor Settings từ Settings Modal đã được tích hợp vào Query Editor.

### Settings được áp dụng:

#### 1. **Font Size** (Kích thước font)
- **Setting**: `editorFontSize` (10-24px, mặc định 14px)
- **Áp dụng**: CodeMirror editor theme
- **Cách hoạt động**: Tạo dynamic theme với fontSize từ settings
- **File**: `useQueryCompletion.ts`

#### 2. **Tab Size** (Kích thước tab)
- **Setting**: `tabSize` (2-8 spaces, mặc định 2)
- **Áp dụng**: `indentUnit` extension
- **Cách hoạt động**: Sử dụng `indentUnit.of(" ".repeat(tabSize))`
- **File**: `useQueryCompletion.ts`

#### 3. **Word Wrap** (Xuống dòng tự động)
- **Setting**: `wordWrap` (boolean, mặc định true)
- **Áp dụng**: `EditorView.lineWrapping` extension
- **Cách hoạt động**: Conditionally add extension nếu enabled
- **File**: `useQueryCompletion.ts`

#### 4. **Line Numbers** (Hiển thị số dòng)
- **Setting**: `lineNumbers` (boolean, mặc định true)
- **Áp dụng**: `lineNumbers()` extension
- **Cách hoạt động**: Conditionally add extension nếu enabled
- **File**: `useQueryCompletion.ts`

#### 5. **Auto Complete** (Tự động hoàn thành)
- **Setting**: `autoComplete` (boolean, mặc định true)
- **Áp dụng**: `autocompletion()` extension
- **Cách hoạt động**: 
  - Nếu enabled: Sử dụng `autocompletion()` với `activateOnTyping: true`
  - Nếu disabled: Vẫn giữ schema completion nhưng không tự động trigger
- **File**: `useQueryCompletion.ts`

### Theme Support

Đã thêm hỗ trợ cho **macOS Dark** theme trong logic theme detection:

```typescript
const isDarkTheme =
  effectiveTheme === "dark" ||
  effectiveTheme === "midnight" ||
  effectiveTheme === "soft-pink" ||
  effectiveTheme === "macos-dark" ||  // ✅ MỚI
  effectiveTheme?.startsWith("wibu") ||
  effectiveTheme?.startsWith("gruvbox-dark");
```

## Cách kiểm tra

1. Mở **Settings** (⌘,)
2. Chuyển sang tab **Editor**
3. Thay đổi các settings:
   - **Font Size**: Thay đổi từ 10-24px → Font trong editor sẽ thay đổi ngay lập tức
   - **Tab Size**: Thay đổi từ 2-8 spaces → Nhấn Tab trong editor sẽ indent theo số spaces đã chọn
   - **Word Wrap**: Bật/tắt → Dòng dài sẽ wrap hoặc scroll ngang
   - **Line Numbers**: Bật/tắt → Số dòng sẽ hiện/ẩn bên trái editor
   - **Auto Complete**: Bật/tắt → Autocomplete popup sẽ hiện/ẩn khi gõ

## Technical Details

### Architecture

```
SettingsStore (Zustand)
    ↓
useQueryCompletion Hook
    ↓
CodeMirror Extensions
    ↓
QueryEditor Component
```

### Extensions Order

```typescript
[
  sql({ schema }),           // SQL language support
  codeMirrorTheme,          // Dark/Light theme
  transparentTheme,         // Transparent background
  autocompleteTheme,        // Autocomplete styling
  editorSettingsTheme,      // ✅ Font size
  completionKeymap,         // Keyboard shortcuts
  indentUnit,               // ✅ Tab size
  lineWrapping,             // ✅ Word wrap (conditional)
  lineNumbers,              // ✅ Line numbers (conditional)
  autocompletion,           // ✅ Auto complete (conditional)
]
```

### State Management

- Settings được lưu trong **localStorage** qua Zustand persist
- Mỗi khi settings thay đổi, `useQueryCompletion` hook sẽ re-compute extensions
- CodeMirror sẽ tự động update khi extensions array thay đổi

## Files Modified

1. `/frontend/src/components/query-editor/useQueryCompletion.ts`
   - Added imports: `EditorView`, `lineNumbers`, `indentUnit`, `autocompletion`, `useSettingsStore`
   - Added `editorSettingsTheme` for font size
   - Added conditional extensions for tab size, word wrap, line numbers, auto complete
   - Added macOS Dark theme detection

## Backward Compatibility

✅ Tất cả settings đều có giá trị mặc định hợp lý
✅ Không breaking changes cho existing code
✅ Settings được persist qua localStorage
