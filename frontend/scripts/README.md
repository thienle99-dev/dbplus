# Frontend Scripts

This directory contains utility scripts for the DBPlus frontend.

## Available Scripts

### `pad_icon.py`

Python script for padding and processing application icons.

**Usage:**

```bash
python scripts/pad_icon.py
```

**Purpose:**

- Processes icon files for different platforms
- Ensures proper padding and dimensions
- Prepares icons for Tauri bundling

## Adding New Scripts

When adding new scripts to this directory:

1. **Name Convention**: Use lowercase with underscores (e.g., `build_helper.py`)
2. **Documentation**: Add a brief description in this README
3. **Shebang**: Include appropriate shebang for shell scripts
4. **Permissions**: Make shell scripts executable on Unix systems

## Script Categories

### Build Scripts

- Scripts that assist with the build process

### Icon/Asset Processing

- `pad_icon.py` - Icon padding and processing

### Development Utilities

- Helper scripts for development workflow
