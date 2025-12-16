# DBPlus

DBPlus là ứng dụng database client (giống TablePlus) chạy local, gồm:
- Backend: Rust (Axum) chạy ở `http://127.0.0.1:19999`
- Frontend: Tauri + React/TypeScript

## Tính năng chính
- Quản lý connections (PostgreSQL, SQLite)
- Query editor + chạy query + streaming kết quả lớn (NDJSON)
- Schema explorer + Table viewer + sửa/xóa row từ result
- Lưu query / lịch sử query / dashboards cơ bản
- SQLite nâng cấp: chọn file DB, recent list, ATTACH databases, PRAGMA tools (integrity check / vacuum / analyze)

## Yêu cầu
- Node.js `>= 18`
- `pnpm` (khuyến nghị, repo dùng pnpm workspace)
- Rust stable (toolchain mới)
- Tauri prerequisites theo OS:
  - macOS: `xcode-select --install`
  - Windows: Visual Studio C++ Build Tools
  - Linux: xem yêu cầu của Tauri/WebKitGTK (`libwebkit2gtk`, `libgtk-3`, `libssl`, …)

## Cài đặt
```bash
pnpm install
```

## Chạy dev (khuyến nghị)
Chạy full app (frontend + sidecar backend):
```bash
pnpm tauri:dev
```

Chạy chỉ frontend (Vite):
```bash
pnpm dev
```

Chạy chỉ backend (dùng khi debug API):
```bash
export ENCRYPTION_KEY="$(openssl rand -base64 32)"
cargo run --manifest-path backend/Cargo.toml -- ./.tmp/dbplus.db
```

Ghi chú:
- Backend dùng SQLite để lưu metadata (connections, history, saved queries, …) vào file DB mà bạn truyền vào (vd `./.tmp/dbplus.db`).
- `ENCRYPTION_KEY` là base64 của 32 bytes (AES-256-GCM). Nếu không set, backend sẽ tự generate tạm thời (không phù hợp production vì restart sẽ không decrypt được password cũ).

## Build release
Build nhanh (web assets):
```bash
pnpm build
```

Build Tauri bundle (macOS DMG trên Apple Silicon):
```bash
pnpm build:dmg
```

Build Tauri bundle theo OS:
```bash
pnpm --dir frontend tauri build
```

Output thường nằm ở `frontend/src-tauri/target/release/bundle/`.

## Sử dụng SQLite
- Tạo connection type `SQLite` và chọn file bằng nút `Browse...` (hoặc để trống = `:memory:`).
- Attach thêm database: trong panel `Schemas`, bấm `+` (SQLite) để chọn file và đặt schema name.
- Detach database đã attach: bấm icon thùng rác ở schema đó.
- SQLite tools: bấm icon cờ-lê để chạy `PRAGMA integrity_check`, `VACUUM`, `ANALYZE`, hoặc nhập PRAGMA/SQL tùy ý.

## Sử dụng PostgreSQL (dev nhanh bằng Docker)
Repo có docker compose cho Postgres:
```bash
docker compose -f dev/postgres/docker-compose.yml up -d
```

## Kiểm tra nhanh (Phase 10 verify)
```bash
./scripts/phase10_verify.sh
```

## Tài liệu
- Các ghi chú/plan nằm trong `docs/` (xem `docs/task.md`, `docs/API.md`, `docs/QUERY_EDITOR_ROADMAP.md`).

## Troubleshooting
- `Failed to run migrations`: kiểm tra file DB backend và quyền ghi; xoá file DB test trong `./.tmp` để tạo lại.
- Frontend lỗi type/module: chạy lại `pnpm install`.
- Rust build lỗi: `rustup update` và đảm bảo đủ prerequisites của Tauri trên OS.
