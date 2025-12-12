# Documentation

This folder contains implementation documentation and guides for the dbplus project.

## Contents

- **keyboard-shortcuts.md** - Guide for advanced keyboard shortcuts in the query editor
- **QUERY_EDITOR_ROADMAP.md** - Feature roadmap for query editor enhancements
- **API.md** - API documentation
- **DESIGN_SYSTEM.md** - UI Design System documentation
- **DESIGN_SYSTEM_GRUVBOX.md** - Gruvbox theme documentation
- **POSTGRES_TYPE_FIX.md** - Documentation on Postgres numeric type fix
- **git-push-fix.md** - Git push troubleshooting guide
- **task.md** - Project tasks
- **Other implementation plans and fix logs**

## Recent Implementations

### Advanced Keyboard Shortcuts ✅
- Cmd+/: Comment/uncomment
- Cmd+D: Duplicate line
- Cmd+Shift+E: Execute selection
- Cmd+L: Select line
- Cmd+Shift+K: Delete line
- Cmd+]: Indent
- Cmd+[: Outdent

### Performance Optimizations ✅
- Debounced auto-save (reduces localStorage I/O by ~90%)
- Fixed NUMERIC(12,2) parsing for PostgreSQL

## Testing

All features are implemented and ready for testing. The frontend dev server should be running on `http://localhost:1420/`.
