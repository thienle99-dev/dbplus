# Phase 12: Query Editor Enhancements - Implementation Plan

## Overview

Phase 12 focuses on advanced Query Editor features to improve productivity and user experience. This includes autocomplete improvements, snippet variables, tab management, advanced EXPLAIN, result comparison, and formatter options.

## Features Breakdown

### 1. Autocomplete JOIN/Columns theo Schema Context ⭐⭐⭐⭐⭐ ✅ COMPLETED

**Priority:** HIGH  
**Estimated Time:** 4-6 hours  
**Actual Time:** ~3 hours  
**Status:** ✅ Completed on 2025-12-16

#### Backend Changes

- ✅ No backend changes needed (schema already available via existing APIs)

#### Frontend Changes

**File:** `frontend/src/components/query-editor/useQueryCompletion.ts`

**Tasks:**

- [x] ✅ Enhanced `joinCompletionSource()` to include JOIN suggestions

  - [x] ✅ Detect when user types all JOIN types (INNER, LEFT, RIGHT, FULL OUTER)
  - [x] ✅ Suggest tables from current schema
  - [x] ✅ Include foreign key relationships in suggestions with directional indicators (→ outgoing, ← incoming)
  - [x] ✅ Show JOIN template with ON clause auto-filled from FK relationships
  - [x] ✅ Fallback suggestions for tables without FK relationships
  - [x] ✅ Priority boost system (FK: 10/9, No FK: 0)

- [x] ✅ Improved `columnCompletionSource()` with context awareness

  - [x] ✅ Parse current query to detect table aliases
  - [x] ✅ Filter columns based on table context
  - [x] ✅ Show source table in completion detail (`from users`)
  - [x] ✅ Support multi-table queries (JOIN context)
  - [x] ✅ Context-aware boost (SELECT: 5, WHERE+ID: 8, ORDER BY: 3, GROUP BY: 4)
  - [x] ✅ Aggregate functions in SELECT context (COUNT, SUM, AVG, MIN, MAX)

- [x] ✅ Added FK-aware JOIN autocomplete
  - [x] ✅ Detect foreign key relationships from schema (already fetched)
  - [x] ✅ Suggest JOIN with proper ON conditions
  - [x] ✅ Template: `{table} ON {source}.{fk_col} = {target}.{pk_col}`
  - [x] ✅ Support both outgoing and incoming FK relationships

**Implementation Steps:**

```typescript
// 1. Add FK relationship detection
interface ForeignKeyRelation {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
}

// 2. Enhance completion context
interface CompletionContext {
  currentTable?: string;
  tableAliases: Map<string, string>;
  availableTables: string[];
  foreignKeys: ForeignKeyRelation[];
}

// 3. Add JOIN template generator
function generateJoinCompletion(
  targetTable: string,
  fkRelation?: ForeignKeyRelation
): CompletionItem;
```

#### ✅ Implementation Summary

**Files Modified:**

- `frontend/src/components/query-editor/useQueryCompletion.ts` - Enhanced JOIN and column autocomplete
- `frontend/src/components/query-editor/sqlSnippets.ts` - NEW file with 40+ SQL snippets

**Key Improvements:**

1. **JOIN Autocomplete:**

   - Supports all JOIN types: INNER, LEFT, LEFT OUTER, RIGHT, RIGHT OUTER, FULL OUTER
   - FK-aware suggestions with directional indicators (→ for outgoing, ← for incoming)
   - Priority boost: FK relationships (10/9) > No FK (0)
   - Works even when no tables in query yet

2. **Column Autocomplete:**

   - Context detection: SELECT, WHERE, ORDER BY, GROUP BY
   - Smart boost based on context (SELECT: 5, WHERE+ID: 8, etc.)
   - Shows source table: `from users` or `from u` (alias)
   - Aggregate functions in SELECT: COUNT(\*), SUM(), AVG(), MIN(), MAX()
   - Unique key tracking to avoid duplicates across tables

3. **SQL Snippets:**
   - Created separate file with 40+ snippets
   - All JOIN types: `ijoin`, `ljoin`, `lojoin`, `rjoin`, `rojoin`, `fojoin`
   - Common patterns: `wh` (WHERE), `hav` (HAVING), `seld` (SELECT DISTINCT)
   - Aggregate functions: `sum`, `avg`, `min`, `max`
   - ORDER BY variants: `ord` (DESC), `orda` (ASC)
   - LIMIT/OFFSET: `lim`, `limoff`

**Example Usage:**

```sql
-- Type "SELECT * FROM users" then "LEFT JOIN "
-- Autocomplete shows:
--   → orders (ON users.id = orders.user_id) [BOOST: 10]
--   ← profiles (ON profiles.user_id = users.id) [BOOST: 9]
--   products (Table - no FK) [BOOST: 0]

-- Type "SELECT " in query
-- Autocomplete shows:
--   id (from users) [BOOST: 5]
--   name (from users) [BOOST: 5]
--   COUNT(*) (Aggregate) [BOOST: 2]
```

---

---

### 2. Snippet Variables + Param Placeholders + Form Nhập Params ⭐⭐⭐⭐

**Priority:** HIGH  
**Estimated Time:** 6-8 hours

#### Backend Changes

**File:** `backend/src/models/snippet.rs`

```rust
// Add new field to Snippet model
pub struct Snippet {
    // ... existing fields
    pub variables: Option<serde_json::Value>, // JSON array of variable definitions
}

// Variable definition structure
{
  "variables": [
    {
      "name": "user_id",
      "type": "number",
      "default": null,
      "required": true,
      "description": "User ID to filter"
    }
  ]
}
```

**Tasks:**

- [ ] Update Snippet model to include `variables` field
- [ ] Update migration to add `variables` column
- [ ] Update CRUD endpoints to handle variables

#### Frontend Changes

**File:** `frontend/src/components/query-editor/SnippetFormModal.tsx`

**Tasks:**

- [ ] Add variable definition editor
  - [ ] UI to add/remove variables
  - [ ] Variable properties: name, type, default, required, description
  - [ ] Supported types: string, number, boolean, date

**File:** `frontend/src/components/query-editor/SnippetExecutionModal.tsx` (NEW)

**Tasks:**

- [ ] Create modal for parameter input
  - [ ] Parse snippet content for placeholders (e.g., `{{user_id}}`)
  - [ ] Generate form fields based on variable definitions
  - [ ] Validate required fields
  - [ ] Replace placeholders with user input
  - [ ] Execute query with replaced values

**File:** `frontend/src/components/query-editor/QueryToolbar.tsx`

**Tasks:**

- [ ] Add "Execute with Parameters" button
- [ ] Detect if current query has placeholders
- [ ] Show parameter input modal before execution

**Implementation Steps:**

```typescript
// 1. Placeholder syntax: {{variable_name}}
const PLACEHOLDER_REGEX = /\{\{(\w+)\}\}/g;

// 2. Parse placeholders from query
function extractPlaceholders(query: string): string[];

// 3. Replace placeholders with values
function replacePlaceholders(
  query: string,
  values: Record<string, any>
): string;

// 4. Variable definition interface
interface SnippetVariable {
  name: string;
  type: "string" | "number" | "boolean" | "date";
  default?: any;
  required: boolean;
  description?: string;
}
```

---

### 3. Tabs: Pin/Duplicate + Split Editor/Results (Vertical/Horizontal) ⭐⭐⭐⭐

**Priority:** MEDIUM  
**Estimated Time:** 8-10 hours

#### Backend Changes

- ✅ No backend changes needed

#### Frontend Changes

**File:** `frontend/src/stores/workspaceStore.ts`

**Tasks:**

- [ ] Add `pinned` field to Tab interface
- [ ] Add `splitMode` field: 'none' | 'vertical' | 'horizontal'
- [ ] Add actions: `pinTab()`, `duplicateTab()`, `setSplitMode()`

**File:** `frontend/src/components/Workspace.tsx`

**Tasks:**

- [ ] Update tab rendering to show pin icon
- [ ] Prevent closing pinned tabs
- [ ] Add context menu: Pin, Duplicate, Split
- [ ] Implement split view layout

**File:** `frontend/src/components/QueryEditor.tsx`

**Tasks:**

- [ ] Support split layout rendering
- [ ] Vertical split: Editor on left, Results on right
- [ ] Horizontal split: Editor on top, Results on bottom
- [ ] Add toggle button for split mode
- [ ] Save split preference per tab

**Implementation Steps:**

```typescript
// 1. Update Tab interface
interface Tab {
  // ... existing fields
  pinned: boolean;
  splitMode: "none" | "vertical" | "horizontal";
}

// 2. Split layout component
<div className={splitMode === "vertical" ? "flex-row" : "flex-col"}>
  <div className="editor-pane">
    <CodeMirror />
  </div>
  <div className="results-pane">
    <QueryResults />
  </div>
</div>;

// 3. Context menu items
const contextMenuItems = [
  { label: "Pin Tab", action: () => pinTab(tabId) },
  { label: "Duplicate Tab", action: () => duplicateTab(tabId) },
  { label: "Split Vertical", action: () => setSplitMode(tabId, "vertical") },
  {
    label: "Split Horizontal",
    action: () => setSplitMode(tabId, "horizontal"),
  },
];
```

---

### 4. EXPLAIN Nâng Cao: Highlight Hotspots, Compare Plans, Toggle ANALYZE ⭐⭐⭐

**Priority:** MEDIUM  
**Estimated Time:** 6-8 hours

#### Backend Changes

**File:** `backend/src/handlers/explain.rs`

**Tasks:**

- [ ] Add `analyze` parameter to EXPLAIN endpoint
- [ ] Support `EXPLAIN ANALYZE` vs `EXPLAIN` toggle
- [ ] Return structured plan data (JSON format)
- [ ] Calculate cost metrics and hotspots

**Endpoint:**

```
POST /api/connections/:id/explain
Body: {
  query: string,
  analyze: boolean,  // NEW
  format: 'text' | 'json'  // NEW
}
```

#### Frontend Changes

**File:** `frontend/src/components/query-editor/ExplainPlanViewer.tsx`

**Tasks:**

- [ ] Add toggle for EXPLAIN vs EXPLAIN ANALYZE
- [ ] Highlight expensive nodes (cost > threshold)
- [ ] Color-code by cost (green → yellow → red)
- [ ] Show execution time per node (if ANALYZE)
- [ ] Add tooltip with detailed metrics

**File:** `frontend/src/components/query-editor/PlanComparison.tsx` (NEW)

**Tasks:**

- [ ] Create side-by-side plan comparison view
- [ ] Store multiple plans for comparison
- [ ] Highlight differences in cost/timing
- [ ] Show improvement/regression metrics

**Implementation Steps:**

```typescript
// 1. Plan node interface
interface ExplainNode {
  nodeType: string;
  cost: number;
  actualTime?: number;
  rows: number;
  children?: ExplainNode[];
}

// 2. Hotspot detection
function detectHotspots(plan: ExplainNode, threshold: number): ExplainNode[];

// 3. Cost visualization
function getCostColor(cost: number, maxCost: number): string {
  const ratio = cost / maxCost;
  if (ratio > 0.7) return "text-red-500";
  if (ratio > 0.4) return "text-yellow-500";
  return "text-green-500";
}
```

---

### 5. Result Diff/Compare (Two Queries / Snapshots) ⭐⭐⭐

**Priority:** LOW  
**Estimated Time:** 6-8 hours

#### Backend Changes

- ✅ No backend changes needed (comparison done client-side)

#### Frontend Changes

**File:** `frontend/src/components/query-editor/ResultComparison.tsx` (NEW)

**Tasks:**

- [ ] Create comparison view component
- [ ] Store result snapshots
- [ ] Side-by-side result display
- [ ] Highlight differences (added/removed/changed rows)
- [ ] Export diff report

**File:** `frontend/src/components/query-editor/QueryResults.tsx`

**Tasks:**

- [ ] Add "Save Snapshot" button
- [ ] Add "Compare with Snapshot" button
- [ ] Manage snapshot list (save/load/delete)

**Implementation Steps:**

```typescript
// 1. Snapshot interface
interface ResultSnapshot {
  id: string;
  timestamp: number;
  query: string;
  data: any[];
  columns: string[];
}

// 2. Diff algorithm
interface RowDiff {
  type: "added" | "removed" | "changed";
  row: any;
  changes?: Record<string, { old: any; new: any }>;
}

function compareResults(
  snapshot1: ResultSnapshot,
  snapshot2: ResultSnapshot
): RowDiff[];

// 3. Visual diff display
<div className="diff-view">
  {diffs.map((diff) => (
    <div className={`row-${diff.type}`}>
      {/* Render row with highlighting */}
    </div>
  ))}
</div>;
```

---

### 6. Query Formatter Options per Dialect + On-Save Format ⭐⭐⭐

**Priority:** MEDIUM  
**Estimated Time:** 4-6 hours

#### Backend Changes

- ✅ No backend changes needed (formatting done client-side)

#### Frontend Changes

**File:** `frontend/src/stores/settingsStore.ts`

**Tasks:**

- [ ] Add formatter settings
  - [ ] Dialect: 'postgresql' | 'mysql' | 'sqlite' | 'generic'
  - [ ] Indent style: 'spaces' | 'tabs'
  - [ ] Indent size: number
  - [ ] Keyword case: 'upper' | 'lower' | 'preserve'
  - [ ] Format on save: boolean

**File:** `frontend/src/components/query-editor/QueryEditor.tsx`

**Tasks:**

- [ ] Integrate sql-formatter library with options
- [ ] Apply formatter settings
- [ ] Auto-format on save (if enabled)
- [ ] Add format button to toolbar

**File:** `frontend/src/components/settings/FormatterSettings.tsx` (NEW)

**Tasks:**

- [ ] Create formatter preferences UI
- [ ] Preview formatted output
- [ ] Save/load formatter settings

**Implementation Steps:**

```typescript
// 1. Formatter settings interface
interface FormatterSettings {
  dialect: "postgresql" | "mysql" | "sqlite" | "generic";
  indentStyle: "spaces" | "tabs";
  indentSize: number;
  keywordCase: "upper" | "lower" | "preserve";
  formatOnSave: boolean;
}

// 2. Apply formatter
import { format } from "sql-formatter";

function formatQuery(query: string, settings: FormatterSettings): string {
  return format(query, {
    language: settings.dialect,
    tabWidth: settings.indentSize,
    useTabs: settings.indentStyle === "tabs",
    keywordCase: settings.keywordCase,
  });
}

// 3. Auto-format on save
useEffect(() => {
  if (settings.formatOnSave && isSaving) {
    const formatted = formatQuery(query, settings);
    setQuery(formatted);
  }
}, [isSaving]);
```

---

## Implementation Order (Recommended)

### Week 1: Core Autocomplete & Snippets

1. **Day 1-2:** Autocomplete JOIN/Columns (Feature #1)
2. **Day 3-5:** Snippet Variables & Parameters (Feature #2)

### Week 2: Tab Management & Formatting

3. **Day 1-3:** Tab Pin/Duplicate/Split (Feature #3)
4. **Day 4-5:** Query Formatter Options (Feature #6)

### Week 3: Advanced Features

5. **Day 1-3:** EXPLAIN Enhancements (Feature #4)
6. **Day 4-5:** Result Comparison (Feature #5)

## Testing Checklist

### Feature #1: Autocomplete ✅ COMPLETED

- [x] ✅ JOIN suggestions appear when typing all JOIN types (INNER, LEFT, RIGHT, FULL OUTER)
- [x] ✅ Column suggestions filtered by table context (SELECT, WHERE, ORDER BY, GROUP BY)
- [x] ✅ FK relationships suggest proper ON clauses with directional indicators
- [x] ✅ Autocomplete works with table aliases
- [x] ✅ Priority boost system for better suggestions
- [x] ✅ Aggregate functions in SELECT context
- [x] ✅ 40+ SQL snippets for common patterns

### Feature #2: Snippet Variables

- [ ] Can define variables in snippet
- [ ] Parameter form appears before execution
- [ ] Required fields validated
- [ ] Placeholders replaced correctly

### Feature #3: Tab Management

- [ ] Can pin/unpin tabs
- [ ] Pinned tabs cannot be closed
- [ ] Duplicate creates exact copy
- [ ] Split modes work correctly (vertical/horizontal)

### Feature #4: EXPLAIN

- [ ] Toggle between EXPLAIN and EXPLAIN ANALYZE
- [ ] Hotspots highlighted correctly
- [ ] Can compare two plans
- [ ] Cost colors accurate

### Feature #5: Result Comparison

- [ ] Can save result snapshots
- [ ] Diff shows added/removed/changed rows
- [ ] Side-by-side view works
- [ ] Can export diff report

### Feature #6: Formatter

- [ ] Formatter settings saved
- [ ] Format on save works (if enabled)
- [ ] Dialect-specific formatting correct
- [ ] Preview shows formatted output

## Dependencies

### NPM Packages

```json
{
  "sql-formatter": "^15.6.11", // Already installed
  "diff": "^5.1.0", // For result comparison
  "react-split": "^2.0.14" // For split panes
}
```

### Backend Dependencies

- ✅ No new dependencies needed

## Database Migrations

### Migration: Add snippet variables

```sql
ALTER TABLE snippets ADD COLUMN variables TEXT;
```

## Files to Create

### Frontend

- [x] ✅ `frontend/src/components/query-editor/sqlSnippets.ts` - CREATED (40+ SQL snippets)
- [ ] `frontend/src/components/query-editor/SnippetExecutionModal.tsx`
- [ ] `frontend/src/components/query-editor/PlanComparison.tsx`
- [ ] `frontend/src/components/query-editor/ResultComparison.tsx`
- [ ] `frontend/src/components/settings/FormatterSettings.tsx`

### Backend

- No new files needed

## Files to Modify

### Frontend

- [x] ✅ `frontend/src/components/query-editor/useQueryCompletion.ts` - Enhanced JOIN and column autocomplete
- `frontend/src/components/query-editor/SnippetFormModal.tsx`
- `frontend/src/components/query-editor/QueryToolbar.tsx`
- `frontend/src/components/query-editor/QueryEditor.tsx`
- `frontend/src/components/query-editor/QueryResults.tsx`
- `frontend/src/components/query-editor/ExplainPlanViewer.tsx`
- `frontend/src/components/Workspace.tsx`
- `frontend/src/stores/workspaceStore.ts`
- `frontend/src/stores/settingsStore.ts`

### Backend

- `backend/src/models/snippet.rs`
- `backend/src/handlers/explain.rs`
- `backend/src/handlers/snippet.rs`

## Success Metrics

- ✅ Autocomplete reduces typing by 30%+
- ✅ Snippet variables used in 50%+ of saved snippets
- ✅ Users utilize split view for complex queries
- ✅ EXPLAIN hotspots help identify slow queries
- ✅ Result comparison catches data changes
- ✅ Formatter improves code readability

## Notes

- All features should work with both PostgreSQL and SQLite
- Maintain backward compatibility with existing snippets
- Settings should persist across sessions
- Performance: Autocomplete should respond < 100ms
- UX: All features should have keyboard shortcuts

---

**Created:** 2025-12-16  
**Phase:** 12 - Query Editor Enhancements  
**Status:** In Progress 🚧  
**Progress:** Feature #1 (Autocomplete) ✅ Complete | Features #2-6 ⏳ Pending  
**Last Updated:** 2025-12-16 15:58
