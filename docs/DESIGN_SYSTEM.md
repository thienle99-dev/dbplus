## Master prompt phong cách macOS Sonoma cho DBPlus

Bạn có thể dùng block này làm "master prompt" cho mọi task UI sau này (cho AI khác hoặc chính bạn), để giữ đúng style:

---

**Context project**

- App: DBPlus – desktop app quản lý database (Tauri + React + Tailwind, theme Gruvbox custom).
- Màu sắc đã có sẵn qua CSS variables / class Tailwind, ví dụ: `bg-bg-0`, `bg-bg-1`, `bg-bg-2`, `border-border`, `text-text-primary`, `text-text-secondary`, `text-text-tertiary`, `text-accent`, `bg-accent`.
- Yêu cầu: **giữ nguyên palette màu** hiện tại, chỉ chỉnh **bố cục, bo tròn, border, shadow, spacing, trạng thái hover/focus** theo vibe **macOS Sonoma**.

---

**Phong cách tổng thể (Option 1 – macOS Sonoma)**

- Cảm giác: **mềm mại, hiện đại, nhiều khoảng trắng**, ưu tiên **tính đọc được** hơn là màu mè.
- **Corners**: bo tròn vừa phải cho card/panel (`rounded-xl` đến `rounded-2xl`), nút dạng pill cho action chính (`rounded-full`).
- **Border & Shadow**:
- Dùng **border mỏng, nhạt** để phân tách panel: `border border-border/40` hoặc `border-border/60`.
- Shadow nhẹ, hơi blur: `shadow-[0_18px_40px_rgba(0,0,0,0.25)] `hoặc `shadow-lg/soft` tương đương.
- **Spacing**:
- Panel/container: `p-4 md:p-6`.
- Khoảng cách giữa section: `space-y-4` / `space-y-6`.
- Toolbar/header: chiều cao 40–44px (`h-10` hoặc `h-9`), padding ngang `px-3`–`px-4`.

---

**Quy ước component (nên tuân thủ)**

1. **Card / Panel / Modal body**

- Container mặc định:
 - `rounded-2xl bg-bg-1/95 border border-border/40 shadow-[0_18px_40px_rgba(0,0,0,0.25)]`
 - Bên trong dùng `p-4 md:p-6`.
- Modal lớn: có thể dùng `rounded-2xl`, padding `p-0` cho shell + các section nội bộ tự padding.

2. **Toolbar / Header khu vực**

- Thanh phía trên bảng, editor, danh sách…
- Class gợi ý:
 - `flex items-center justify-between h-10 px-3 border-b border-border/50 bg-bg-2/90`
 - Icon button: `h-7 w-7 rounded-full flex items-center justify-center text-text-secondary hover:bg-bg-3 hover:text-text-primary`.

3. **Button**

- **Primary (action chính)**
 - Hình dạng: pill, nổi vừa.
 - Class gợi ý:
 - `inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium`
 - Màu: `bg-accent text-bg-0 shadow-[0_0_0_1px_rgba(255,255,255,0.25)]`
 - Trạng thái: `hover:bg-accent/90 active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed`

- **Secondary (nút phụ / outline)**
 - `inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border border-border/60 bg-bg-2/80 text-text-secondary hover:bg-bg-3 hover:text-text-primary`

- **Ghost / subtle (toolbar action)**
 - `inline-flex items-center justify-center h-7 px-2 rounded-full text-text-secondary hover:bg-bg-3 hover:text-text-primary`

- **Destructive** (xoá / nguy hiểm)
 - `bg-red-500/90 text-bg-0 hover:bg-red-500 rounded-full px-4 py-1.5 text-sm font-medium`

4. **Input / Select / Textarea**

- Base input/select:
 - `w-full rounded-xl bg-bg-1/80 border border-border/60 px-3 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary`
 - Focus: `focus:outline-none focus:ring-2 focus:ring-accent/70 focus:border-accent/60`
- Disabled: `bg-bg-2/80 text-text-tertiary cursor-not-allowed`
- Error: thêm `border-red-500/80` và `focus:ring-red-500/60`.

5. **Table**

- **Wrapper**: `rounded-2xl bg-bg-1/95 border border-border/40 overflow-hidden shadow-[0_18px_40px_rgba(0,0,0,0.25)]`
- **Header row**:
 - `bg-bg-2/90 border-b border-border/70 text-xs font-semibold tracking-wide text-text-secondary`
- **Header cell**:
 - `px-3 py-2 text-left whitespace-nowrap`
- **Body row**:
 - `text-xs text-text-primary hover:bg-bg-2/70 transition-colors`
- **Striped**:
 - `odd:bg-bg-1/80 even:bg-bg-0/80`

6. **Badge / Tag (trạng thái)**

- Base badge:
 - `inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium`
- Success: `bg-green-500/10 text-green-400`
- Danger: `bg-red-500/10 text-red-400`
- Warning: `bg-yellow-500/10 text-yellow-400`

7. **Scroll & Misc**

- Tránh border quá đậm; ưu tiên `border-border/40`–`/60`.
- Hover state phải **rõ nhưng không gắt** (dùng `/70`, `/80` thay vì full color).

---

**Nguyên tắc khi chỉnh UI**

- Không đổi màu gốc (token màu giữ nguyên), chỉ đổi **shape + spacing + border + shadow**.
- Luôn dùng **cùng một biến thể button/input** cho các nơi giống nhau (không tuỳ tiện tạo class mới mỗi chỗ).
- Đặt ưu tiên: `layout → card/panel → toolbar → button → input → table → modal`.

---

## Kế hoạch áp dụng vào codebase

### Bước 1: Khảo sát các component UI lõi

- Xem qua các file chính trong frontend:
- `[frontend/src/components/ui]` (nếu có): `Button`, `Input`, `Select`, `Modal`, `Card`, `Table`.
- Các component cấp cao đang tự style: `TableDataView`, `QueryEditor`, `SchemaTree`, `ConnectionsDashboard`, v.v.
- Mục tiêu: xác định **1 nơi trung tâm** để định nghĩa style (ví dụ thư mục `components/ui/`).

### Bước 2: Định nghĩa chuẩn class cho từng loại component

- Từ master prompt trên, mapping thành **bộ class Tailwind** cụ thể cho:
- `Button` (variant: primary, secondary, ghost, destructive, icon-only).
- `Input`, `Textarea`, `Select`.
- `Card/Panel` (shell cho section, panel, modal body).
- `Table` (wrapper, header row, body row, cell, trạng thái hover/striped).
- `Toolbar` chung (header cho bảng, editor, danh sách).
- Ghi lại (có thể trong một file doc riêng hoặc comment ngắn) để các component khác tái sử dụng.

### Bước 3: Tạo/chuẩn hoá layer component UI dùng chung

- Nếu đã có `components/ui/Button.tsx` / `Input.tsx` / `Modal.tsx`, cập nhật chúng để dùng style macOS Sonoma.
- Nếu chưa có, tạo:
- `Button`: nhận `variant`, `size`, `icon` và dùng class từ master prompt.
- `Input`: bọc `<input>` nhưng gắn sẵn class base + trạng thái focus.
- `Panel/Card`: wrapper với border + shadow chuẩn.
- `TableShell`: wrapper + header row chuẩn.

### Bước 4: Refactor dần các màn hình chính

- Ưu tiên các màn hình nhiều traffic:
- Query editor & results.
- Schema explorer / tree / table details.
- Connection list / dashboard.
- Thay các class rời rạc bằng việc dùng `Button`, `Input`, `Panel`, `TableShell` đã chuẩn hoá.
- Giữ nguyên cấu trúc logic, chỉ thay đổi style/bố cục (padding, gap, border, shadow).

### Bước 5: Kiểm tra responsive & trạng thái

- Kiểm UI ở các kích thước: sidebar thu nhỏ, window nhỏ, modal dài.
- Kiểm tra:
- Hover/focus/disabled trên button và input.
- Scrollbar trong bảng lớn.
- Modal dài: nội dung có scroll thân thiện.

### Bước 6: Document & khoá style

- Cập nhật tài liệu (có thể trong `[docs/DESIGN_SYSTEM.md]` hoặc file mới) với:
- Screenshot nhanh của button, input, table theo style mới.
- Mapping: "khi cần nút hành động chính, dùng `Button variant="primary"`".
- Đính kèm **master prompt** này vào doc để mọi người (hoặc AI khác) dùng chung.