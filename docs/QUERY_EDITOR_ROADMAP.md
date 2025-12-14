# 🗺️ Query Editor Enhancement Roadmap

## 📋 Current Status
- ✅ Basic SQL execution
- ✅ Keyboard shortcuts (Cmd+Enter)
- ✅ Draft auto-save
- ✅ SQL/Visual mode toggle
- ✅ Result table display
- ✅ Error handling

## 🎯 Planned Features

### Phase 1: Essential Features (High Priority)

#### 1.1 Query History 📜
**Goal**: Track and re-run previous queries
- [x] Backend: Create `query_history` table
- [x] Backend: API endpoints for history CRUD
- [x] Frontend: History sidebar/panel
- [ ] Frontend: Search/filter history
- [x] Frontend: Click to load query
- [x] Frontend: Delete history entries
- [x] Auto-save executed queries (success + error)
- [x] Timestamp and execution time tracking

**Estimated**: 1-2 days

#### 1.2 Multiple Query Tabs 📑
**Goal**: Work with multiple queries simultaneously
- [x] Frontend: Tab component for query editor
- [x] Frontend: Add/close tabs
- [x] Frontend: Switch between tabs
- [x] Frontend: Auto-save per tab
- [x] Frontend: Tab rename
- [x] LocalStorage persistence
- [x] Unsaved changes indicator

**Estimated**: 2-3 days

#### 1.3 Export Results 💾
**Goal**: Export query results in multiple formats
- [x] Frontend: Export button in results toolbar
- [x] Frontend: Export menu (CSV / JSON / Excel / SQL / Clipboard)
- [x] Export to CSV
- [x] CSV options: delimiter presets, UTF-8 BOM (Excel-friendly)
- [x] Export to JSON
- [x] JSON options: array-of-rows vs array-of-objects, pretty/minified
- [x] Export to Excel (via .xls / TSV)
- [x] Copy as INSERT statements
- [x] Copy selected rows
- [x] Export respects current sorts (and selection when applicable)
- [x] Download with proper filename
- [x] Filename template: sanitized + timestamp
- [x] Large results: warn/confirm (avoid UI freeze)

**Estimated**: 1-2 days

#### 1.4 Query Formatting ✨
**Goal**: Auto-format and beautify SQL
- [x] Frontend: Integrate SQL formatter library (sql-formatter)
- [x] Keyboard shortcut (Cmd+K)
- [x] Format button in toolbar
- [x] Preserve comments
- [x] Configurable formatting options
- [x] Code folding support

**Estimated**: 1 day

---

### Phase 2: Productivity Boosters (Medium Priority)

#### 2.1 Auto-complete 🔮
**Goal**: Intelligent code completion
- [x] Backend: API to get table/column metadata
- [x] Frontend: Integrate CodeMirror autocomplete
- [x] Table name suggestions
- [x] Column name suggestions (context-aware)
- [x] SQL keyword completion
- [x] Function completion
- [x] Fuzzy matching

**Estimated**: 3-4 days

#### 2.2 Query Snippets 📝
**Goal**: Reusable query templates
- [x] Backend: `query_snippets` table
- [x] Backend: CRUD APIs
- [x] Frontend: Snippets library UI
- [x] Frontend: Insert snippet
- [x] Template variables (e.g., {{table_name}})
- [x] Pre-defined common snippets
- [x] Custom user snippets
- [x] Snippet categories/tags

**Estimated**: 2-3 days

#### 2.3 Execution Plan 📊
**Goal**: Query performance insights
- [x] Backend: EXPLAIN query support (Postgres JSON, SQLite query plan)
- [x] Frontend: Execution plan tab
- [ ] Visualize query plan (tree view)
- [x] Highlight slow operations (hotspots list)
- [x] Index usage analysis (detect seq scan vs index scans)
- [x] Cost estimation display (summary + top nodes)
- [x] Buffers/IO insight (Postgres EXPLAIN ANALYZE BUFFERS)

**Estimated**: 3-4 days

#### 2.4 Row Editing ✏️
**Goal**: Edit query results inline
- [x] Frontend: Editable table cells
- [x] Frontend: Track changes
- [x] Frontend: Save changes button
- [x] Backend: Generate UPDATE statements
- [x] Backend: Execute updates
- [x] Validation before save
- [x] Bulk edit support
- [ ] Delete rows from results

**Estimated**: 4-5 days

---

### Phase 3: UX Enhancements (Lower Priority)

#### 3.1 Result Pagination 📄
**Goal**: Handle large result sets efficiently
- [x] Backend: Paginated query results (limit/offset + total_count for SELECT/WITH)
- [x] Frontend: Pagination controls
- [x] Frontend: Page size selector
- [x] Frontend: Jump to page
- [ ] Infinite scroll option
- [x] Total row count display
- [x] Performance optimization (virtualized result rendering)

**Estimated**: 2-3 days

#### 3.2 Column Operations 🔧
**Goal**: Advanced result manipulation
- [ ] Frontend: Sort by column (client-side)
- [ ] Frontend: Filter results (client-side)
- [ ] Frontend: Hide/show columns
- [ ] Frontend: Resize columns (drag)
- [ ] Frontend: Reorder columns
- [ ] Frontend: Column context menu
- [ ] Save column preferences

**Estimated**: 2-3 days

#### 3.3 Query Bookmarks ⭐
**Goal**: Save and organize favorite queries
- [x] Backend: `query_bookmarks` table
- [x] Backend: CRUD APIs
- [x] Frontend: Bookmarks sidebar
- [x] Frontend: Folder organization
- [x] Frontend: Tags/labels
- [x] Frontend: Search bookmarks
- [x] Share bookmarks (export/import)

**Estimated**: 2-3 days

#### 3.4 Advanced Keyboard Shortcuts ⌨️
**Goal**: Power user productivity
- [x] Cmd+K: Format query (already implemented)
- [x] Cmd+/: Comment/uncomment
- [x] Cmd+D: Duplicate line
- [x] Cmd+Shift+E: Execute selection
- [x] Cmd+L: Select line
- [x] Cmd+Shift+K: Delete line
- [x] Cmd+]: Indent
- [x] Cmd+[: Outdent
- [ ] Customizable shortcuts (future enhancement)

**Estimated**: 1-2 days
**Status**: ✅ Complete

---

## 🔧 Technical Debt & Improvements

### Backend Type Support (URGENT)
- [x] Add rust_decimal for NUMERIC/DECIMAL
- [x] Enable tokio-postgres features
- [x] Fix NUMERIC(12,2) parsing (NULL detection issue)

**PostgreSQL result decoding coverage (to JSON)**
- [x] BOOL
- [x] INT2 / INT4 / INT8
- [x] FLOAT4 / FLOAT8
- [x] TEXT / VARCHAR / CHAR / NAME (as string)
- [x] UUID
- [x] DATE / TIME / TIMESTAMP / TIMESTAMPTZ
- [x] JSON / JSONB
- [x] INET / CIDR
- [x] BYTEA (base64-encoded string)
- [x] HSTORE
- [x] Arrays: TEXT[] / INT4[] / INT8[]

**Missing types to support/test**
- [x] MONEY (decoded to Decimal string, fixed-scale cents)
- [x] TIMETZ (decoded to `HH:MM:SS[.ffffff]±HH:MM`)
- [x] INTERVAL (decoded to stable string: `X mons Y days HH:MM:SS[.ffffff]`)
- [x] MACADDR / MACADDR8 (decoded to lowercase hex string)
- [x] BIT / VARBIT (decoded to bitstring)
- [x] ENUM / DOMAIN (decoded as string / underlying value)
- [x] RANGE / MULTIRANGE (decoded to string representation)
- [x] Arrays: INT2[] / BOOL[] / FLOAT4[] / FLOAT8[] / NUMERIC[] / UUID[] / DATE[] / TIMESTAMP[] / TIMESTAMPTZ[] / INET[] / BYTEA[] / JSONB[] / HSTORE[] (+ money/timetz/interval/macaddr/bit variants)

**Verification**
- [ ] Test all type conversions comprehensively (incl. NULLs)
- [ ] Remove debug logs after verification
- [ ] Add comprehensive type tests

### Performance Optimization
- [ ] Query result streaming for large datasets
- [ ] Virtual scrolling for result table
- [x] Debounce auto-save
- [ ] Optimize re-renders

### Code Quality
- [ ] Add unit tests for query execution
- [ ] Add integration tests
- [ ] Error boundary for query editor
- [ ] Accessibility improvements (ARIA labels)

---

## 📊 Implementation Priority Matrix

| Feature | Impact | Effort | Priority |
|---------|--------|--------|----------|
| Query History | High | Low | 🔴 P0 |
| Export Results | High | Low | 🔴 P0 |
| Query Formatting | Medium | Low | 🟡 P1 |
| Multiple Tabs | High | Medium | 🟡 P1 |
| Auto-complete | High | High | 🟡 P1 |
| Query Snippets | Medium | Medium | 🟢 P2 |
| Row Editing | High | High | 🟢 P2 |
| Execution Plan | Medium | High | 🟢 P2 |
| Pagination | Medium | Medium | 🔵 P3 |
| Column Operations | Medium | Medium | 🔵 P3 |
| Bookmarks | Low | Medium | 🔵 P3 |
| Advanced Shortcuts | Low | Low | 🔵 P3 |

---

## 🚀 Recommended Implementation Order

1. **Week 1**: Query History + Export Results
2. **Week 2**: Query Formatting + Multiple Tabs (Part 1)
3. **Week 3**: Multiple Tabs (Part 2) + Auto-complete (Part 1)
4. **Week 4**: Auto-complete (Part 2) + Query Snippets
5. **Week 5**: Row Editing
6. **Week 6**: Execution Plan + Pagination
7. **Week 7**: Column Operations + Bookmarks
8. **Week 8**: Advanced Shortcuts + Polish

---

## 📝 Notes

- Each feature should include proper error handling
- All features should work offline where possible
- Mobile responsiveness for all UI components
- Comprehensive documentation for each feature
- User testing after each phase

## 🎯 Success Metrics

- Query execution time < 100ms for simple queries
- History search < 50ms
- Auto-complete suggestions < 100ms
- Export 10k rows < 2s
- User satisfaction score > 4.5/5
