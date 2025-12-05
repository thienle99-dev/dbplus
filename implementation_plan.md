# Database Client Application - Implementation Plan

## Overview

Building a professional **native desktop database client** for Windows and macOS, similar to TablePlus. Features GUI for connecting to databases, browsing schemas, running queries, and viewing/editing data safely. Desktop-first with native OS integrations.

## User Review Required

> [!IMPORTANT]
> **Tech Stack Confirmation**
> - **Target Platforms**: Windows 10/11 + macOS 11+ (native desktop apps)
> - **Desktop Framework**: Tauri v1.5+ (Rust-based, native performance)
> - Frontend UI: React + TypeScript + Tailwind CSS
> - Backend: **Rust + Axum** (embedded in desktop app)
> - ORM: **SeaORM** for app's internal database (async, type-safe)
> - Database Support: PostgreSQL first, then MySQL/MariaDB
> - Auth: Local authentication (no server required)
> - **Performance**: Native speed, instant startup, 50-100MB RAM usage
> - **App Size**: ~3-5MB installers (vs 100MB+ for Electron)

> [!WARNING]
> **Security Considerations**
> - Local data storage encrypted at rest using **AES-256-GCM** (ring/RustCrypto)
> - Connection credentials encrypted in local database
> - SQL injection prevention through **parameterized queries** (tokio-postgres/sqlx)
> - Memory-safe Rust prevents buffer overflows
> - **Sandboxed file system access** via Tauri permissions
> - **No remote servers** - all data stays local
> - Rate limiting on query execution to prevent accidental DOS

> [!CAUTION]
> **Dangerous Operations Protection**
> - UPDATE/DELETE without WHERE clause requires explicit confirmation
> - Inline editing generates transactions with preview before execution
> - Connection deletion requires confirmation

## Proposed Changes

### Project Structure

```
dbplus/
├── backend/                              # Embedded backend (runs in Tauri)
│   ├── src/
│   │   ├── main.rs                       # Local server entry (localhost only)
│   │   ├── config/
│   │   │   ├── mod.rs
│   │   │   ├── database.rs               # SeaORM connection pool
│   │   │   ├── encryption.rs             # AES-256-GCM encryption
│   │   │   └── env.rs                    # App config (no .env needed)
│   │   ├── handlers/
│   │   │   ├── mod.rs
│   │   │   ├── connection.rs             # Connection CRUD
│   │   │   ├── query.rs                  # Query execution
│   │   │   ├── schema.rs                 # Schema introspection
│   │   │   ├── history.rs                # Query history
│   │   │   └── saved_query.rs            # Saved queries
│   │   ├── services/
│   │   │   ├── mod.rs
│   │   │   ├── connection_service.rs
│   │   │   ├── db_driver.rs              # Database driver trait
│   │   │   ├── postgres_driver.rs        # PostgreSQL implementation
│   │   │   ├── mysql_driver.rs           # MySQL (future)
│   │   │   ├── query_service.rs
│   │   │   ├── schema_service.rs
│   │   │   └── encryption_service.rs
│   │   ├── models/
│   │   │   ├── mod.rs
│   │   │   └── entities/                 # SeaORM entities
│   │   │       ├── mod.rs
│   │   │       ├── connection.rs
│   │   │       ├── saved_query.rs
│   │   │       └── query_history.rs
│   │   ├── routes/
│   │   │   ├── mod.rs
│   │   │   └── api.rs                    # Axum router setup
│   │   ├── utils/
│   │   │   ├── mod.rs
│   │   │   ├── validators.rs
│   │   │   └── sql_parser.rs
│   │   └── error.rs                      # Custom error types
│   ├── migration/                        # SeaORM migrations
│   │   ├── src/
│   │   │   ├── lib.rs
│   │   │   └── m20240101_000001_create_tables.rs
│   │   └── Cargo.toml
│   ├── Cargo.toml                        # Rust dependencies
│   └── Cargo.lock
│
├── frontend/                             # Tauri desktop app
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Input.tsx
│   │   │   │   ├── Modal.tsx
│   │   │   │   ├── Tabs.tsx
│   │   │   │   ├── DataGrid.tsx
│   │   │   │   └── Toast.tsx
│   │   │   ├── connections/
│   │   │   │   ├── ConnectionList.tsx
│   │   │   │   ├── ConnectionForm.tsx
│   │   │   │   └── ConnectionCard.tsx
│   │   │   ├── workspace/
│   │   │   │   ├── WorkspaceLayout.tsx
│   │   │   │   ├── SchemaTree.tsx
│   │   │   │   ├── QueryEditor.tsx
│   │   │   │   ├── ResultsPane.tsx
│   │   │   │   └── TabManager.tsx
│   │   │   ├── table-viewer/
│   │   │   │   ├── TableDataView.tsx
│   │   │   │   ├── EditableCell.tsx
│   │   │   │   └── ChangesSummary.tsx
│   │   │   └── queries/
│   │   │       ├── SavedQueriesList.tsx
│   │   │       ├── QueryHistory.tsx
│   │   │       └── SaveQueryModal.tsx
│   │   ├── pages/
│   │   │   ├── ConnectionsPage.tsx
│   │   │   └── WorkspacePage.tsx
│   │   ├── hooks/
│   │   │   ├── useConnections.ts
│   │   │   ├── useQuery.ts
│   │   │   ├── useSchema.ts
│   │   │   └── useTabs.ts
│   │   ├── services/
│   │   │   ├── tauri.ts                  # Tauri API wrapper
│   │   │   ├── connectionApi.ts
│   │   │   ├── queryApi.ts
│   │   │   └── schemaApi.ts
│   │   ├── store/
│   │   │   ├── index.ts                  # Zustand store
│   │   │   ├── connectionSlice.ts
│   │   │   ├── workspaceSlice.ts
│   │   │   └── tabSlice.ts
│   │   ├── types/
│   │   │   └── index.ts                  # TypeScript types
│   │   ├── utils/
│   │   │   ├── sqlFormatter.ts
│   │   │   ├── keyboardShortcuts.ts
│   │   │   └── validators.ts
│   │   ├── styles/
│   │   │   └── index.css                 # Tailwind + custom
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── vite-env.d.ts
│   ├── src-tauri/                        # Tauri Rust wrapper
│   │   ├── src/
│   │   │   ├── main.rs                   # Tauri app + window setup
│   │   │   └── lib.rs                    # Tauri commands (IPC)
│   │   ├── icons/                        # App icons (Windows/macOS)
│   │   ├── Cargo.toml                    # Tauri dependencies
│   │   └── tauri.conf.json               # Window config, permissions
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts                    # Vite + Tauri plugin
│   └── tailwind.config.js
│
└── README.md
```

---

### Backend Implementation

#### Database Schema (SeaORM)

**Note**: Desktop app stores data locally - no user accounts needed.

**[NEW] [connection.rs](file:///c:/Users/HP/Documents/dbplus/backend/src/models/entities/connection.rs)**

```rust
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "connections")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub name: String,
    pub db_type: String,
    pub host: String,
    pub port: i32,
    pub database: String,
    pub username: String,
    pub password: String,        // Encrypted
    pub ssl: bool,
    pub ssl_cert: Option<String>, // Encrypted
    pub last_used: Option<DateTimeWithTimeZone>,
    pub created_at: DateTimeWithTimeZone,
    pub updated_at: DateTimeWithTimeZone,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(has_many = "super::saved_query::Entity")]
    SavedQueries,
    #[sea_orm(has_many = "super::query_history::Entity")]
    QueryHistory,
}

impl ActiveModelBehavior for ActiveModel {}
```

**[NEW] [saved_query.rs](file:///c:/Users/HP/Documents/dbplus/backend/src/models/entities/saved_query.rs)**

```rust
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "saved_queries")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub connection_id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub sql: String,
    pub tags: Vec<String>,
    pub created_at: DateTimeWithTimeZone,
    pub updated_at: DateTimeWithTimeZone,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::connection::Entity",
        from = "Column::ConnectionId",
        to = "super::connection::Column::Id",
        on_delete = "Cascade"
    )]
    Connection,
}

impl ActiveModelBehavior for ActiveModel {}
```

**[NEW] [query_history.rs](file:///c:/Users/HP/Documents/dbplus/backend/src/models/entities/query_history.rs)**

```rust
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "query_history")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub connection_id: Uuid,
    pub sql: String,
    pub row_count: Option<i32>,
    pub execution_time: Option<i32>, // milliseconds
    pub success: bool,
    pub error_message: Option<String>,
    pub executed_at: DateTimeWithTimeZone,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::connection::Entity",
        from = "Column::ConnectionId",
        to = "super::connection::Column::Id",
        on_delete = "Cascade"
    )]
    Connection,
}

impl ActiveModelBehavior for ActiveModel {}
```

**Key Features:**
- Local-only data storage (SQLite or PostgreSQL)
- Encrypted connection credentials
- Query history with execution metrics
- Saved queries with tags and search
- No user accounts - single-user desktop app

**[NEW] [Cargo.toml](file:///c:/Users/HP/Documents/dbplus/backend/Cargo.toml)**

```toml
[package]
name = "dbplus-backend"
version = "0.1.0"
edition = "2021"

[dependencies]
# Embedded web server (localhost only)
axum = { version = "0.7", features = ["macros"] }
tower = "0.4"
tower-http = { version = "0.5", features = ["cors"] }

# Async runtime
tokio = { version = "1", features = ["full"] }

# Database
sea-orm = { version = "0.12", features = ["sqlx-sqlite", "runtime-tokio-native-tls", "macros"] }
tokio-postgres = "0.7"
deadpool-postgres = "0.13"

# Serialization
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"

# Security
ring = "0.17"
base64 = "0.22"

# Utilities
uuid = { version = "1.0", features = ["serde", "v4"] }
chrono = { version = "0.4", features = ["serde"] }
anyhow = "1.0"
thiserror = "1.0"

# Logging
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter"] }

[dev-dependencies]
reqwest = { version = "0.11", features = ["json"] }
```

---

#### Core Services

**[NEW] [db_driver.rs](file:///c:/Users/HP/Documents/dbplus/backend/src/services/db_driver.rs)**

```rust
use async_trait::async_trait;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct QueryResult {
    pub columns: Vec<String>,
    pub rows: Vec<serde_json::Value>,
    pub row_count: usize,
    pub execution_time_ms: u64,
}

#[async_trait]
pub trait DatabaseDriver: Send + Sync {
    async fn connect(&self) -> Result<(), Box<dyn std::error::Error>>;
    async fn disconnect(&self) -> Result<(), Box<dyn std::error::Error>>;
    async fn test_connection(&self) -> Result<bool, Box<dyn std::error::Error>>;
    async fn execute_query(&self, sql: &str) -> Result<QueryResult, Box<dyn std::error::Error>>;
    async fn get_schema(&self) -> Result<SchemaTree, Box<dyn std::error::Error>>;
    async fn get_table_data(&self, table: &str, options: TableDataOptions) 
        -> Result<QueryResult, Box<dyn std::error::Error>>;
    async fn execute_transaction(&self, statements: Vec<String>) 
        -> Result<(), Box<dyn std::error::Error>>;
}
```

**[NEW] [postgres_driver.rs](file:///c:/Users/HP/Documents/dbplus/backend/src/services/postgres_driver.rs)**

PostgreSQL implementation using `tokio-postgres`:
- Async connection pooling with `deadpool-postgres`
- Non-blocking query execution with tokio runtime
- Schema introspection via `information_schema`
- Transaction support with `BEGIN/COMMIT/ROLLBACK`
- Parameterized queries for SQL injection prevention
- Connection reuse and automatic reconnection

**[NEW] [encryption_service.rs](file:///c:/Users/HP/Documents/dbplus/backend/src/services/encryption_service.rs)**

```rust
use ring::aead::{Aad, LessSafeKey, Nonce, UnboundKey, AES_256_GCM};
use base64::{Engine as _, engine::general_purpose};

pub struct EncryptionService {
    key: LessSafeKey,
}

impl EncryptionService {
    pub fn new(key_bytes: &[u8; 32]) -> Self {
        let unbound_key = UnboundKey::new(&AES_256_GCM, key_bytes).unwrap();
        Self {
            key: LessSafeKey::new(unbound_key),
        }
    }

    pub fn encrypt(&self, plaintext: &str) -> Result<String, Box<dyn std::error::Error>> {
        // AES-256-GCM encryption with random nonce
        // Returns base64-encoded: nonce + ciphertext + tag
    }

    pub fn decrypt(&self, ciphertext: &str) -> Result<String, Box<dyn std::error::Error>> {
        // Decode base64, verify tag, decrypt
        // Returns plaintext or error
    }
}
```

**Performance Benefits:**
- Zero-copy operations where possible
- Compile-time optimizations
- Minimal runtime overhead
- Efficient memory usage

---

#### API Endpoints

**Connection Management**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/connections` | List all user connections |
| POST | `/api/connections` | Create new connection |
| GET | `/api/connections/:id` | Get connection details (password redacted) |
| PUT | `/api/connections/:id` | Update connection |
| DELETE | `/api/connections/:id` | Delete connection |
| POST | `/api/connections/:id/test` | Test connection validity |

**Query Execution**

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/query/execute` | Execute SQL query |
| POST | `/api/query/cancel` | Cancel running query (if supported) |
| POST | `/api/query/format` | Format SQL using sql-formatter |

**Schema Browsing**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/schema/:connectionId` | Get full schema tree |
| GET | `/api/schema/:connectionId/table/:table` | Get table structure + indexes |
| GET | `/api/schema/:connectionId/table/:table/data` | Get paginated table data |

**Saved Queries**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/saved-queries` | List saved queries (with filters) |
| POST | `/api/saved-queries` | Save new query |
| PUT | `/api/saved-queries/:id` | Update saved query |
| DELETE | `/api/saved-queries/:id` | Delete saved query |

**Query History**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/history/:connectionId` | Get query history for connection |
| DELETE | `/api/history/:connectionId` | Clear history for connection |

---

### Detailed UI Screen Specifications

Based on the "TablePlus-style" open design:

1.  **Launch / Connection Manager**:
    *   Left Brand Panel: "MyDB Client" + Backup/Restore/Create buttons.
    *   Right List Panel: Searchable connection list with "Local" tags and DB icons.
2.  **Main Workspace**:
    *   Native Toolbar + Sidebar (Object Browser).
    *   Center Tab Area: Tables, Queries, Metrics.
    *   Bottom Console: Logs and Errors.
3.  **Database Switcher**:
    *   Quick modal to switch/create/drop databases.
4.  **Table Data View**:
    *   Spreadsheet grid, inline editing, filter toolbar, pagination.
5.  **Table Structure View**:
    *   Columns list, Indexes, Constraints, DDL preview.
6.  **Row/Column Editors**:
    *   Modal forms for detailed row editing and column schema modification.
7.  **Filter Panel**:
    *   Visual "Where" clause builder.
8.  **Object Editors**:
    *   Views, Functions, Procedures, Triggers (Source view).
9.  **Import/Export**:
    *   Wizards for CSV/SQL/JSON data movement.
10. **Backup/Restore**:
    *   GUI wrappers for standard DB tools.
11. **User Management**:
    *   Role/User administration.
12. **Query Editor**:
    *   Multi-tab, autocomplete, history, favorites, split panes.
13. **Metrics Board**:
    *   Custom dashboards from SQL queries.
14. **Preferences**:
    *   Theme, Keymaps, Editor settings (font, tab size).
15. **About**:
    *   Clean version info, no licensing.

---

### UI/UX Design System

### Design Philosophy

**Professional, neutral, tool-focused**
- Prioritize clarity with minimal distractions
- High information density with breathable spacing
- Dark mode first (primary theme)
- Inspired by TablePlus, Postico, and DataGrip Lite

---

### Color System

**Base Palette (Dark-First)**

```css
/* Backgrounds */
--bg-0: #0F1115;              /* Window background */
--bg-1: #161A1F;              /* Panels */
--bg-2: #1D232A;              /* Sidebar, editor background */

/* Borders & Dividers */
--border: rgba(255,255,255,0.08);

/* Text */
--text-primary: #E5E7EB;      /* Primary text */
--text-secondary: #9CA3AF;    /* Secondary/muted text */

/* Accent Colors */
--accent: #4F83FF;            /* Primary accent (blue) */
--accent-muted: rgba(79,131,255,0.15);
--error: #EF4444;             /* Destructive actions */
--success: #10B981;           /* Success states */
--warning: #F59E0B;           /* Warning states */
```

**Usage Guidelines**
- `bg-0`: Application window background
- `bg-1`: Main content panels, modals
- `bg-2`: Sidebar, code editor, nested panels
- `border`: All dividers, input borders, subtle separators
- `accent`: Active states, buttons, selections
- `error`: DELETE/DROP confirmations, validation errors

---

### Typography

**Font Families**
```css
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
```

**Font Sizes**
- Title: `20px` (semibold)
- Section header: `14px` (semibold)
- Body text: `13px` (normal)
- Code editor: `12-13px` (monospace)
- Labels: `11px` (medium, uppercase)

**Line Heights**
- Headings: `1.3`
- Body: `1.5`
- Code: `1.6`

---

### Layout Grid

**Workspace Layout**
```
┌─────────────────────────────────────────────┐
│ Title Bar (36px)                            │
├────────┬────────────────────────────────────┤
│        │ Editor Tabs (36px)                 │
│ Side   ├────────────────────────────────────┤
│ bar    │                                    │
│ (240px)│ Query Editor (65%)                 │
│        │                                    │
│        ├────────────────────────────────────┤
│        │ Results Pane (35%)                 │
└────────┴────────────────────────────────────┘
```

**Spacing Scale**
- `xs`: 4px
- `sm`: 8px
- `md`: 12px
- `lg`: 16px
- `xl`: 24px

**Layout Measurements**
- Sidebar width: `240px`
- Editor tab height: `36px`
- Results pane: `35%` of window height
- Panel padding: `12-16px`
- Border radius: `6px`
- Shadows: Subtle insets for elevated surfaces

---

### Core Components

#### 1. Sidebar Tree

**Visual Style**
- Single-line tree items with icons
- Expand/collapse arrows appear on hover
- Context menu on right-click
- Active table highlighted with `accent-muted` background

**Specifications**
```
Item height: 28px
Icon size: 16px
Indent per level: 16px
Font: 13px sans
Hover: bg-2 + 5% lighter
Active: accent-muted background
```

**Icons**
- 🗄️ Database
- 📊 Table
- 👁️ View
- 🔑 Primary Key
- 📇 Index

---

#### 2. Query Editor

**Layout**
```
┌─────────────────────────────────────────┐
│ [Tab] [Tab +]                      [▶ Run] │  ← 36px
├─────────────────────────────────────────┤
│                                         │
│  SQL Editor (syntax highlighted)        │
│                                         │
├─────────────────────────────────────────┤
│ ⏱ 0.42s | 156 rows | Ln 12, Col 5      │  ← 24px status
└─────────────────────────────────────────┘
```

**Features**
- VS Code-like minimal top bar
- Run button in `accent` color
- Tabs with close icon (×) and unsaved dot (●)
- Status bar: execution time, row count, cursor position
- Syntax highlighting for SQL keywords

**Tab Design**
```
Inactive tab: text-secondary on bg-1
Active tab: text-primary on bg-2
Hover: slight brightness increase
Unsaved: blue dot before title
```

---

#### 3. Data Grid

**Visual Design**
```
┌──────────┬──────────┬──────────┐
│ ID ↓     │ Name     │ Email    │  ← Fixed header (32px)
├──────────┼──────────┼──────────┤
│ 1        │ John     │ john@... │  ← Light zebra stripes
│ 2        │ Jane     │ jane@... │
│ 3 ●      │ Bob      │ bob@...  │  ← Modified row (● marker)
└──────────┴──────────┴──────────┘
```

**Specifications**
- Header: `bg-2`, `text-secondary`, 32px height
- Row height: `32px`
- Zebra stripes: Alternating `bg-1` / `bg-1 + 3% lighter`
- Hover: `bg-2` + subtle highlight
- Editable cell: Blue outline when focused
- Modified row: Blue dot (●) in first column
- Sort indicator: Arrow in header

**States**
- Normal: `bg-1`
- Hover: `rgba(255,255,255,0.03)`
- Selected: `accent-muted`
- Editing: Blue `2px` border
- Modified: Blue dot marker

---

#### 4. Dialogs & Modals

**Overlay**
```css
background: rgba(0, 0, 0, 0.6);
backdrop-filter: blur(4px);
```

**Modal Container**
```
Width: 480px (small), 640px (medium), 800px (large)
Background: bg-1
Border radius: 8px
Padding: 24px
Shadow: 0 8px 32px rgba(0,0,0,0.5)
```

**Danger Dialogs** (DROP/DELETE)
```
Title color: error
Confirm button: error background
Emphasized border: 1px solid error
Icon: ⚠️ Warning triangle
```

**Standard Dialog**
```
Title: 18px semibold
Body: 14px, line-height 1.5
Buttons: 32px height, 6px radius
Primary: accent background
Secondary: border only
```

---

#### 5. Buttons

**Sizes**
- Small: `28px` height, `11px` font
- Medium: `32px` height, `13px` font
- Large: `36px` height, `14px` font

**Variants**
```css
/* Primary */
background: accent;
color: white;
hover: brightness(1.1);

/* Secondary */
background: transparent;
border: 1px solid border;
color: text-primary;

/* Danger */
background: error;
color: white;

/* Ghost */
background: transparent;
color: text-secondary;
hover: bg-2;
```

---

#### 6. Inputs & Forms

**Text Input**
```
Height: 32px
Background: bg-2
Border: 1px solid border
Padding: 8px 12px
Font: 13px
Radius: 6px

Focus: border-color: accent
Error: border-color: error
```

**Dropdowns**
```
Same as text input
Icon: Chevron down (right-aligned)
Menu: bg-1, max-height: 240px
```

---

### Component Library Recommendations

**Headless UI Libraries**
- Radix UI (recommended) - unstyled, accessible
- React Aria - Adobe's accessible components
- Ariakit - Lightweight alternative

**Code Editor**
- Monaco Editor (VS Code engine) - feature-rich
- CodeMirror 6 - lightweight alternative

**Data Grid**
- TanStack Table - headless, full control
- AG Grid Community - feature-complete

---

### Animations & Transitions

**Duration**
- Fast: `150ms` (hover, active states)
- Medium: `250ms` (dialogs, panels)
- Slow: `350ms` (page transitions)

**Easing**
```css
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-out: cubic-bezier(0.0, 0, 0.2, 1);
```

**Applied To**
- Hover states: `150ms`
- Modal open/close: `250ms`
- Panel expand/collapse: `250ms`
- Sidebar transitions: `200ms`

---

### Keyboard Shortcuts Visual Feedback

**Shortcut Display**
```
Style: bg-2, 1px border, 4px radius
Font: 11px monospace
Padding: 2px 6px
Example: ⌘K or Ctrl+K
```

---

### Accessibility

- Keyboard navigation for all interactive elements
- Focus rings: `2px solid accent`, offset `2px`
- ARIA labels for icon-only buttons
- Color contrast: WCAG AA minimum
- Screen reader announcements for dynamic content

---

### Responsive Behavior

**Minimum Window Size**
- Width: `1024px`
- Height: `600px`

**Below Minimum**
- Show warning overlay
- Disable panel resize
- Suggest expanding window

---

## Frontend Implementation

### Frontend Component Architecture

**Connection Slice:**
- `connections: Connection[]` - All user connections
- `activeConnection: Connection | null` - Currently open connection
- `fetchConnections()`, `createConnection()`, `deleteConnection()`, etc.

**Workspace Slice:**
- `schema: SchemaTree | null` - Current connection's schema
- `openTabs: Tab[]` - Query/table tabs
- `activeTabId: string | null`
- `addTab()`, `closeTab()`, `updateTab()`, etc.

**Tab Types:**
- `QueryTab` - SQL editor with results
- `TableTab` - Table data viewer with inline editing
- `StructureTab` - Table structure/indexes view

---

#### Key Components

**[NEW] [WorkspaceLayout.tsx](file:///c:/Users/HP/Documents/dbplus/frontend/src/components/workspace/WorkspaceLayout.tsx)**

3-pane layout:
- Left: `<SchemaTree />` - Collapsible tree with context menus
- Center/Top: `<TabManager />` + `<QueryEditor />` / `<TableDataView />`
- Center/Bottom: `<ResultsPane />` - Results grid or messages

Responsibilities:
- Manage layout proportions (resizable panels)
- Handle keyboard shortcuts globally (Ctrl+Enter, Ctrl+T, Ctrl+W)
- Coordinate tab switching

**[NEW] [QueryEditor.tsx](file:///c:/Users/HP/Documents/dbplus/frontend/src/components/workspace/QueryEditor.tsx)**

SQL editor with:
- CodeMirror or Monaco Editor for syntax highlighting
- Autocomplete (table/column names from schema)
- Toolbar: Run, Stop, Format, Save Query
- Status bar: Last run time, rows affected, execution time
- Props: `sql`, `onChange`, `onRun`, `onStop`, `loading`, `result`, `error`

**[NEW] [TableDataView.tsx](file:///c:/Users/HP/Documents/dbplus/frontend/src/components/table-viewer/TableDataView.tsx)**

Editable data grid:
- Display: Column headers, sortable columns, pagination
- Editing: Click cell → inline edit → track changes locally
- Modified rows visually marked (colored border/background)
- Actions:
  - Save Changes → Generate preview modal with SQL statements → Confirm → Execute transaction
  - Discard Changes → Revert to last loaded state
- Props: `columns`, `rows`, `page`, `pageSize`, `onPageChange`, `onSaveChanges`, `onDiscardChanges`

**[NEW] [SchemaTree.tsx](file:///c:/Users/HP/Documents/dbplus/frontend/src/components/workspace/SchemaTree.tsx)**

Tree view:
- Expandable nodes: Databases → Tables → Columns
- Icons for different object types (table, view, key, index)
- Context menu on right-click:
  - Tables: Open, View Structure, Generate Query, Copy Name
  - Columns: Copy Name, Copy with Table
- Double-click table → Open `TableTab`

---

#### Implementation Notes

**Design System Implementation:**
- Create Tailwind CSS configuration with design tokens from the UI/UX Design System above
- Use CSS variables for all colors, spacing, and typography
- Implement all component variants as specified in Core Components section

**Dark Mode:**
- Default and only theme (as per design philosophy)
- All colors use dark-mode palette defined above
- High-contrast syntax highlighting for SQL editor

**Keyboard Shortcuts:**
- `Ctrl/Cmd + Enter` - Run query
- `Ctrl/Cmd + T` - New query tab
- `Ctrl/Cmd + W` - Close current tab
- `Ctrl/Cmd + S` - Save current query
- `Ctrl/Cmd + /` - Toggle comment
- Visual shortcut hints match design system specs

**Error Handling:**
- Toast notifications using design system colors
- Danger dialogs for destructive operations (as specified)
- Inline error display in results pane with error highlighting

**Performance:**
- Virtual scrolling for large result sets (TanStack Virtual)
- Lazy loading schema tree nodes
- Debounced autocomplete in query editor
- Query result pagination (default 100 rows)

---

## Verification Plan

### Automated Tests

**Backend:**
```bash
cargo test
cargo test --release  # For performance benchmarks
```
- Unit tests for encryption service
- Integration tests for each driver (PostgreSQL, MySQL)
- API endpoint tests with `axum::test`
- Connection pooling tests with tokio
- Async test support via `#[tokio::test]`

**Frontend:**
```bash
npm run test
```
- Component tests with React Testing Library
- Hook tests for state management
- Integration tests for query flow

### Manual Verification

**Phase 1: Connection Management**
1. Create PostgreSQL connection with valid credentials → Success
2. Test connection → Shows success message
3. Save connection → Appears in list
4. Edit connection → Updates reflected
5. Delete connection → Removed from list with confirmation

**Phase 2: Schema & Query**
1. Open connection → Schema tree loads
2. Expand database → Tables appear
3. Open query tab → Editor loads
4. Run `SELECT * FROM users LIMIT 10` → Results displayed
5. Run invalid SQL → Error shown clearly
6. Format SQL → Code formatted correctly

**Phase 3: Table Data View**
1. Double-click table → Table tab opens with data
2. Edit cell → Row marked as modified
3. Click Save → Preview modal shows UPDATE statement
4. Confirm → Data updated in database
5. Click Discard → Changes reverted

**Phase 4: Saved Queries & History**
1. Save query with name/tags → Appears in saved queries list
2. Search saved queries → Filters correctly
3. Load saved query → Opens in new tab
4. View history → Shows past queries with timestamps
5. Re-run from history → Executes correctly

**Phase 5: Safety Mechanisms**
1. Run `DELETE FROM users` (no WHERE) → Warning modal appears
2. Confirm dangerous operation → Executes
3. Cancel dangerous operation → Query not executed
4. Edit table cells → Transaction preview before execution

---

## Implementation Roadmap

### Phase 1: Project Setup (Days 1-3)

**Tasks:**
- [ ] Initialize Rust backend (`cargo new backend`)
- [ ] Set up Cargo.toml with dependencies (Axum, SeaORM, tokio, etc.)
- [ ] Initialize frontend with Tauri (`npm create tauri-app`)
- [ ] Configure Tauri for Windows + macOS targets
- [ ] Set up React + TypeScript + Tailwind in Tauri
- [ ] Create SeaORM entities (connections, queries, history)
- [ ] Run initial migrations
- [ ] Set up Axum embedded server (localhost only)
- [ ] Build basic UI layout
- [ ] Configure Tauri window settings and native menu bar
- [ ] Test desktop app launches on both platforms

**Deliverables:**
- Working desktop app skeleton
- Local database initialized
- App launches on Windows + macOS

---

### Phase 2: Connection Management (Days 4-5)

**Tasks:**
- [ ] Implement encryption service with ring (AES-256-GCM)
- [ ] Build connection CRUD Axum handlers
- [ ] Create DatabaseDriver trait
- [ ] Implement PostgreSQL driver with tokio-postgres
- [ ] Set up deadpool connection pooling
- [ ] Create ConnectionList component
- [ ] Create ConnectionForm component
- [ ] Implement TablePlus-style Connections Dashboard:
    - [ ] **Left Panel (Brand/Actions)**:
      - [ ] Gradient background, App Logo, "MyDB Client" title.
      - [ ] Buttons: Backup, Restore, Create Connection.
    - [ ] **Right Panel (Connections List)**:
      - [ ] Search bar with "Cmd+F" shortcut.
      - [ ] Scrollable list of connection items.
    - [ ] **Connection Item**:
      - [ ] DB Type Icon, Connection Name, "(local)" tag (Green).
      - [ ] Host + Database subtext.
      - [ ] Hover/Active states, Double-click to open.
    - [ ] **Styling**:
      - [ ] Dark theme (#111/#141414).
      - [ ] Soft shadows, subtle gradients.
      - [ ] Tailwind CSS for layout and transitions.
- [ ] Add async test connection functionality
- [ ] Implement connection state management (Zustand)

**Deliverables:**
- Functional connection management
- Ability to save/edit/delete connections
- Test connection feature

---

### Phase 3: Schema Browser (Days 5-6)

**Tasks:**
- [ ] Implement schema introspection for PostgreSQL
- [ ] Create schema API endpoints
- [ ] Build SchemaTree component
- [ ] Add expand/collapse functionality
- [ ] Implement context menu
- [ ] Add icons for different object types
- [ ] Implement lazy loading for large schemas

**Deliverables:**
- Working schema browser
- Context menu with actions
- Expandable tree view

---

### Phase 4: Query Editor & Execution (Days 7-9)

**Tasks:**
- [ ] Integrate code editor (CodeMirror/Monaco)
- [ ] Implement syntax highlighting for SQL
- [ ] Build query execution API
- [ ] Create QueryEditor component
- [ ] Create ResultsPane component
- [ ] Implement DataGrid with sorting/filtering
- [ ] Add query execution status tracking
- [ ] Implement SQL formatter integration
- [ ] Add autocomplete for tables/columns
- [ ] Build tab management system

**Deliverables:**
- Working query editor
- Query execution with results display
- Multiple tabs support
- SQL formatting

---

### Phase 5: Table Data View & Inline Editing (Days 10-12)

**Tasks:**
- [ ] Build table data fetch API with pagination
- [ ] Create TableDataView component
- [ ] Implement EditableCell component
- [ ] Add local change tracking
- [ ] Create ChangesSummary modal
- [ ] Build UPDATE/INSERT/DELETE generator
- [ ] Implement transaction execution
- [ ] Add visual markers for modified rows
- [ ] Implement save/discard functionality

**Deliverables:**
- Editable table view
- Change tracking
- Transaction preview and execution
- Save/discard changes

---

### Phase 6: Saved Queries & History (Days 13-14)

**Tasks:**
- [ ] Build saved queries CRUD API
- [ ] Implement query history tracking
- [ ] Create SavedQueriesList component
- [ ] Create QueryHistory component
- [ ] Add search and tag filtering
- [ ] Implement save query modal
- [ ] Add quick load functionality
- [ ] Build history panel with re-run

**Deliverables:**
- Saved queries feature
- Query history tracking
- Search and filtering

---

### Phase 7: Editors & Tools (Days 15-16)

**Tasks:**
- [ ] **Row/Column Editors**:
  - [ ] Row Editor Modal (single record form view).
  - [ ] Column Editor Dialog (modify schema).
- [ ] **Database Objects**:
  - [ ] Views/Functions/Procedures definition viewers.
  - [ ] Constraint/Index management dialogs.
- [ ] **Advanced Tools**:
  - [ ] Import/Export Wizard (CSV, SQL, JSON).
  - [ ] Backup/Restore UI (pg_dump integration).
  - [ ] User Management Screen (Users, Roles, Privileges).
- [ ] **Filter Panel**:
  - [ ] Visual filter builder (AND/OR groups).

### Phase 8: Settings & Dashboard (Days 17-19)

**Tasks:**
- [ ] **Metrics Board**:
  - [ ] Drag-and-drop widget canvas.
  - [ ] Chart/Table widgets from queries.
- [ ] **Preferences Window**:
  - [ ] General, Editor, Keymap, Theme settings.
- [ ] **About Screen**:
  - [ ] Version info, links (no license checks).
- [ ] **Polish**:
  - [ ] Animations, Toast notifications, Loading states.

### Phase 9: Testing & Documentation (Days 20-22)

**Tasks:**
- [ ] Write backend unit tests
- [ ] Write frontend component tests
- [ ] Create integration tests
- [ ] Write setup documentation
- [ ] Create user guide
- [ ] Add inline code documentation
- [ ] Test with real PostgreSQL databases
- [ ] Bug fixes and refinements

**Deliverables:**
- Test coverage
- Complete documentation
- Production-ready app

---

## Environment Setup

### Backend `.env`

```env
RUST_LOG=info
SERVER_HOST=0.0.0.0
SERVER_PORT=3000
DATABASE_URL=postgresql://user:pass@localhost:5432/dbplus
JWT_SECRET=your-jwt-secret-key-here-min-32-chars
ENCRYPTION_KEY=your-32-byte-encryption-key-here!!
CORS_ORIGIN=http://localhost:5173
MAX_CONNECTIONS=100
```

### Frontend `.env`

```env
VITE_API_URL=http://localhost:3000/api
```

---

## Running the Project

### Initial Setup

```bash
# Prerequisites
# Install Rust: https://www.rust-lang.org/tools/install
# Install Node.js: https://nodejs.org/
# Install Tauri CLI: cargo install tauri-cli
# Install SeaORM CLI: cargo install sea-orm-cli

# Backend
cd backend
cp .env.example .env
# Edit .env with your database credentials
sea-orm-cli migrate up
cargo build --release
cargo run &

# Frontend + Tauri Desktop App
cd frontend
npm install
npm run tauri dev     # Launches desktop app in dev mode
```

### Development

```bash
# Terminal 1: Backend (embedded server on localhost:3000)
cd backend
cargo watch -x run    # Auto-reload on code changes

# Terminal 2: Desktop App
cd frontend
npm run tauri dev     # Hot reload enabled, app window opens automatically
```

### Building for Production

```bash
# Backend - Optimized release build
cd backend
cargo build --release
./target/release/dbplus-backend

# Desktop Apps for Windows & macOS
cd frontend
npm run tauri build

# This creates:
# Windows: frontend/src-tauri/target/release/bundle/msi/dbplus_0.1.0_x64.msi
# macOS: frontend/src-tauri/target/release/bundle/dmg/dbplus_0.1.0_x64.dmg
# Also creates portable .exe (Windows) and .app (macOS)
```

### Cross-Platform Build Notes

**On Windows:**
- Native Windows .msi and .exe builds work automatically
- For macOS builds: Requires macOS machine or CI/CD

**On macOS:**
- Native macOS .dmg and .app builds work automatically
- For Windows builds: Use `cargo-xwin` or Windows VM/CI

### Performance Notes

- Desktop app size: **3-5MB** (Tauri) vs 100MB+ (Electron)
- Memory usage: **50-100MB** vs 200-400MB (Electron)
- Startup time: **Instant** (<1s) vs 2-5s (Electron)
- Backend release builds: **5-10x faster** than Node.js
- First Rust compilation: 5-10 minutes (caches thereafter ~30s)

---

## Technology Justification

### Frontend

**Tauri (Desktop App Framework):**
- **Tiny binaries**: 3-5MB installers (vs 100MB+ Electron)
- **Native performance**: Uses system WebView, not Chromium
- **Rust-based**: Perfect synergy with Rust backend
- **Cross-platform**: Single codebase for Windows + macOS
- **Low memory**: 50-100MB RAM usage (vs 200-400MB Electron)
- **Security**: Sandboxed, permission-based system
- **Auto-updates**: Built-in updater support
- **Native integrations**: File system, notifications, system tray

**React + TypeScript:**
- Type safety for complex state management
- Strong ecosystem for data grids and editors
- Excellent developer experience
- Works seamlessly within Tauri WebView

**Tailwind CSS:**
- Rapid UI development
- Consistent design system
- Dark mode support out of the box
- Native-feeling UI with proper styling

**Zustand:**
- Simpler than Redux
- TypeScript-first
- Perfect for this app's state complexity

**CodeMirror/Monaco:**
- Industry-standard code editors
- SQL syntax highlighting
- Autocomplete support
- Works in WebView environment

### Backend

**Rust + Axum:**
- **Blazing fast**: Native performance, zero-cost abstractions
- **Memory safe**: No null pointers, no data races (guaranteed at compile time)
- **Async/await**: Tokio runtime for high-concurrency workloads
- **Type safe**: Strong static typing catches errors before runtime
- **Low resource usage**: Minimal CPU and memory footprint
- **Production ready**: Used by Discord, Cloudflare, AWS, Dropbox

**SeaORM:**
- Async/await native (tokio-compatible)
- Type-safe query builder
- Migration system with up/down support
- Active Record & Repository patterns
- Excellent PostgreSQL/MySQL support

**Key Crates:**
- `axum` - Ergonomic web framework built on hyper and tower
- `tokio` - Async runtime for non-blocking I/O
- `tokio-postgres` - High-performance PostgreSQL driver
- `deadpool` - Connection pooling
- `ring` - Cryptographic operations (AES-256-GCM)
- `jsonwebtoken` - JWT authentication
- `tower-governor` - Rate limiting
- `serde` - Serialization/deserialization

**PostgreSQL (internal):**
- Robust and reliable
- JSON support for flexible data (tags array)
- Perfect for app metadata
- Excellent Rust driver support

---

## Future Enhancements

**v2.0:**
- MySQL/MariaDB support
- SQLite file upload
- Export results (CSV, JSON, Excel)
- Query result charts/visualizations
- SSH tunneling for connections
- Query performance analysis
- Dark/Light theme toggle
- **System tray icon** with quick actions
- **Native notifications** for long-running queries
- **File associations** (.sql files open in app)
- **Keyboard shortcuts** customization

**v3.0:**
- Collaborative features (share queries via cloud sync)
- MongoDB support
- Redis support
- Advanced autocomplete (JOIN suggestions)
- Query builder GUI
- Database migration tools
- Backup/restore functionality
- Multi-tab query execution
- **macOS Touch Bar** support
- **Windows 11 widgets** integration
- **Auto-updates** with delta patching

---

## Security Checklist

- [x] Passwords encrypted at rest (AES-256-GCM)
- [x] JWT authentication with expiry
- [x] Rate limiting on query endpoints
- [x] SQL injection prevention (parameterized queries)
- [x] Dangerous operation confirmations
- [x] CORS configuration
- [x] Environment variable validation
- [x] Connection credential validation
- [x] No sensitive data in logs
- [x] HTTPS in production (via reverse proxy)
