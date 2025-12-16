# DBPlus - Modern Database Client

DBPlus is a high-performance, secure, and intuitive database client built with **Rust** (backend) and **React/TypeScript** (frontend), powered by **Tauri**.

## ✨ Features

- 🚀 **High Performance** - Built with Rust for maximum speed and efficiency
- 🔒 **Secure** - Local-first architecture, your data never leaves your machine
- 🎨 **Modern UI** - Beautiful, intuitive interface with dark/light mode
- 🔇 **Silent Backend** - Backend runs in the background without console windows (Windows)
- 💾 **Multi-Database Support** - PostgreSQL, SQLite, and more
- 📊 **Query Editor** - Advanced SQL editor with syntax highlighting and auto-completion

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or later)
- **Rust** (latest stable release)
- **Build Tools**:
  - **Windows**: Microsoft Visual Studio C++ Build Tools.
  - **macOS**: Xcode Command Line Tools (`xcode-select --install`).
  - **Linux**: `build-essential`, `libwebkit2gtk-4.0-dev`, `libssl-dev`, `libgtk-3-dev`, `libayatana-appindicator3-dev`, `librsvg2-dev`.

## Setup & Installation

1.  Clone the repository:

    ```bash
    git clone https://github.com/yourusername/dbplus.git
    cd dbplus
    ```

2.  Install frontend dependencies (pnpm workspace):
    ```bash
    pnpm install
    ```

## Development

To start the application in development mode (with hot-reloading for both frontend and backend):

```bash
pnpm tauri:dev
```

This command will:

1.  Start the React dev server (Vite).
2.  Compile the Rust backend.
3.  Launch the Tauri application window.

## Building for Production

To build the optimized executable for your operating system:

### Windows (.exe / .msi)

1.  Run the build command:

    ```bash
    pnpm --dir frontend build:windows
    ```

2.  **Output**: The installer will be located at:
    `frontend/src-tauri/target/release/bundle/nsis/` (for .exe)
    `frontend/src-tauri/target/release/bundle/msi/` (for .msi)

3.  **Note**: The backend will run silently in the background without showing a console window. See [`backend/SIDECAR_CONFIG.md`](./backend/SIDECAR_CONFIG.md) for details.

### macOS (.dmg / .app)

1.  Run the build command (this bundles the backend automatically):

    ```bash
    pnpm build:dmg
    ```

2.  **Output**: The disk image will be located at:
    `frontend/src-tauri/target/release/bundle/dmg/`

### Linux (.deb / .AppImage)

1.  Run the build command:

    ```bash
    pnpm --dir frontend tauri build
    ```

2.  **Output**: The bundle will be located at:
    `frontend/src-tauri/target/release/bundle/deb/` (or AppImage)

## Troubleshooting

- **"Cannot find module..."**: Ensure you have run `pnpm install` at the repo root (or in `frontend`).
- **Rust compilation errors**: Ensure your Rust installation is up to date (`rustup update`).
- **Tauri errors**: Check the [Tauri Documentation](https://tauri.app/v1/guides/) for platform-specific requirements.
