# ER Diagram Implementation Plan

## Overview
Implement an interactive Entity Relationship Diagram that visualizes database schema with foreign key relationships and allows click-to-navigate between tables.

## Phase 1: Backend - Foreign Key Data API

### 1.1 Database Query
**File:** `backend/src/services/postgres/foreign_key.rs` (new)

```rust
pub struct ForeignKeyInfo {
    pub constraint_name: String,
    pub table_schema: String,
    pub table_name: String,
    pub column_name: String,
    pub referenced_table_schema: String,
    pub referenced_table_name: String,
    pub referenced_column_name: String,
    pub on_delete: String,
    pub on_update: String,
}
```

**SQL Query:**
```sql
SELECT
    tc.constraint_name,
    tc.table_schema,
    tc.table_name,
    kcu.column_name,
    ccu.table_schema AS referenced_table_schema,
    ccu.table_name AS referenced_table_name,
    ccu.column_name AS referenced_column_name,
    rc.delete_rule AS on_delete,
    rc.update_rule AS on_update
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
    ON rc.constraint_name = tc.constraint_name
    AND rc.constraint_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = $1
ORDER BY tc.table_name, kcu.column_name;
```

### 1.2 API Endpoint
**File:** `backend/src/handlers/foreign_key.rs` (new)

```rust
pub async fn get_foreign_keys(
    State(db): State<DatabaseConnection>,
    Path(id): Path<Uuid>,
    Query(params): Query<SchemaParams>,
) -> Result<Json<Vec<ForeignKeyInfo>>, String>
```

**Route:** `GET /api/connections/:id/foreign-keys?schema=:schema&database=:database`

### 1.3 Integration
- Add to `ConnectionService`
- Add to router in `main.rs`
- Add to PostgresDriver trait

---

## Phase 2: Frontend - Data Fetching

### 2.1 Types
**File:** `frontend/src/types/foreignKey.ts` (new)

```typescript
export interface ForeignKeyInfo {
    constraintName: string;
    tableSchema: string;
    tableName: string;
    columnName: string;
    referencedTableSchema: string;
    referencedTableName: string;
    referencedColumnName: string;
    onDelete: string;
    onUpdate: string;
}

export interface ERNode {
    id: string;
    type: 'table';
    position: { x: number; y: number };
    data: {
        label: string;
        tableName: string;
        columns: string[];
        primaryKeys: string[];
    };
}

export interface EREdge {
    id: string;
    source: string;
    target: string;
    sourceHandle: string;
    targetHandle: string;
    label?: string;
    data: {
        constraintName: string;
        onDelete: string;
        onUpdate: string;
    };
}
```

### 2.2 API Hook
**File:** `frontend/src/hooks/useDatabase.ts`

```typescript
export const useForeignKeys = (
    connectionId: string | undefined,
    schema: string | undefined
) => {
    const dbOverride = useActiveDatabaseOverride(connectionId);
    const dbKey = dbOverride ?? '__default__';
    
    return useQuery({
        queryKey: ['foreign-keys', connectionId, dbKey, schema],
        queryFn: async () => {
            if (!connectionId || !schema) return [];
            const { data } = await api.get<ForeignKeyInfo[]>(
                `/api/connections/${connectionId}/foreign-keys`,
                {
                    params: dbOverride ? { schema, database: dbOverride } : { schema },
                }
            );
            return data;
        },
        enabled: !!connectionId && !!schema,
    });
};
```

---

## Phase 3: ER Diagram Component

### 3.1 Dependencies
```bash
pnpm add reactflow
```

### 3.2 Table Node Component
**File:** `frontend/src/components/er-diagram/TableNode.tsx` (new)

```tsx
import { Handle, Position } from 'reactflow';

interface TableNodeProps {
    data: {
        label: string;
        tableName: string;
        columns: string[];
        primaryKeys: string[];
    };
}

export default function TableNode({ data }: TableNodeProps) {
    return (
        <div className="bg-bg-1 border-2 border-border rounded-lg shadow-lg min-w-[200px]">
            {/* Header */}
            <div className="px-3 py-2 bg-gradient-to-r from-accent/20 to-accent/10 border-b-2 border-border">
                <div className="font-semibold text-sm text-text-primary">
                    {data.tableName}
                </div>
            </div>
            
            {/* Columns */}
            <div className="p-2">
                {data.columns.map((col, idx) => (
                    <div key={idx} className="flex items-center gap-2 px-2 py-1 text-xs">
                        {data.primaryKeys.includes(col) && (
                            <Key size={12} className="text-accent" />
                        )}
                        <span className={data.primaryKeys.includes(col) ? 'font-semibold' : ''}>
                            {col}
                        </span>
                        <Handle
                            type="source"
                            position={Position.Right}
                            id={`${data.tableName}-${col}-source`}
                            className="w-2 h-2"
                        />
                        <Handle
                            type="target"
                            position={Position.Left}
                            id={`${data.tableName}-${col}-target`}
                            className="w-2 h-2"
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}
```

### 3.3 Main ER Diagram Component
**File:** `frontend/src/components/er-diagram/ERDiagram.tsx` (new)

```tsx
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    Node,
    Edge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useMemo } from 'react';
import TableNode from './TableNode';

const nodeTypes = {
    table: TableNode,
};

interface ERDiagramProps {
    connectionId: string;
    schema: string;
    onTableClick?: (tableName: string) => void;
}

export default function ERDiagram({ connectionId, schema, onTableClick }: ERDiagramProps) {
    const { data: foreignKeys = [] } = useForeignKeys(connectionId, schema);
    const { data: tables = [] } = useTables(connectionId, schema);
    
    // Generate nodes and edges from data
    const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
        // Convert tables to nodes
        const nodes: Node[] = tables.map((table, idx) => ({
            id: table.name,
            type: 'table',
            position: calculatePosition(idx, tables.length), // Auto-layout
            data: {
                label: table.name,
                tableName: table.name,
                columns: [], // Fetch from table info
                primaryKeys: [],
            },
        }));
        
        // Convert foreign keys to edges
        const edges: Edge[] = foreignKeys.map((fk) => ({
            id: fk.constraintName,
            source: fk.tableName,
            target: fk.referencedTableName,
            sourceHandle: `${fk.tableName}-${fk.columnName}-source`,
            targetHandle: `${fk.referencedTableName}-${fk.referencedColumnName}-target`,
            label: `${fk.columnName} → ${fk.referencedColumnName}`,
            animated: true,
            data: {
                constraintName: fk.constraintName,
                onDelete: fk.onDelete,
                onUpdate: fk.onUpdate,
            },
        }));
        
        return { nodes, edges };
    }, [tables, foreignKeys]);
    
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    
    const onNodeClick = (event: React.MouseEvent, node: Node) => {
        if (onTableClick) {
            onTableClick(node.data.tableName);
        }
    };
    
    return (
        <div className="w-full h-full">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={onNodeClick}
                nodeTypes={nodeTypes}
                fitView
            >
                <Background />
                <Controls />
                <MiniMap />
            </ReactFlow>
        </div>
    );
}
```

### 3.4 Layout Algorithm
**File:** `frontend/src/components/er-diagram/layout.ts` (new)

```typescript
// Simple grid layout
export function calculatePosition(index: number, total: number) {
    const cols = Math.ceil(Math.sqrt(total));
    const row = Math.floor(index / cols);
    const col = index % cols;
    
    return {
        x: col * 300 + 50,
        y: row * 400 + 50,
    };
}

// Or use dagre for hierarchical layout
import dagre from 'dagre';

export function getLayoutedElements(nodes: Node[], edges: Edge[]) {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: 'LR' });
    
    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: 250, height: 200 });
    });
    
    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });
    
    dagre.layout(dagreGraph);
    
    return {
        nodes: nodes.map((node) => {
            const nodeWithPosition = dagreGraph.node(node.id);
            return {
                ...node,
                position: {
                    x: nodeWithPosition.x,
                    y: nodeWithPosition.y,
                },
            };
        }),
        edges,
    };
}
```

---

## Phase 4: UI Integration

### 4.1 Add ER Diagram Tab
**File:** `frontend/src/components/SchemaTree.tsx`

Add context menu option:
```tsx
<ContextMenuItem onClick={() => {
    // Open ER Diagram modal or tab
    setErDiagramState({ open: true, schema: schemaName });
}}>
    <Network size={14} />
    View ER Diagram
</ContextMenuItem>
```

### 4.2 ER Diagram Modal
**File:** `frontend/src/components/ERDiagramModal.tsx` (new)

```tsx
export default function ERDiagramModal({ 
    isOpen, 
    onClose, 
    connectionId, 
    schema,
    onTableClick 
}: ERDiagramModalProps) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`ER Diagram - ${schema}`}
            size="full"
        >
            <div className="h-[80vh]">
                <ERDiagram
                    connectionId={connectionId}
                    schema={schema}
                    onTableClick={(tableName) => {
                        onTableClick?.(tableName);
                        onClose();
                    }}
                />
            </div>
        </Modal>
    );
}
```

### 4.3 Navigation Integration
When user clicks a table node:
1. Close ER Diagram modal
2. Open table in new tab or navigate to existing tab
3. Use `useTabContext` to add table tab

---

## Phase 5: Enhancements

### 5.1 Features
- [ ] Search/filter tables in diagram
- [ ] Highlight table and its relationships on hover
- [ ] Show/hide specific tables
- [ ] Export diagram as PNG/SVG
- [ ] Save custom layouts per schema
- [ ] Show column types in nodes
- [ ] Color-code tables by category/prefix
- [ ] Show indexes on columns

### 5.2 Performance
- [ ] Virtualization for large schemas (100+ tables)
- [ ] Lazy load column details
- [ ] Debounce layout calculations

### 5.3 UX
- [ ] Keyboard shortcuts (Ctrl+F to search, Esc to close)
- [ ] Zoom to fit selected tables
- [ ] Double-click to open table details
- [ ] Right-click context menu on nodes

---

## Implementation Order

1. ✅ **Backend API** (2-3 hours)
   - Foreign key query
   - API endpoint
   - Integration

2. ✅ **Frontend Data Layer** (1 hour)
   - Types
   - API hook
   - Data transformation

3. ✅ **ER Diagram Component** (4-5 hours)
   - Table node component
   - Main diagram component
   - Layout algorithm
   - Styling

4. ✅ **UI Integration** (2 hours)
   - Schema tree context menu
   - Modal component
   - Navigation logic

5. ✅ **Testing & Polish** (2 hours)
   - Test with real schemas
   - Fix layout issues
   - Performance optimization

**Total Estimate:** 11-13 hours

---

## Testing Checklist

- [ ] Foreign keys API returns correct data
- [ ] Diagram renders all tables
- [ ] Edges connect correct tables
- [ ] Click navigation works
- [ ] Layout is readable for 5-10 tables
- [ ] Layout is readable for 50+ tables
- [ ] Zoom/pan controls work
- [ ] MiniMap shows correct overview
- [ ] Works with schemas without foreign keys
- [ ] Works with self-referencing foreign keys
- [ ] Works with multiple FKs between same tables

---

## Future Enhancements

- Support for other databases (MySQL, SQLite)
- Show table statistics (row count, size)
- Show indexes and constraints
- Generate SQL from diagram
- Reverse engineer from existing database
- Compare schemas visually
- Generate migration scripts from diagram changes
