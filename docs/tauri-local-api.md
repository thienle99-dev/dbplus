# Tauri Internal Bundling

Migration Plan

## Overview

Convert the application from HTTP server architecture to Tauri's internal bundling approach:

- **Frontend**: Bundle React as static assets loaded via `tauri://localhost` (no Vite dev server port)

- **Backend**: Convert HTTP handlers to Tauri IPC commands (no HTTP port 19999)

- **Communication**: Replace all axios HTTP calls with Tauri `invoke()` calls

## Current Architecture

```javascript
┌─────────────┐         HTTP (port 19999)         ┌──────────────┐
│   React     │ ────────────────────────────────> │ Rust Backend │
│  (Vite 1420)│ <────────────────────────────────  │  (Axum HTTP) │
└─────────────┘                                    └──────────────┘
      │                                                    │
      └────────────────────────────────────────────────────┘
                    Tauri (spawns backend process)
```



## Target Architecture

```javascript
┌─────────────────────────────────────────────────────────┐
│                    Tauri Process                        │
│  ┌─────────────┐              ┌──────────────────────┐ │
│  │   React     │              │   Rust Backend       │ │
│  │ (Static)    │ ── IPC ───>  │  (Tauri Commands)    │ │
│  │tauri://...  │              │  (Shared State)      │ │
│  └─────────────┘              └──────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```



## Implementation Steps

### Phase 1: Tauri Configuration & Frontend Bundling

**Files to modify:**

- `frontend/src-tauri/tauri.conf.json` - Update build config

- `frontend/vite.config.ts` - Remove dev server config, keep build only

- `frontend/package.json` - Update scripts if needed

**Changes:**

1. Update `tauri.conf.json`:

- Remove `beforeDevCommand` and `devUrl` (no dev server)

- Keep `beforeBuildCommand` and `frontendDist`

- Frontend will load from `tauri://localhost` automatically

2. Update `vite.config.ts`:

- Remove `server` config (no dev server needed)

- Keep `build` configuration

- Remove proxy configuration

3. Update build scripts:

- Dev mode: Build frontend once, then `tauri dev` loads from dist

- Or use Tauri's built-in dev mode with file watching

### Phase 2: Backend Integration into Tauri

**Files to modify:**

- `frontend/src-tauri/src/lib.rs` - Main Tauri setup

- `frontend/src-tauri/src/commands.rs` - Convert handlers to commands

- `frontend/src-tauri/Cargo.toml` - Add backend dependencies

- `backend/src/main.rs` - Extract server logic to library

- Create `backend/src/lib.rs` - Export handlers and state

**Changes:**

1. **Create backend library** (`backend/src/lib.rs`):

- Extract AppState initialization

- Export handler functions (convert from Axum handlers to regular functions)

- Keep database connection and migrations logic

2. **Convert handlers to Tauri commands**:

- Each Axum handler becomes a `#[tauri::command]` function

- Replace `State<AppState>` with Tauri `State<AppState>`

- Replace `Path`, `Query`, `Json` extractors with function parameters

- Return `Result<T, String>` instead of `impl IntoResponse`

3. **Update Tauri lib.rs**:

- Add backend as dependency in Cargo.toml

- Initialize AppState in Tauri setup

- Register all command handlers

- Remove backend process spawning logic

4. **State management**:

- Move `AppState` to shared location (or keep in backend, import in Tauri)

- Use Tauri's `State` for dependency injection

- Initialize database connection in Tauri setup

### Phase 3: Frontend API Layer Replacement

**Files to modify:**

- `frontend/src/services/api.ts` - Replace with Tauri invoke wrapper

- All service files: `connectionApi.ts`, `historyApi.ts`, `snippetApi.ts`, `settingsApi.ts`, `sessionApi.ts`

- Update all components using `api.get/post/put/delete`

**Changes:**

1. **Create new API wrapper** (`frontend/src/services/api.ts`):
   ```typescript
      import { invoke } from '@tauri-apps/api/core';
      
      export const api = {
        get: (url: string, params?: any) => invoke('api_get', { url, params }),
        post: (url: string, data?: any) => invoke('api_post', { url, data }),
        put: (url: string, data?: any) => invoke('api_post', { url, data }),
        delete: (url: string) => invoke('api_delete', { url }),
        patch: (url: string, data?: any) => invoke('api_patch', { url, data }),
      };
   ```




2. **Alternative: Direct command mapping**:

- Create Tauri commands that match API routes

- Update each service file to use specific `invoke()` calls

- Example: `invoke('list_connections')` instead of `api.get('/api/connections')`

3. **Update service files**:

- Replace `api.get/post/put/delete` with Tauri `invoke()` calls

- Maintain same function signatures for components

- Update error handling (Tauri returns `Result<T, String>`)

### Phase 4: Command Registration & Routing

**Files to create/modify:**

- `frontend/src-tauri/src/commands/mod.rs` - Organize commands by module

- Individual command modules matching backend handlers

**Structure:**

```javascript
commands/
  mod.rs           - Re-export all commands
  connection.rs    - Connection management commands
  query.rs         - Query execution commands
  schema.rs        - Schema operations
  history.rs       - Query history
  ... (match backend handlers structure)
```



**Command naming:**

- Option A: Generic router (`api_get`, `api_post`) - simpler but less type-safe

- Option B: Specific commands (`list_connections`, `create_connection`) - more type-safe, better IDE support

### Phase 5: Error Handling & Response Format

**Changes:**

1. **Standardize error format**:

- Backend handlers return `Result<T, String>` or custom error type

- Tauri commands return `Result<T, String>`

- Frontend handles errors consistently

2. **Update interceptors**:

- Remove axios interceptors

- Add Tauri error handling wrapper if needed
- Maintain logging functionality

### Phase 6: Testing & Cleanup

**Tasks:**

1. Remove HTTP server code from backend

2. Remove backend binary building from build scripts

3. Remove `externalBin` from `tauri.conf.json`

4. Update documentation

5. Test all API endpoints work via IPC

6. Verify multi-window support works correctly

## Key Considerations

### State Management

- `AppState` needs to be accessible to all Tauri commands

- Use Tauri's `State<T>` for dependency injection

- Database connection is shared across all commands

### Command Organization

- ~50+ API endpoints need conversion

- Group related commands in modules

- Maintain same API surface for frontend (ease migration)

### Development Workflow

- Dev mode: Build frontend, then `tauri dev` (or use Tauri's file watching)

- No need for separate backend process

- Hot reload may be slower (full rebuild vs HMR)

### Type Safety

- Tauri commands are type-safe (Rust ↔ TypeScript)

- Consider generating TypeScript types from Rust command signatures

- Use `tauri-specta` or similar for type generation

## Migration Strategy

### Incremental Approach (Recommended)

1. Keep HTTP server working during migration

2. Convert one handler module at a time

3. Update corresponding frontend service

4. Test before moving to next module

5. Remove HTTP server only after all commands migrated

### Big Bang Approach

1. Convert all handlers to commands

2. Update all frontend services

3. Test everything at once

4. Higher risk but faster completion

## Files Summary

**Backend (convert to library):**

- `backend/src/main.rs` → Extract to `lib.rs`

- `backend/src/handlers/*.rs` → Convert to Tauri commands

- `backend/src/app_state.rs` → Use in Tauri State

**Tauri (integrate backend):**

- `frontend/src-tauri/src/lib.rs` - Setup and command registration

- `frontend/src-tauri/src/commands/*.rs` - All command implementations

- `frontend/src-tauri/Cargo.toml` - Add backend dependency

**Frontend (replace API layer):**

- `frontend/src/services/api.ts` - Tauri invoke wrapper

- `frontend/src/services/*.ts` - Update all service files

- `frontend/vite.config.ts` - Remove server config

- `frontend/src-tauri/tauri.conf.json` - Update build config

## Benefits After Migration

- ✅ No port conflicts (no HTTP server)

- ✅ Better multi-window support (native IPC)

- ✅ Faster communication (no HTTP overhead)

- ✅ Simpler deployment (single binary)
- ✅ Better security (no network exposure)