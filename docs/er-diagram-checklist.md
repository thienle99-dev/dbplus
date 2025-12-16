# ER Diagram - Quick Checklist

## Backend
- [x] Create `backend/src/services/postgres/foreign_key.rs`
- [x] Add `ForeignKeyInfo` struct
- [x] Implement SQL query for foreign keys
- [x] Create `backend/src/handlers/foreign_key.rs`
- [x] Add `get_foreign_keys` handler
- [x] Add route to `main.rs`: `GET /api/connections/:id/foreign-keys`
- [x] Test API with Postman/curl

## Frontend - Data
- [x] Create `frontend/src/types/foreignKey.ts`
- [x] Add `ForeignKeyInfo`, `ERNode`, `EREdge` types
- [x] Add `useForeignKeys` hook to `useDatabase.ts`
- [x] Test data fetching

## Frontend - Components
- [x] Install reactflow: `pnpm add reactflow`
- [x] Create `frontend/src/components/er-diagram/TableNode.tsx`
- [x] Create `frontend/src/components/er-diagram/ERDiagram.tsx`
- [x] Create `frontend/src/components/er-diagram/layout.ts`
- [x] Create `frontend/src/components/ERDiagramModal.tsx`
- [x] Style components with design system

## Integration
- [x] Add "View ER Diagram" to schema context menu
- [x] Add state management for ER modal
- [x] Implement click-to-navigate logic
- [x] Test with sample database

## Polish
- [x] Add loading states
- [x] Add error handling
- [x] Add empty state (no foreign keys)
- [x] Optimize layout for large schemas
- [x] Add keyboard shortcuts
- [x] Test performance with 50+ tables

## Documentation
- [ ] Update README with ER Diagram feature
- [ ] Add screenshots
- [ ] Document keyboard shortcuts
