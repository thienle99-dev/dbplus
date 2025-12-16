## Quy trình build & release DBPlus Desktop

File này mô tả cách build app Tauri và tạo bản phát hành (Release) trên GitHub với các file cài đặt cho macOS (.dmg) và Windows (.exe).

---

## 1. Chuẩn bị

- Đảm bảo đã cài đủ toolchain:
  - Rust, Cargo
  - Node.js + pnpm
  - Tauri CLI (`pnpm add -D @tauri-apps/cli` đã có trong project)
- Backend và frontend đều build được bình thường.

Cấu trúc quan trọng:

- Config Tauri: `frontend/src-tauri/tauri.conf.json`
- Script build: `frontend/package.json`
- Thư mục chứa file build cuối:
  - `output/macos/` cho file `.dmg`
  - `output/windows/` cho file `.exe`

---

## 2. Build bản macOS (.dmg)

Chạy trên máy macOS.

Trong thư mục `frontend`:

```bash
cd frontend
pnpm run build:dmg
```

Script này sẽ:

1. Build backend ở chế độ `release`.
2. Copy binary backend vào `frontend/src-tauri/binaries/` với tên phù hợp cho macOS.
3. Chạy `tauri build --target aarch64-apple-darwin` để tạo bundle.
4. Copy file `.dmg` Tauri tạo ra vào thư mục:
   - `output/macos/DBPlus-<version>-macos.dmg`
   - `<version>` được lấy từ `frontend/package.json` (ví dụ `0.1.0`).

Sau khi chạy xong, kiểm tra:

```bash
ls output/macos
# Kỳ vọng thấy: DBPlus-0.1.0-macos.dmg
```

---

## 3. Build bản Windows (.exe)

Chạy trên máy Windows.

Trong thư mục `frontend`:

```powershell
cd frontend
pnpm run build:windows
```

Script này sẽ:

1. Tạo thư mục `src-tauri\binaries` nếu chưa có.
2. Build backend ở chế độ `release` bằng Cargo.
3. Copy binary backend vào `frontend\src-tauri\binaries\dbplus-backend-x86_64-pc-windows-msvc.exe`.
4. Chạy `tauri build` để tạo installer `.exe`.
5. Copy file `.exe` mà Tauri tạo ra vào thư mục:
   - `output\windows\`

Sau khi chạy xong, kiểm tra:

```powershell
Get-ChildItem output\windows
# Kỳ vọng thấy file .exe installer của DBPlus
```

(Tên chính xác của file `.exe` phụ thuộc vào cấu hình bundle của Tauri.)

---

## 4. Tạo GitHub Release (thủ công)

1. **Push code**
   - Đảm bảo mọi thay đổi đã được commit và push lên branch (thường là `main`).

2. **Build artifact cho từng nền tảng**
   - Trên macOS: chạy `pnpm run build:dmg` → kiểm tra `output/macos/`.
   - Trên Windows: chạy `pnpm run build:windows` → kiểm tra `output/windows/`.

3. **Tạo Release trên GitHub**
   - Vào trang repo trên GitHub.
   - Mở tab **Releases**.
   - Bấm **"Draft a new release"**.
   - **Tag version**:
     - Nếu chưa có tag: nhập (ví dụ) `v0.1.0` → chọn **Create new tag on publish**.
     - Chọn branch target, thường là `main`.
   - **Title**: ví dụ `v0.1.0 – First desktop release`.
   - **Description**: liệt kê các thay đổi chính.

4. **Đính kèm file build**
   - Kéo-thả file từ local vào phần **Attach binaries**:
     - macOS: `output/macos/DBPlus-0.1.0-macos.dmg`
     - Windows: file `.exe` trong `output/windows/`.

5. **Publish**
   - Bấm **Publish release**.
   - Sau khi xong, GitHub sẽ hiển thị link tải `.dmg` và `.exe` trong trang Release.

---

## 5. (Tuỳ chọn) Tạo release bằng `gh` CLI

Nếu có cài GitHub CLI (`gh`) và đã login (`gh auth login`), có thể tự động hoá bước attach file.

Ví dụ (chạy từ root repo, sau khi đã build và có file trong `output/`):

```bash
VERSION=0.1.0

gh release create v$VERSION \
  output/macos/DBPlus-$VERSION-macos.dmg \
  output/windows/DBPlus-$VERSION-windows.exe \
  --title "v$VERSION" \
  --notes "Release DBPlus desktop v$VERSION"
```

Lưu ý: tên file `.exe` ở trên chỉ là ví dụ, cần sửa lại đúng với tên thực tế trong `output/windows/`.

---

## 6. Checklist nhanh trước khi release

- [ ] Đã cập nhật version trong `frontend/package.json` (nếu cần).
- [ ] Backend build `cargo build --release` OK.
- [ ] `pnpm run build:dmg` thành công, có file `.dmg` trong `output/macos/`.
- [ ] `pnpm run build:windows` thành công, có file `.exe` trong `output/windows/`.
- [ ] Đã test nhanh bản macOS và Windows.
- [ ] Đã tạo GitHub Release với đúng tag/version và đính kèm đủ file.
