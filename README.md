# DBPlus - Modern Database Client

DBPlus is a high-performance, secure, and intuitive database client built with **Rust** (backend) and **React/TypeScript** (frontend), powered by **Tauri**.

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

2.  Install frontend dependencies:
    ```bash
    cd frontend
    npm install
    ```

## Development

To start the application in development mode (with hot-reloading for both frontend and backend):

```bash
cd frontend
npm run tauri dev
```

This command will:

1.  Start the React dev server (Vite).
2.  Compile the Rust backend.
3.  Launch the Tauri application window.

## Building for Production

To build the optimized executable for your operating system:

### Windows (.exe / .msi)

1.  Navigate to the frontend directory:

    ```bash
    cd frontend
    ```

2.  Run the build command:

    ```bash
    npm run tauri build
    ```

3.  **Output**: The installer will be located at:
    `frontend/src-tauri/target/release/bundle/nsis/` (for .exe)
    `frontend/src-tauri/target/release/bundle/msi/` (for .msi)

### macOS (.dmg / .app)

1.  Navigate to the frontend directory:

    ```bash
    cd frontend
    ```

2.  Run the build command:

    ```bash
    npm run tauri build
    ```

3.  **Output**: The disk image will be located at:
    `frontend/src-tauri/target/release/bundle/dmg/`

### Linux (.deb / .AppImage)

1.  Navigate to the frontend directory:

    ```bash
    cd frontend
    ```

2.  Run the build command:

    ```bash
    npm run tauri build
    ```

3.  **Output**: The bundle will be located at:
    `frontend/src-tauri/target/release/bundle/deb/` (or AppImage)

## Troubleshooting

- **"Cannot find module..."**: Ensure you have run `npm install` in the `frontend` directory.
- **Rust compilation errors**: Ensure your Rust installation is up to date (`rustup update`).
- **Tauri errors**: Check the [Tauri Documentation](https://tauri.app/v1/guides/) for platform-specific requirements.
