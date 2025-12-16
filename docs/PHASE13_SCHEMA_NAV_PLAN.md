# Phase 13: Schema & Navigation - Implementation Plan

## Overview

Phase 13 focuses on deep schema understanding and rapid navigation. Users will be able to visualize database relationships (ER Diagram), instantly find objects (Global Search), view full definitions of code objects (Views/Functions), and compare schemas.

## Features Breakdown

### 1. Object Definition Viewers (Views, Functions, Procedures) ⭐⭐⭐

**Priority:** HIGH
**Estimated Time:** 4-6 hours

**Goal:** Allow users to view key properties and the **Source Code** (DDL) of non-table objects like Views, Materialized Views, Functions, Procedures, and Triggers.

#### Backend Changes

- [ ] Add `get_view_definition` endpoint (using `pg_get_viewdef`)
- [ ] Add `get_function_definition` endpoint (using `pg_get_functiondef`)
- [ ] Support introspection for Procedures and Triggers

#### Frontend Changes

- [ ] Update `SchemaTree` to include Categories: "Views", "Functions", "Procedures", "Triggers"
- [ ] Create `ObjectDefinitionView` component (ReadOnly CodeMirror)
- [ ] Add Context Menu: "Script as CREATE", "Script as DROP"

### 2. Global Search / Quick Open (Command Palette) ⭐⭐⭐⭐

**Priority:** HIGH
**Estimated Time:** 4-6 hours

**Goal:** "Ctrl+P" or "Cmd+P" experience to instantly jump to any Table, View, Function, or open Tab.

#### Backend Changes

- [ ] Ensure `get_schema` returns all object types (tables, views, functions) efficiently

#### Frontend Changes

- [ ] Create `CommandPalette` component (Modal)
- [ ] Index all schema objects into a client-side search index (Fuse.js ?)
- [ ] Keyboard shortcut listener (`Cmd+P` / `Ctrl+P`)
- [ ] Navigation logic:
  - Select Table -> Open Table Data
  - Select Function -> Open Function Definition
  - Select Tab -> Switch Tab

### 3. ER Diagram (Entity Relationship) ⭐⭐⭐

**Priority:** MEDIUM
**Estimated Time:** 6-8 hours

**Goal:** Visual graph of tables and their Foreign Key relationships.

#### Frontend Changes

- [ ] Install `reactflow` (or utilize custom canvas)
- [ ] Create `ERDiagramView` component
- [ ] Auto-layout algorithm (dagre or elkjs)
- [ ] Nodes: Tables (Columns list)
- [ ] Edges: relationships (1:1, 1:n, n:m icons)
- [ ] Interactivity: Click table to navigate to Data view

### 4. Schema Diff (Compare Schemas) ⭐⭐⭐

**Priority:** LOW (Advanced)
**Estimated Time:** 8-10 hours

**Goal:** Compare two schemas (or two connections) and generate a difference report + ALTER scripts.

#### Backend Changes

- [ ] Add logic to compare Metadata of two sources
- [ ] Generate textual Diff

#### Frontend Changes

- [ ] `SchemaDiffTool` UI
- [ ] Select Source A and Source B
- [ ] View list of changed objects
- [ ] View DDL Diff

---

## Execution Strategy

1.  **Start with Object Definitions (#1)** to populate the Schema Tree with more than just tables.
2.  **Build Global Search (#2)** to make navigating this larger tree easy.
3.  **Build ER Diagram (#3)** for specific visualization.
4.  **Tackle Schema Diff (#4)** if time permits.

## Progress Tracking

**Status:** In Progress 🚧
**Progress:** 2/4 Features Complete (Features #1 and #2 Done, Backend for #3 Done)
**Last Updated:** 2025-12-16

### Completed

- [x] Object Definition Viewers (Views/Functions)
- [x] Global Search / Quick Open (Command Palette)
- [x] Backend API for ER Diagram (Foreign Key Extraction)

### Ongoing

- [ ] Frontend for ER Diagram
- [ ] Schema Diff Tool (Scope Documented)
