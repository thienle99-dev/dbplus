# ER Diagram - Quick Checklist

## Backend
- [ ] Create `backend/src/services/postgres/foreign_key.rs`
- [ ] Add `ForeignKeyInfo` struct
- [ ] Implement SQL query for foreign keys
- [ ] Create `backend/src/handlers/foreign_key.rs`
- [ ] Add `get_foreign_keys` handler
- [ ] Add route to `main.rs`: `GET /api/connections/:id/foreign-keys`
- [ ] Test API with Postman/curl

## Frontend - Data
- [ ] Create `frontend/src/types/foreignKey.ts`
- [ ] Add `ForeignKeyInfo`, `ERNode`, `EREdge` types
- [ ] Add `useForeignKeys` hook to `useDatabase.ts`
- [ ] Test data fetching

## Frontend - Components
- [ ] Install reactflow: `pnpm add reactflow`
- [ ] Create `frontend/src/components/er-diagram/TableNode.tsx`
- [ ] Create `frontend/src/components/er-diagram/ERDiagram.tsx`
- [ ] Create `frontend/src/components/er-diagram/layout.ts`
- [ ] Create `frontend/src/components/ERDiagramModal.tsx`
- [ ] Style components with design system

## Integration
- [ ] Add "View ER Diagram" to schema context menu
- [ ] Add state management for ER modal
- [ ] Implement click-to-navigate logic
- [ ] Test with sample database

## Polish
- [ ] Add loading states
- [ ] Add error handling
- [ ] Add empty state (no foreign keys)
- [ ] Optimize layout for large schemas
- [ ] Add keyboard shortcuts
- [ ] Test performance with 50+ tables

## Documentation
- [ ] Update README with ER Diagram feature
- [ ] Add screenshots
- [ ] Document keyboard shortcuts
