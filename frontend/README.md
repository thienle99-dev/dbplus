# DBPlus Frontend

Modern database client frontend built with **Tauri**, **React**, and **TypeScript**.

## 🚀 Tech Stack

- **Framework**: Tauri v2
- **UI Library**: React 19
- **Language**: TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS
- **Code Editor**: CodeMirror 6
- **State Management**: Zustand
- **Data Fetching**: TanStack Query

## 📁 Project Structure

```
frontend/
├── docs/              # Documentation files
├── scripts/           # Utility scripts
├── src/              # Source code
│   ├── components/   # React components
│   ├── hooks/        # Custom React hooks
│   ├── lib/          # Utility libraries
│   ├── pages/        # Page components
│   └── stores/       # Zustand stores
├── src-tauri/        # Tauri backend
└── public/           # Static assets
```

## 📚 Documentation

All documentation has been organized in the [`docs/`](./docs/) directory:

- **Design System**: [TABLEPLUS_DESIGN_SYSTEM.md](./docs/TABLEPLUS_DESIGN_SYSTEM.md)
- **Theme Reference**: [THEME_COLORS_REFERENCE.md](./docs/THEME_COLORS_REFERENCE.md)
- **UI Improvements**: [UI_IMPROVEMENTS.md](./docs/UI_IMPROVEMENTS.md)
- **Full Index**: [docs/INDEX.md](./docs/INDEX.md)

## 🛠️ Development

### Prerequisites

- Node.js v18+
- Rust (latest stable)
- Platform-specific build tools (see main README)

### Quick Start

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build
```

### Available Scripts

See [`scripts/README.md`](./scripts/README.md) for utility scripts documentation.

## 🎨 Design System

This project follows a comprehensive design system inspired by TablePlus. Key features:

- **Dark/Light Mode**: Full theme support
- **Consistent Colors**: Semantic color tokens
- **Accessible**: WCAG AA compliant contrast ratios
- **Modern UI**: Glassmorphism and smooth animations

## 🔧 Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/)
- [Tauri Extension](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode)
- [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
- [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
- [Tailwind CSS IntelliSense](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss)
