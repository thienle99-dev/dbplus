# Database Client Application - Task Breakdown

## Tổng hợp (từ các file docs/\*.md)

### Đã làm (gần đây)

- [x] Backend type decoding (Postgres): MONEY/TIMETZ/INTERVAL/MACADDR/MACADDR8/BIT/VARBIT/RANGE/MULTIRANGE + arrays; có unit tests (`backend/src/services/postgres/query.rs`)
- [x] Backend query streaming cho dataset lớn: NDJSON stream endpoint `POST /api/connections/:id/execute/stream` (`backend/src/handlers/query_stream.rs`, `backend/src/main.rs`)
- [x] Performance: virtualized result rendering + giảm re-render khi edit cell (`frontend/src/components/query-editor/QueryResults.tsx`)
- [x] Row editing: delete row từ results + refresh lại query (`frontend/src/components/query-editor/QueryResults.tsx`, `frontend/src/components/QueryEditor.tsx`, `backend/src/handlers/result_edit.rs`)
- [x] Fix lỗi React hooks khi `Cmd+S` (Rendered more hooks…) (`frontend/src/components/SaveQueryModal.tsx`)
- [x] Fix đóng hết workspace tabs nhưng panel bên phải không unmount (`frontend/src/components/Sidebar.tsx`)

### Chưa làm / Cần làm tiếp (theo `docs/QUERY_EDITOR_ROADMAP.md`)

- [ ] Frontend: Search/filter history
- [x] Visualize query plan (tree view)
- [ ] Infinite scroll option
- [ ] Column operations (sort/filter/hide/resize/reorder + save prefs)
- [ ] Customizable shortcuts
- [ ] Backend type verification: test conversions toàn diện (incl NULLs), remove debug logs, bổ sung test coverage
- [ ] Code quality: unit/integration tests cho query execution, error boundary, accessibility

## Planning Phase

- [x] Create comprehensive implementation plan
- [x] Save plan to project folder
- [ ] Review plan with user
- [ ] Confirm tech stack and architecture decisions
- [ ] Get approval to proceed with implementation

## Phase 1: Project Setup & Authentication

- [x] Initialize Rust backend (`cargo new backend`)
  - [x] Set up Cargo.toml with dependencies (Axum, SeaORM, tokio, etc.)
  - [x] Create environment configuration
  - [x] Set up proper folder structure
- [x] Initialize frontend with Tauri (`npm create tauri-app`)
- [x] Configure Tauri for Windows + macOS targets
- [x] Set up React + TypeScript + Tailwind in Tauri
  - [x] Set up routing
  - [x] Configure API client
- [x] Implement authentication system (Skipped - Local Desktop App)
  - [x] Create User model in Prisma
  - [x] Build registration endpoint
  - [x] Build login endpoint with JWT
  - [x] Create auth middleware
  - [x] Build login/register UI components
  - [x] Implement protected routes

## Phase 2: Connection Management

- [x] Build encryption service
  - [x] Implement AES-256-GCM encryption
  - [x] Create encrypt/decrypt utilities
  - [x] Add environment key validation
- [x] Create connection APIs
  - [x] CRUD endpoints for connections
  - [x] Test connection endpoint
  - [x] Connection validation
- [x] Build PostgreSQL driver
  - [x] Abstract driver interface
  - [x] PostgreSQL implementation with pg library
  - [x] Connection pooling
  - [x] Error handling
- [x] Build SQLite driver
  - [x] SQLite connection pooling (sqlx)
  - [x] Query execution + streaming
  - [x] Schema/table introspection (main)
  - [ ] SQLite advanced metadata parity (permissions/roles/comments/bloat/partitions/dependencies)
- [x] Create connection UI
  - [x] ConnectionList component
  - [x] ConnectionForm component
  - [x] ConnectionCard component
  - [x] Test connection UI flow
  - [x] State management setup
  - [x] Enable SQLite connection creation
    - [x] SQLite selectable in DB picker
    - [x] Connection form supports SQLite file path / :memory:
    - [x] Backend accepts SQLite connection payload (optional host/port/user/pass)

## Phase 2b: Connections Dashboard Redesign (TablePlus-style)

- [x] Left Panel (Brand & Actions)
  - [x] Layout & Gradient Background
  - [x] App Logo & Title
  - [x] Action Buttons (Backup, Restore, Create)
- [x] Right Panel (Connections List)
  - [x] Search Bar (Visual & Functional)
  - [x] Add Connection Button
  - [x] Scrollable List Container
- [x] Connection Item Component
  - [x] Icon mapping (Postgres, MySQL, etc.)
  - [x] Status indicators (Local tag)
  - [x] Metadata display (Host/DB)
  - [x] Hover & Click interactions
  - [x] Double-click handler
- [x] Integration
  - [x] Integrate with Zustand store
  - [x] Connect "Create" and "Open" actions
  - [x] Implement Search filtering logic
  - [x] Connection creation modal
  - [x] Backend API integration

## Phase 3: Schema Browser

- [x] Implement schema introspection
  - [x] PostgreSQL schema queries
  - [x] Table structure queries
  - [x] Index information queries
- [x] Build schema API
  - [x] Get schema tree endpoint
  - [x] Get table structure endpoint
  - [x] Get table data endpoint with pagination
- [x] Create schema UI components
  - [x] SchemaTree component with expand/collapse
  - [x] Tree node components
  - [x] Context menu
  - [x] Object type icons
  - [x] Lazy loading for performance

## Phase 4: Query Editor & Execution

- [x] Set up code editor
  - [x] Integrate CodeMirror or Monaco
  - [x] Configure SQL syntax highlighting
  - [x] Add line numbers
  - [x] Configure autocomplete
- [x] Build query execution backend
  - [x] Execute query endpoint
  - [x] Query cancellation (if supported)
  - [x] SQL formatter endpoint
  - [x] Result pagination
- [x] Create query UI components
  - [x] QueryEditor component
  - [x] Toolbar with actions
  - [x] Status bar
  - [x] ResultsPane component
  - [x] DataGrid with sorting/filtering
  - [x] Virtual scrolling for performance
- [x] Implement tab management
  - [x] Tab state management
  - [x] Add/close tabs
  - [x] Tab switching
  - [x] Keyboard shortcuts

## Phase 5: Table Data View & Inline Editing

- [x] Build table data API
  - [x] Paginated table data endpoint
  - [x] Table structure endpoint
  - [x] Transaction execution endpoint
  - [x] Generate UPDATE/INSERT/DELETE queries
- [x] Create table viewer components
  - [x] TableDataView component
  - [x] EditableCell component
  - [x] Change tracking logic
  - [x] ChangesSummary modal
  - [x] Visual indicators for modified rows
- [x] Implement save/discard functionality
  - [x] Local state management for edits
  - [x] Generate SQL preview
  - [x] Execute transaction
  - [x] Revert changes

## Phase 6: Saved Queries & History

- [x] Build saved queries backend
  - [x] CRUD endpoints
  - [x] Search and filter functionality
  - [x] Tag support
- [x] Implement query history
  - [x] History tracking in middleware
  - [x] History retrieval endpoint
  - [x] Clear history endpoint
- [x] Create queries UI
  - [x] SavedQueriesList component
  - [x] SaveQueryModal component
  - [x] QueryHistory component
  - [x] Search and filter UI
  - [x] Quick load functionality

## Phase 7: Safety & Polish

- [x] Implement safety mechanisms
  - [x] Dangerous query detection
  - [x] Confirmation modals
  - [ ] Transaction previews
- [x] Add keyboard shortcuts
  - [x] Ctrl+Enter for run
  - [x] Ctrl+T for new tab
  - [x] Ctrl+W for close tab
  - [x] Ctrl+S for save query
- [ ] Polish UI/UX
  - [x] Dark mode refinement
  - [x] Loading states
  - [x] Error boundaries
  - [x] Toast notifications
  - [x] Smooth animations
  - [x] Responsive design
- [ ] Performance optimization

  - [x] Virtual scrolling (result table)
  - [x] Lazy loading (schema tree + data fetch)
  - [x] Debouncing (auto-save)
  - [x] Query result streaming (NDJSON)
  - [ ] Connection pooling optimization

- [ ] Create chart widgets
  - [x] Chart configuration UI
  - [x] Integration with charting library (Recharts)
  - [x] Visualizing query results

## Phase 9: Advanced Tools & Polish

- [/] **Editors & Modals**
  - [/] Row Editor Modal (Backend complete, frontend pending)
  - [x] Column/Schema Editor (ColumnModal.tsx exists)
  - [/] View/Function Definition Viewer (Backend complete, frontend pending)
  - [/] Filter Builder Panel (Backend complete, frontend pending)
- [ ] **Data Tools**
  - [x] Import Wizard (CSV/JSON/SQL)
  - [x] Export Wizard
  - [x] Backup/Restore UI
- [ ] **Administration**
  - [ ] Database Switcher/Manager
  - [ ] User/Role Management Screen
- [ ] **App Settings**
  - [ ] Preferences Window (General, Editor, Theme)
  - [ ] About Screen
- [ ] **Final Polish**
  - [ ] Keyboard Shortcuts Map
  - [ ] Toast Notifications
  - [ ] Error Boundaries
  - [ ] Loading States

## Phase 10: Final Polish & Release

- [x] Limit/Offset controls
- [x] Integrate with Query Editor
  - [x] Toggle between SQL and Visual mode
  - [x] Generate SQL from visual state
  - [x] Save/Load visual state
- [x] Fix frontend build errors
- [x] Final verification
  - [x] Test with real PostgreSQL instances (see `docs/PHASE10_VERIFICATION.md`)
  - [x] Performance testing (see `docs/PHASE10_VERIFICATION.md`)
  - [x] Security audit (see `docs/PHASE10_SECURITY_AUDIT.md`)

## Phase 11: Table Info Tab Enhancements

### Phase 11.1 - Essential Features (High Priority)

- [x] **Constraints & Foreign Keys** ⭐⭐⭐⭐⭐

  - [x] Backend: Create API endpoint `GET /api/connections/:id/constraints`
    - [x] Query foreign keys with ON DELETE/UPDATE actions
    - [x] Query check constraints
    - [x] Query unique constraints
  - [x] Frontend: Constraints display component
    - [x] Foreign keys section with navigation buttons
    - [x] Check constraints section
    - [x] Unique constraints section
    - [x] Click to navigate to referenced tables

- [x] **Columns Details Table** ⭐⭐⭐⭐

  - [x] Frontend: Enhanced columns table component
    - [x] Display all column properties in table format
    - [x] Add icons for Primary Key, Foreign Key, Indexed columns
    - [x] Show data type with precision/length
    - [x] Display nullable, default values
    - [x] Add column comments/descriptions
    - [x] Sortable columns

- [x] **Table Statistics** ⭐⭐⭐⭐
  - [x] Backend: Create API endpoint `GET /api/connections/:id/table-stats`
    - [x] Query row count (estimated)
    - [x] Query table size
    - [x] Query index size
    - [x] Query creation/modification timestamps
    - [x] PostgreSQL: Use pg_stat_user_tables, pg_total_relation_size()
  - [x] Frontend: Statistics display component
    - [x] Display all statistics in card format
    - [x] Add refresh button
    - [x] Format sizes (MB, GB)
    - [x] Format numbers with commas

### Phase 11.2 - Enhanced Features (Medium Priority)

- [x] **Triggers** ⭐⭐⭐

  - [x] Backend: Create API endpoint `GET /api/connections/:id/triggers`
    - [x] Query trigger information
    - [x] Get trigger definitions
  - [x] Frontend: Triggers display component
    - [x] List all triggers with event/timing
    - [x] Show function names
    - [x] Display enabled/disabled status
    - [x] View trigger definition modal

- [x] **Table Comments & Description** ⭐⭐⭐

  - [x] Backend: Create API endpoints for comments
    - [x] GET table comment
    - [x] POST/PUT update table comment
  - [x] Frontend: Comment editor component
    - [x] Display current comment
    - [x] Edit mode with save/cancel
    - [ ] Markdown support (optional)

- [x] **Permissions & Grants** ⭐⭐⭐

  - [x] Backend: Create API endpoint `GET /api/connections/:id/permissions`
    - [x] Query table privileges
    - [x] Get user/role permissions
  - [x] Frontend: Permissions display component
    - [x] List all roles and their privileges
    - [x] Display grant options
    - [x] Show granted by information

- [x] **UI Improvements**
  - [x] Add tab navigation within Info Tab
    - [x] Overview, Columns, Constraints, Indexes, Triggers, Stats, Permissions
  - [x] Implement collapsible sections
    - [x] Save collapse state to localStorage
  - [x] Add Quick Actions Bar
    - [x] Copy DDL button
    - [x] Export schema button
    - [x] Analyze table button
    - [x] Refresh all button

### Phase 11.3 - Advanced Features (Low Priority - Optional)

- [ ] **Dependencies** ⭐⭐

  - [x] Backend: Create API endpoint `GET /api/connections/:id/dependencies`
    - [x] Query views using this table
    - [x] Query functions/procedures referencing table
    - [x] Query tables with foreign keys to this table
  - [x] Frontend: Dependencies display component
    - [x] List all dependent objects
    - [x] Navigation to dependent objects

- [x] **Storage & Bloat Information** ⭐⭐

  - [x] Backend: Advanced storage queries (PostgreSQL)
    - [x] Dead tuples count
    - [x] Live tuples count
    - [x] Bloat percentage calculation
    - [x] Last vacuum/analyze timestamps
  - [x] Frontend: Storage info component
    - [x] Display bloat metrics
    - [x] VACUUM/ANALYZE action buttons
    - [x] Warning indicators for high bloat

- [x] **Partitions** ⭐⭐
  - [x] Backend: Partition information queries
    - [x] Detect if table is partitioned
    - [x] Get partition strategy
    - [x] List all partitions
    - [x] Get partition sizes
  - [x] Frontend: Partitions display component
    - [x] Show partition strategy and key
    - [x] List partitions with sizes
    - [x] Navigate to partition details

## Phase 10: Testing & Documentation

- [ ] Write tests
  - [ ] Backend unit tests
  - [ ] Frontend component tests
  - [ ] Integration tests
  - [ ] E2E tests (optional)
- [x] Create documentation
  - [x] Setup guide
  - [x] User documentation
  - [x] API documentation
  - [x] Code comments
  - [x] README with architecture overview

## Phase 12: Next Features Backlog

### Ưu tiên cao (đáng làm sớm)

- [ ] Search/filter Query History + Saved Queries (tag, time range, connection/db scope)
- [ ] Column operations (sort/filter/hide/resize/reorder + save prefs theo bảng)
- [ ] Row Editor modal (form Insert/Edit/Delete + validate kiểu dữ liệu + NULL)
- [ ] Filter Builder Panel (UI → SQL WHERE) + lưu preset filter
- [ ] Transaction preview + “Run in transaction / rollback” cho query nguy hiểm
- [ ] Background jobs (long query/import/export) + progress + cancel
- [ ] Secrets storage via OS keychain (macOS/Windows)
- [ ] SSH tunnel / bastion support (Postgres/MySQL)
- [ ] Data profiling (null %, distinct, top values, histograms)
- [ ] SQL lint rules (dangerous patterns, missing WHERE on UPDATE/DELETE)

### Query Editor

- [x] Autocomplete JOIN/columns theo schema context
- [x] Snippet variables + param placeholders + form nhập params
- [x] Tabs: pin/duplicate + split editor/results (vertical/horizontal)
- [x] EXPLAIN nâng cao: highlight hotspots, compare plans, toggle ANALYZE
- [x] Result diff/compare (two queries / snapshots)
- [x] Query formatter options per dialect + on-save format

### Schema & Navigation

- [ ] ER diagram (FK graph) + click navigate
- [ ] Global search objects (table/view/function/column) + quick open
- [ ] Object definition viewers đầy đủ (view/function/procedure/trigger) + copy/create/alter
- [ ] Schema diff + generate ALTER (between two schemas)

### Data Tools (nâng cấp)

- [ ] Import wizard: mapping columns, type coercion, error report, dry-run
- [ ] Export wizard: chọn columns/format, chunking, progress + cancel
- [ ] Backup/Restore: custom format + gzip + progress + cancel + logs
- [ ] Create table from file (CSV infer schema)
- [ ] Export to Parquet/Arrow + import from Parquet

### Settings & UX

- [ ] Preferences window (editor font, theme, result grid behavior)
- [ ] Customizable shortcuts + keyboard shortcuts map
- [ ] Accessibility pass (keyboard nav, focus states) + error boundary polish
- [ ] Session/workspace restore (tabs/layout per connection)
- [ ] Multi-window mode (separate query/data window)

### SQLite (nâng cấp)

- [x] File picker cho đường dẫn DB + recent DB list
- [x] Attached databases support (ATTACH) + schema list ngoài `main`
- [x] PRAGMA editor + integrity check + VACUUM/ANALYZE UI
