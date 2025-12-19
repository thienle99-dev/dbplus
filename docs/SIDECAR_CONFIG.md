# Backend Sidecar Configuration

## Chạy Backend Ngầm (Hidden Console)

### Vấn đề

Khi chạy file `.exe` của DBPlus, backend sẽ mở một cửa sổ terminal/console riêng, gây khó chịu cho người dùng.

### Giải pháp

Đã cấu hình backend để chạy ngầm (background) mà không hiển thị console window.

## Các Thay Đổi Đã Thực Hiện

### 1. Cấu hình trong `backend/src/main.rs`

Thêm attribute `windows_subsystem = "windows"` để ẩn console:

```rust
// Hide console window on Windows when running as a sidecar
#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]
```

**Giải thích:**

- `cfg_attr` - Conditional attribute, chỉ áp dụng khi điều kiện đúng
- `not(debug_assertions)` - Chỉ áp dụng cho release builds (không áp dụng cho dev mode)
- `target_os = "windows"` - Chỉ áp dụng cho Windows
- `windows_subsystem = "windows"` - Compile dưới dạng Windows GUI app (không có console)

### 2. Tối ưu hóa trong `backend/Cargo.toml`

Thêm cấu hình release profile:

```toml
[profile.release]
opt-level = 3        # Tối ưu hóa tối đa
lto = true           # Link-time optimization
codegen-units = 1    # Tối ưu hóa cross-crate
strip = true         # Loại bỏ debug symbols
```

**Lợi ích:**

- File .exe nhỏ hơn
- Chạy nhanh hơn
- Không có debug symbols (bảo mật hơn)

## Cách Hoạt Động

### Development Mode (Debug)

```bash
pnpm tauri:dev
```

- Console window **VẪN HIỂN THỊ** để xem logs
- Dễ dàng debug và kiểm tra lỗi

### Production Mode (Release)

```bash
pnpm --dir frontend build:windows
```

- Console window **HOÀN TOÀN ẨN**
- Backend chạy ngầm trong background
- Chỉ hiển thị cửa sổ chính của DBPlus

## Kiểm Tra

### Trước khi build:

1. Đảm bảo code backend không có lỗi
2. Test trong dev mode trước

### Sau khi build:

1. Chạy file `.exe` từ `frontend/src-tauri/target/release/bundle/`
2. Kiểm tra:
   - ✅ Chỉ có cửa sổ DBPlus hiển thị
   - ✅ Không có cửa sổ console/terminal
   - ✅ Backend vẫn hoạt động bình thường (test kết nối database)

## Logging

Vì console bị ẩn, logs sẽ không hiển thị. Nếu cần debug:

### Option 1: Sử dụng File Logging

Thêm vào `backend/src/main.rs`:

```rust
use tracing_subscriber::fmt::writer::MakeWriterExt;
use std::fs::File;

// Log to file instead of console
let log_file = File::create("dbplus-backend.log").unwrap();
tracing_subscriber::fmt()
    .with_writer(log_file)
    .init();
```

### Option 2: Build với Debug Mode

```bash
# Build without hiding console (for debugging)
cd backend
cargo build --release
```

## Troubleshooting

### Backend không chạy sau khi build?

1. Kiểm tra file log (nếu đã cấu hình)
2. Build lại với debug mode để xem lỗi
3. Kiểm tra port 19999 có bị chiếm không

### Muốn thấy console trong release build?

Tạm thời comment out attribute trong `main.rs`:

```rust
// #![cfg_attr(
//     all(not(debug_assertions), target_os = "windows"),
//     windows_subsystem = "windows"
// )]
```

## Tham Khảo

- [Tauri Sidecar Documentation](https://tauri.app/v1/guides/building/sidecar)
- [Rust Windows Subsystem](https://doc.rust-lang.org/reference/linkage.html#the-link_args-attribute)
- [Cargo Profile Settings](https://doc.rust-lang.org/cargo/reference/profiles.html)
