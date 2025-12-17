# Master Prompt: Couchbase Web Console Interface

## Tổng quan

Master prompt này mô tả cách triển khai và tích hợp giao diện Couchbase Web Console vào ứng dụng database client **theo đúng cấu trúc và patterns hiện có**. Tài liệu này đảm bảo tính nhất quán với codebase hiện tại và tái sử dụng các components, hooks, và patterns đã có.

## Nguyên tắc thiết kế

1. **Giữ nguyên cấu trúc**: Tái sử dụng các components và patterns hiện có
2. **Mapping nhất quán**: Map Couchbase concepts vào cấu trúc Database/Schema/Table hiện có
3. **Capabilities-based**: Sử dụng capabilities để ẩn/hiện features không hỗ trợ
4. **Type-safe**: Sử dụng TypeScript types đã có và extend khi cần

## Tóm tắt Implementation Strategy

### Components tái sử dụng (không cần tạo mới)

- ✅ `SchemaTree.tsx` - Extend để support Bucket/Scope/Collection mapping
- ✅ `TableInfoTab.tsx` - Extend để support Collection info tabs
- ✅ `TableDataView.tsx` - Extend để support Document display
- ✅ `QueryEditor.tsx` - Extend để support N1QL syntax
- ✅ `ConnectionFormModal.tsx` - Extend để support Couchbase fields
- ✅ `DataGrid.tsx` - Extend để format JSON cells
- ✅ `IndexesSection.tsx` - Extend để support GSI indexes

### Hooks tái sử dụng (không cần tạo mới)

- ✅ `useDatabases()` - Trả về buckets cho Couchbase
- ✅ `useSchemas()` - Trả về scopes cho Couchbase
- ✅ `useTables()` - Trả về collections cho Couchbase
- ✅ `useColumns()` - Trả về inferred fields từ documents
- ✅ `useIndexes()` - Trả về GSI indexes
- ✅ `useTableData()` - Trả về documents

### Files cần tạo mới (tối thiểu)

- ⚠️ `frontend/src/components/query-editor/n1qlCompletions.ts` - N1QL keywords/functions
- ⚠️ `frontend/src/components/table-info/CreateCouchbaseIndexModal.tsx` - Index creation (optional, có thể extend modal hiện có)

### Pattern chung: Conditional Rendering

Tất cả các components sẽ detect `connectionType === 'couchbase'` và render accordingly:

```tsx
const isCouchbase = connection?.type === 'couchbase';

// Conditional labels
const label = isCouchbase ? 'Bucket' : 'Database';

// Conditional rendering
{isCouchbase ? (
  <CouchbaseSpecificComponent />
) : (
  <SQLComponent />
)}
```

## Kiến trúc Couchbase và Mapping UI

### Hierarchy Mapping (theo cấu trúc hiện tại)

| Couchbase Concept | Database Client Concept | UI Component Location | Notes |
|-------------------|-------------------------|----------------------|-------|
| **Cluster** | Connection | `ConnectionFormModal`, `ConnectionsDashboard` | Top-level, đã có sẵn |
| **Bucket** | Database | `SchemaTree` (top-level), `useDatabases()` hook | Hiển thị như database trong tree |
| **Scope** | Schema | `SchemaTree` → `SchemaNode`, `useSchemas()` hook | Hiển thị như schema node |
| **Collection** | Table | `SchemaTree` → Table item, `useTables()` hook | Hiển thị như table trong schema |
| **Document** | Row | `TableDataView`, `DataGrid` | Hiển thị trong table data view |
| **Index** | Index | `TableInfoTab` → Indexes tab, `useIndexes()` hook | Hiển thị trong table info |
| **Query** | Query | `QueryEditor`, `QueryTabs` | N1QL queries trong query editor |

### UI Component Structure (theo cấu trúc hiện tại)

```
App Structure (giữ nguyên)
├── Sidebar (components/Sidebar.tsx)
│   └── SchemaTree (components/SchemaTree.tsx)
│       ├── Database Level (Bucket) - useDatabases()
│       │   └── SchemaNode (Scope) - useSchemas()
│       │       └── ObjectFolder "Tables" (Collections) - useTables()
│       │           └── Collection Items (hiển thị như TableInfo)
│       └── Query History & Saved Queries (đã có)
│
├── Main Content Area
│   ├── TableDataView (components/TableDataView.tsx)
│   │   └── DataGrid (components/DataGrid.tsx) - hiển thị Documents
│   └── TableInfoTab (components/TableInfoTab.tsx)
│       ├── Overview tab
│       ├── Columns tab (Document fields)
│       ├── Indexes tab (useIndexes())
│       └── Info tab (Collection metadata)
│
└── QueryTabs (components/QueryTabs.tsx)
    └── QueryEditor (components/QueryEditor.tsx)
        └── N1QL syntax highlighting (CodeMirror)
```

### File Structure (theo cấu trúc hiện tại)

```
frontend/src/
├── components/
│   ├── SchemaTree.tsx                    # ✅ Đã có - extend cho Couchbase
│   ├── TableInfoTab.tsx                  # ✅ Đã có - extend cho Collections
│   ├── TableDataView.tsx                 # ✅ Đã có - extend cho Documents
│   ├── QueryEditor.tsx                   # ✅ Đã có - support N1QL
│   ├── connections/
│   │   └── ConnectionFormModal.tsx       # ✅ Đã có - extend cho Couchbase fields
│   └── ui/                               # ✅ Đã có - tái sử dụng
│       ├── Input.tsx
│       ├── Button.tsx
│       ├── Modal.tsx
│       └── ...
├── hooks/
│   └── useDatabase.ts                    # ✅ Đã có - extend hooks cho Couchbase
├── services/
│   └── connectionApi.ts                 # ✅ Đã có - API calls
├── types/
│   └── database.ts                       # ✅ Đã có - extend types
└── constants/
    └── databaseTypes.ts                  # ⚠️ Cần thêm Couchbase vào DATABASE_TYPES
```

## Connection Form UI Patterns

### Cấu trúc hiện tại: `ConnectionFormModal.tsx`

**File**: `frontend/src/components/connections/ConnectionFormModal.tsx`

Form hiện tại đã có tabs: General, SSH, SSL, Advanced. Cần extend để support Couchbase-specific fields.

### Couchbase-Specific Fields (extend formData hiện có)

```typescript
// Extend formData trong ConnectionFormModal.tsx
interface CouchbaseConnectionForm extends BaseConnectionForm {
  // Basic Connection (đã có trong formData)
  name: string;
  type: 'couchbase';
  host: string;
  port: string; // "8091" hoặc "11210"
  database: string; // Bucket name (optional)
  user: string; // Username
  password: string;
  
  // Couchbase-specific (thêm vào Advanced tab)
  connectionString?: string; // "couchbase://host1,host2,host3"
  tlsEnabled?: boolean; // Extend SSL tab
  tlsVerify?: boolean;
  tlsCaCert?: string;
  queryTimeout?: number;
  kvTimeout?: number;
}
```

### Implementation Pattern (theo cấu trúc hiện tại)

```tsx
// Trong ConnectionFormModal.tsx - General tab
{formData.type === 'couchbase' && (
  <div className="grid gap-2">
    <label className="text-sm text-text-secondary">
      Bucket (Optional)
    </label>
    <Input
      value={formData.database}
      onChange={(e) => handleChange('database', e.target.value)}
      placeholder="default"
    />
  </div>
)}

// Trong ConnectionFormModal.tsx - SSL tab (extend)
{formData.type === 'couchbase' && (
  <>
    <Checkbox
      label="Enable TLS"
      checked={formData.tlsEnabled || false}
      onChange={(checked) => handleChange('tlsEnabled', checked)}
    />
    {formData.tlsEnabled && (
      <Textarea
        label="CA Certificate (PEM)"
        value={formData.tlsCaCert || ''}
        onChange={(e) => handleChange('tlsCaCert', e.target.value)}
      />
    )}
  </>
)}
```

### Database Types Constant

**File**: `frontend/src/constants/databaseTypes.ts`

```typescript
// Thêm vào DATABASE_TYPES array
{ 
  id: 'couchbase', 
  name: 'Couchbase', 
  abbreviation: 'Cb', 
  color: 'bg-green-600', 
  isAvailable: true 
}
```

### Connection String Parsing

Nếu user nhập connection string format (`couchbase://host1,host2,host3`), parse và extract:
- Hosts list
- Port (nếu có)
- Bucket (nếu có trong string)
- TLS settings

## Schema Browser UI Patterns

### Cấu trúc hiện tại: `SchemaTree.tsx`

**File**: `frontend/src/components/SchemaTree.tsx`

SchemaTree hiện tại sử dụng:
- `Collapsible.Root` từ `@radix-ui/react-collapsible`
- `SchemaNode` component cho mỗi schema
- `ObjectFolder` component cho Tables/Views/Functions
- Hooks: `useSchemas()`, `useTables()`, `useViews()`, `useFunctions()`

### Implementation Pattern cho Couchbase

**Bucket = Database Level** (hiển thị như database trong tree)

```tsx
// Trong SchemaTree.tsx - Bucket hiển thị như database
// useDatabases() hook sẽ trả về buckets cho Couchbase
const { data: databases = [] } = useDatabases(connectionId);
// Backend API: GET /api/connections/:id/databases
// → Trả về buckets cho Couchbase

// Bucket được hiển thị như database node (nếu connectionType === 'couchbase')
{databases.map(bucket => (
  <SchemaNode
    key={bucket}
    schemaName={bucket} // Bucket name
    connectionId={connectionId}
    connectionType="couchbase"
    // ... other props
  />
))}
```

**Scope = Schema Node** (sử dụng SchemaNode component hiện có)

```tsx
// Trong SchemaNode component - Scope hiển thị như schema
// useSchemas() hook sẽ trả về scopes cho Couchbase
const { data: schemas = [] } = useSchemas(connectionId);
// Backend API: GET /api/connections/:id/schemas?database=<bucket>
// → Trả về scopes cho Couchbase bucket

// Scope được hiển thị như schema node
<SchemaNode
  schemaName={scope} // Scope name (e.g., "_default")
  connectionId={connectionId}
  connectionType="couchbase"
/>
```

**Collection = Table** (sử dụng ObjectFolder "Tables" hiện có)

```tsx
// Trong SchemaNode component - Collections hiển thị như tables
// useTables() hook sẽ trả về collections cho Couchbase
const { data: tables = [] } = useTables(connectionId, scope);
// Backend API: GET /api/connections/:id/tables?schema=<scope>&database=<bucket>
// → Trả về collections cho Couchbase scope

// Collections được hiển thị trong ObjectFolder "Tables"
<ObjectFolder title="Collections" icon={<Table />} count={tables.length}>
  {tables.map(collection => (
    <TableItem
      key={collection.name}
      table={collection} // Collection info
      onClick={() => handleTableClick(collection)}
      // ... context menu items
    />
  ))}
</ObjectFolder>
```

### Context Menu Pattern (theo cấu trúc hiện có)

```tsx
// Trong SchemaNode - extend context menu cho Couchbase
{connectionType === 'couchbase' && (
  <>
    <ContextMenuItem onClick={() => viewCollectionDocuments(collection)}>
      View Documents
    </ContextMenuItem>
    <ContextMenuItem onClick={() => viewCollectionIndexes(collection)}>
      View Indexes
    </ContextMenuItem>
    <ContextMenuSeparator />
    <ContextMenuItem onClick={() => queryCollection(collection)}>
      Query Collection
    </ContextMenuItem>
  </>
)}
```

### Collection Detail View (sử dụng TableInfoTab hiện có)

**File**: `frontend/src/components/TableInfoTab.tsx`

TableInfoTab hiện tại có tabs: overview, columns, constraints, indexes, triggers, stats, partitions, dependencies, permissions.

**Pattern**: Extend TableInfoTab để support Collections

```tsx
// Trong TableInfoTab.tsx - detect Couchbase và adjust tabs
const { data: connection } = useQuery({
  queryKey: ['connection', connectionId],
  queryFn: () => connectionId ? connectionApi.getById(connectionId) : null
});

const isCouchbase = connection?.type === 'couchbase';

// Tabs cho Couchbase Collections
const couchbaseTabs: InfoTabKey[] = [
  'overview',    // Collection metadata
  'columns',     // Document fields (inferred)
  'indexes',     // GSI indexes
  'stats'        // Document count, size
];

// Tabs cho SQL databases (giữ nguyên)
const sqlTabs: InfoTabKey[] = [
  'overview', 'columns', 'constraints', 'indexes', 
  'triggers', 'stats', 'partitions', 'dependencies', 'permissions'
];

const availableTabs = isCouchbase ? couchbaseTabs : sqlTabs;
```

**Collection Info trong Overview Tab**:

```tsx
// Trong TableInfoTab.tsx - Overview tab
{isCouchbase && (
  <div className="space-y-4">
    <TableMetadata
      name={table}
      schema={schema}
      // Couchbase-specific metadata
      documentCount={collectionStats?.documentCount}
      size={collectionStats?.size}
      ttl={collectionStats?.ttl}
    />
  </div>
)}
```

**Documents trong Columns Tab** (hiển thị document fields):

```tsx
// useColumns() hook sẽ trả về document fields (inferred từ sample documents)
const { data: columns = [] } = useColumns(connectionId, schema, table);
// Backend API: GET /api/connections/:id/columns?schema=<scope>&table=<collection>
// → Trả về inferred fields từ documents

// Hiển thị như columns table (giữ nguyên ColumnsDetailsTable component)
<ColumnsDetailsTable columns={columns} />
```

## Query Editor UI Patterns

### Cấu trúc hiện tại: `QueryEditor.tsx`

**File**: `frontend/src/components/QueryEditor.tsx`

QueryEditor hiện tại sử dụng:
- CodeMirror editor với SQL syntax highlighting
- `useQueryExecution` hook từ `query-editor/useQueryExecution.ts`
- Query toolbar với Execute, Explain, Format, History, Save
- Results display trong `QueryResults` component

### Implementation Pattern cho N1QL

**1. N1QL Syntax Highlighting** (extend CodeMirror)

```tsx
// Trong QueryEditor.tsx - detect language
const connectionType = connection?.type;
const language = connectionType === 'couchbase' ? 'n1ql' : 'sql';

// CodeMirror language mode
import { n1ql } from '@codemirror/lang-n1ql'; // Cần install hoặc custom
// Hoặc extend SQL mode với N1QL keywords

const editorExtensions = useMemo(() => {
  const baseExtensions = [
    // ... existing extensions
  ];
  
  if (language === 'n1ql') {
    baseExtensions.push(
      n1ql(), // N1QL language support
      // Custom N1QL autocomplete
      n1qlAutocomplete()
    );
  }
  
  return baseExtensions;
}, [language]);
```

**2. N1QL Autocomplete** (extend useQueryCompletion)

**File**: `frontend/src/components/query-editor/useQueryCompletion.ts`

```tsx
// Extend useQueryCompletion hook để support N1QL
export function useQueryCompletion(connectionId?: string, language?: string) {
  const { data: connection } = useQuery({
    queryKey: ['connection', connectionId],
    queryFn: () => connectionId ? connectionApi.getById(connectionId) : null
  });
  
  const isN1QL = language === 'n1ql' || connection?.type === 'couchbase';
  
  // N1QL-specific completions
  const n1qlCompletions = useMemo(() => {
    if (!isN1QL) return [];
    
    return [
      // Keywords
      ...N1QL_KEYWORDS.map(kw => ({ label: kw, type: 'keyword' })),
      // Functions
      ...N1QL_FUNCTIONS.map(fn => ({ label: fn, type: 'function' })),
      // Context-aware: buckets, scopes, collections
      ...(await getBucketsCompletions(connectionId)),
      ...(await getCollectionsCompletions(connectionId, bucket, scope))
    ];
  }, [isN1QL, connectionId]);
  
  return isN1QL ? n1qlCompletions : sqlCompletions;
}
```

**3. Query Execution** (sử dụng useQueryExecution hiện có)

```tsx
// useQueryExecution hook đã có - chỉ cần backend support N1QL
// Backend API: POST /api/connections/:id/query
// → Execute N1QL query và trả về QueryResult

// QueryEditor.tsx - giữ nguyên logic execution
const { executeQuery, isExecuting, results } = useQueryExecution(connectionId);
// Hook tự động detect query type và gọi đúng API endpoint
```

**4. Results Display** (sử dụng QueryResults component hiện có)

```tsx
// QueryResults component đã có - support JSON results
// Trong QueryResults.tsx - detect Couchbase và format accordingly
{connectionType === 'couchbase' ? (
  <JSONViewer data={results.rows} /> // JSON format cho N1QL results
) : (
  <DataGrid columns={results.columns} rows={results.rows} /> // Table format cho SQL
)}
```

### N1QL Autocomplete Constants

**File**: `frontend/src/components/query-editor/n1qlCompletions.ts` (mới)

```typescript
export const N1QL_KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'GROUP BY', 'ORDER BY',
  'LIMIT', 'OFFSET', 'LET', 'LETTING', 'UNNEST',
  'INSERT', 'UPDATE', 'DELETE', 'UPSERT',
  'CREATE INDEX', 'DROP INDEX', 'EXPLAIN',
  'USE KEYS', 'USE INDEX', 'NEST', 'ARRAY'
];

export const N1QL_FUNCTIONS = [
  'COUNT()', 'SUM()', 'AVG()', 'MIN()', 'MAX()',
  'ARRAY_LENGTH()', 'ARRAY_CONTAINS()', 'ARRAY_AGG()',
  'META()', 'UUID()', 'NOW()', 'STR_TO_MILLIS()'
];

// Context-aware completions sử dụng useDatabase hooks
export async function getN1QLCompletions(
  connectionId: string,
  editor: EditorView,
  position: number
) {
  const { data: databases } = useDatabases(connectionId);
  const { data: schemas } = useSchemas(connectionId);
  const { data: tables } = useTables(connectionId, schema);
  
  // Parse query context để suggest đúng
  // Suggest buckets sau FROM
  // Suggest scopes sau bucket
  // Suggest collections sau scope
  // Suggest fields sau SELECT hoặc trong WHERE
}
```

### Query Results Display (sử dụng QueryResults component hiện có)

**File**: `frontend/src/components/query-editor/QueryResults.tsx`

```tsx
// Trong QueryResults.tsx - detect Couchbase và format accordingly
const { data: connection } = useQuery({
  queryKey: ['connection', connectionId],
  queryFn: () => connectionId ? connectionApi.getById(connectionId) : null
});

const isCouchbase = connection?.type === 'couchbase';

// Results display
{isCouchbase ? (
  // JSON format cho N1QL results (mỗi row là một JSON object)
  <div className="space-y-2">
    {results.rows.map((row, idx) => (
      <JSONViewer
        key={idx}
        data={row}
        expandLevel={2}
        searchable={true}
      />
    ))}
  </div>
) : (
  // Table format cho SQL results (giữ nguyên)
  <DataGrid
    columns={results.columns}
    rows={results.rows}
    sortable={true}
    filterable={true}
  />
)}

// Explain results (giữ nguyên ExecutionPlanView component)
{isExplain && (
  <ExecutionPlanView
    plan={explainPlan}
    format={isCouchbase ? 'json' : 'tree'}
  />
)}
```

## Document Viewer UI Patterns

### Cấu trúc hiện tại: `TableDataView.tsx`

**File**: `frontend/src/components/TableDataView.tsx`

TableDataView hiện tại có tabs: 'data', 'structure', 'info'. Sử dụng:
- `TableDataTab` component cho data view
- `TableStructureTab` component cho structure view
- `TableInfoTab` component cho info view
- `DataGrid` component để hiển thị data
- `useTableData()` hook để fetch data

### Implementation Pattern cho Documents

**1. Documents trong Data Tab** (sử dụng TableDataTab hiện có)

```tsx
// Trong TableDataView.tsx - Documents hiển thị như table data
// useTableData() hook sẽ trả về documents cho Couchbase
const { data: tableData } = useTableData(
  connectionId,
  scope,      // Schema = Scope
  collection, // Table = Collection
  pageSize,
  offset
);
// Backend API: GET /api/connections/:id/query?schema=<scope>&table=<collection>
// → Trả về documents như QueryResult với rows là JSON objects

// TableDataTab component đã có - chỉ cần format JSON rows
<TableDataTab
  data={tableData}
  columns={inferredColumns} // Inferred từ sample documents
  // ... other props
/>
```

**2. Document Display trong DataGrid** (extend DataGrid component)

**File**: `frontend/src/components/DataGrid.tsx`

```tsx
// Trong DataGrid.tsx - detect Couchbase và format JSON cells
const isCouchbase = connection?.type === 'couchbase';

{isCouchbase ? (
  // JSON cells cho Couchbase documents
  <td className="...">
    <JSONViewer
      data={cellValue}
      compact={true}
      expandable={true}
    />
  </td>
) : (
  // Regular cells cho SQL tables (giữ nguyên)
  <td className="...">{cellValue}</td>
)}
```

**3. Document Editor** (sử dụng ObjectDefinitionModal hoặc tạo modal mới)

**File**: `frontend/src/components/ObjectDefinitionModal.tsx` (extend)

```tsx
// Extend ObjectDefinitionModal để support document editing
{connectionType === 'couchbase' && objectType === 'document' && (
  <DocumentEditorModal>
    <CodeEditor
      language="json"
      value={documentContent}
      onChange={setDocumentContent}
      validateJSON={true}
    />
    <DocumentMeta>
      <MetaItem label="Document ID" value={documentId} />
      <MetaItem label="CAS" value={documentCas} />
      <MetaItem label="Expiry" value={documentExpiry} />
    </DocumentMeta>
    <ModalFooter>
      <Button onClick={saveDocument}>Save</Button>
      <Button onClick={deleteDocument} danger>Delete</Button>
    </ModalFooter>
  </DocumentEditorModal>
)}
```

**4. Document Structure Tab** (sử dụng TableStructureTab hiện có)

```tsx
// TableStructureTab đã có - hiển thị columns (document fields)
// useColumns() hook sẽ trả về inferred fields từ documents
const { data: columns = [] } = useColumns(connectionId, scope, collection);
// Backend API: GET /api/connections/:id/columns?schema=<scope>&table=<collection>
// → Trả về inferred fields từ sample documents

<TableStructureTab
  columns={columns}
  // ... other props
/>
```

## Index Management UI Patterns

### Cấu trúc hiện tại: `IndexesSection.tsx`

**File**: `frontend/src/components/table-info/IndexesSection.tsx`

IndexesSection hiện tại sử dụng:
- `useIndexes()` hook để fetch indexes
- Hiển thị index list với name, type, columns, unique flag
- Create index functionality

### Implementation Pattern cho Couchbase Indexes

**1. Indexes trong TableInfoTab** (sử dụng IndexesSection hiện có)

```tsx
// Trong TableInfoTab.tsx - Indexes tab
// useIndexes() hook sẽ trả về GSI indexes cho Couchbase
const { data: indexes = [] } = useIndexes(connectionId, scope, collection);
// Backend API: GET /api/connections/:id/indexes?schema=<scope>&table=<collection>
// → Trả về GSI indexes cho Couchbase collection

// IndexesSection component đã có - chỉ cần format cho Couchbase
<IndexesSection
  indexes={indexes}
  connectionId={connectionId}
  schema={scope}
  table={collection}
  onIndexCreated={handleIndexCreated}
/>
```

**2. Index Display** (extend IndexesSection component)

**File**: `frontend/src/components/table-info/IndexesSection.tsx`

```tsx
// Trong IndexesSection.tsx - detect Couchbase và format accordingly
const isCouchbase = connection?.type === 'couchbase';

{indexes.map(index => (
  <tr key={index.name}>
    <td>{index.name}</td>
    <td>
      {isCouchbase ? (
        <Badge>{index.type}</Badge> // GSI, FTS, etc.
      ) : (
        <Badge>{index.type}</Badge> // B-tree, Hash, etc.
      )}
    </td>
    <td>
      {isCouchbase ? (
        <CodeSnippet>{index.keys}</CodeSnippet> // N1QL keys expression
      ) : (
        <span>{index.columns.join(', ')}</span> // Column names
      )}
    </td>
    {isCouchbase && (
      <td>
        <StatusBadge status={index.state}>
          {index.state} {/* online, building, pending */}
        </StatusBadge>
      </td>
    )}
    {isCouchbase && index.state === 'building' && (
      <td>
        <ProgressBar value={index.progress} />
      </td>
    )}
    <td>
      <DropdownMenu>
        {isCouchbase && index.state !== 'online' && (
          <MenuItem onClick={() => rebuildIndex(index)}>
            Rebuild
          </MenuItem>
        )}
        <MenuItem onClick={() => dropIndex(index)} danger>
          Drop
        </MenuItem>
      </DropdownMenu>
    </td>
  </tr>
))}
```

**3. Create Index Modal** (extend hoặc tạo mới)

**File**: `frontend/src/components/table-info/CreateIndexModal.tsx` (mới hoặc extend)

```tsx
// Create index modal cho Couchbase
{isCouchbase ? (
  <CreateCouchbaseIndexModal>
    <Input
      label="Index Name"
      placeholder="idx_collection_field"
      required
      pattern="^[a-zA-Z][a-zA-Z0-9_]*$"
    />
    
    <Select
      label="Index Type"
      options={[
        { value: "gsi", label: "GSI (Global Secondary Index)" },
        { value: "fts", label: "FTS (Full Text Search)" }
      ]}
    />
    
    <Textarea
      label="Index Keys (N1QL expression)"
      placeholder='(`field1`, `field2`)'
      required
    />
    
    <Checkbox label="Defer Build" />
    
    <CodeEditor
      label="Index Definition (N1QL)"
      value={indexDefinition}
      onChange={setIndexDefinition}
      language="n1ql"
    />
  </CreateCouchbaseIndexModal>
) : (
  // SQL index creation (giữ nguyên)
  <CreateSQLIndexModal>...</CreateSQLIndexModal>
)}
```

## Capabilities-Based UI Gating

### Capability Checks

```typescript
interface CouchbaseCapabilities {
  // Query & Execution
  query: boolean;                    // N1QL queries
  explain: boolean;                  // EXPLAIN queries
  dml: boolean;                      // INSERT, UPDATE, DELETE
  
  // Schema Browsing
  schema_browser: boolean;           // Browse buckets/scopes/collections
  list_buckets: boolean;             // List buckets
  list_scopes: boolean;              // List scopes
  list_collections: boolean;         // List collections
  
  // Document Operations
  document_preview: boolean;         // Preview documents
  document_edit: boolean;            // Edit documents
  document_create: boolean;          // Create documents
  document_delete: boolean;          // Delete documents
  
  // Index Management
  index_list: boolean;               // List indexes
  index_create: boolean;             // Create indexes
  index_drop: boolean;               // Drop indexes
  index_rebuild: boolean;            // Rebuild indexes
  
  // Advanced Features
  views: boolean;                    // MapReduce views
  fts: boolean;                      // Full Text Search
  analytics: boolean;                // Analytics queries
  eventing: boolean;                 // Eventing functions
  transactions: boolean;             // ACID transactions
  
  // Metadata
  column_metadata: 'full' | 'partial' | 'none';
  schema_inference: boolean;         // Infer schema from documents
}
```

### UI Component Gating

```tsx
// Hide unsupported features based on capabilities
{capabilities.document_edit && (
  <Button onClick={editDocument}>Edit Document</Button>
)}

{capabilities.index_create && (
  <CreateIndexButton onClick={createIndex} />
)}

{!capabilities.transactions && (
  <Tooltip content="Transactions not supported">
    <Button disabled>Start Transaction</Button>
  </Tooltip>
)}
```

## Error Handling & User Feedback

### Couchbase-Specific Errors

```typescript
const errorMessages = {
  // Connection Errors
  'authentication_failed': 'Authentication failed. Please check username and password.',
  'cluster_not_found': 'Cluster not found. Please check host and port.',
  'timeout': 'Connection timeout. Please check network connectivity.',
  
  // Query Errors
  'syntax_error': 'N1QL syntax error. Please check your query.',
  'index_not_found': 'Index not found. Please create the index first.',
  'bucket_not_found': 'Bucket not found. Please check bucket name.',
  'scope_not_found': 'Scope not found. Please check scope name.',
  'collection_not_found': 'Collection not found. Please check collection name.',
  
  // Document Errors
  'document_not_found': 'Document not found.',
  'cas_mismatch': 'Document was modified by another operation. Please refresh and try again.',
  'document_too_large': 'Document exceeds maximum size limit.',
  
  // Index Errors
  'index_already_exists': 'Index with this name already exists.',
  'index_building': 'Index is still building. Please wait.',
  'index_not_online': 'Index is not online. Please rebuild the index.',
};
```

### Error Display Components

```tsx
<ErrorDisplay error={error}>
  <ErrorIcon type={error.type} />
  <ErrorTitle>{error.title}</ErrorTitle>
  <ErrorMessage>{error.message}</ErrorMessage>
  
  {error.details && (
    <ErrorDetails>
      <CodeBlock>{error.details}</CodeBlock>
    </ErrorDetails>
  )}
  
  {error.suggestions && (
    <ErrorSuggestions>
      {error.suggestions.map(suggestion => (
        <Suggestion onClick={suggestion.action}>
          {suggestion.text}
        </Suggestion>
      ))}
    </ErrorSuggestions>
  )}
</ErrorDisplay>
```

## Performance Optimization Patterns

### Lazy Loading

```tsx
// Lazy load collections khi expand scope
<ScopeNode
  scope={scope}
  onExpand={async () => {
    if (!collectionsLoaded) {
      setLoading(true);
      const cols = await loadCollections(scope);
      setCollections(cols);
      setCollectionsLoaded(true);
    }
  }}
/>

// Virtual scrolling cho document list
<VirtualizedList
  items={documents}
  itemHeight={60}
  renderItem={renderDocument}
  onLoadMore={loadMoreDocuments}
/>
```

### Caching Strategy

```typescript
// Cache bucket list
const bucketCache = new Map<string, Bucket[]>();

// Cache collection metadata
const collectionCache = new Map<string, Collection>();

// Cache query results (short-lived)
const queryResultCache = new LRUCache({
  max: 50,
  ttl: 60000 // 1 minute
});
```

## Testing Patterns

### Component Testing

```tsx
describe('CouchbaseConnectionForm', () => {
  it('should validate required fields', () => {
    // Test validation
  });
  
  it('should parse connection string', () => {
    // Test connection string parsing
  });
  
  it('should handle TLS options', () => {
    // Test TLS configuration
  });
});

describe('DocumentViewer', () => {
  it('should display document JSON', () => {
    // Test JSON rendering
  });
  
  it('should validate JSON on edit', () => {
    // Test JSON validation
  });
  
  it('should handle CAS mismatch errors', () => {
    // Test error handling
  });
});
```

### Integration Testing

```typescript
describe('Couchbase Integration', () => {
  it('should connect to Couchbase cluster', async () => {
    // Test connection
  });
  
  it('should list buckets and collections', async () => {
    // Test schema browsing
  });
  
  it('should execute N1QL queries', async () => {
    // Test query execution
  });
  
  it('should create and delete documents', async () => {
    // Test document operations
  });
});
```

## Best Practices

### 1. Consistent Terminology (theo cấu trúc hiện tại)

**Mapping trong code:**
- Bucket → Database (trong code, sử dụng `database` field)
- Scope → Schema (trong code, sử dụng `schema` field)
- Collection → Table (trong code, sử dụng `table` field)
- Document → Row (trong code, sử dụng `row` trong QueryResult)

**UI Labels (hiển thị cho user):**
- Hiển thị "Bucket" thay vì "Database" trong tooltips và labels khi `connectionType === 'couchbase'`
- Hiển thị "Scope" thay vì "Schema" trong tooltips và labels
- Hiển thị "Collection" thay vì "Table" trong tooltips và labels
- Hiển thị "Document" thay vì "Row" trong tooltips và labels

**Implementation Pattern:**

```tsx
// Trong components - conditional labels
const label = connectionType === 'couchbase' ? 'Bucket' : 'Database';
const tableLabel = connectionType === 'couchbase' ? 'Collection' : 'Table';
```

### 2. JSON-First Approach

- Hiển thị documents dưới dạng JSON (formatted)
- Cho phép edit JSON trực tiếp
- Validate JSON syntax trước khi save
- Highlight JSON syntax errors

### 3. Query-First Workflow

- N1QL query editor là primary interface
- Autocomplete suggestions dựa trên schema
- Query history và saved queries
- Explain plan visualization

### 4. Performance Considerations

- Lazy load collections và documents
- Paginate document lists
- Cache frequently accessed metadata
- Virtual scrolling cho large lists

### 5. Error Handling

- User-friendly error messages
- Actionable error suggestions
- Retry mechanisms cho transient errors
- CAS conflict handling

## Implementation Checklist

### Phase 1: Basic Connection & Schema Browser

**Files cần sửa đổi:**

- [ ] `frontend/src/constants/databaseTypes.ts`
  - [ ] Thêm Couchbase vào `DATABASE_TYPES` array
  
- [ ] `frontend/src/components/connections/ConnectionFormModal.tsx`
  - [ ] Extend formData để support Couchbase fields (bucket, TLS options)
  - [ ] Thêm Couchbase-specific fields trong General tab (Bucket field)
  - [ ] Extend SSL tab để support TLS options cho Couchbase
  
- [ ] `frontend/src/components/SchemaTree.tsx`
  - [ ] Extend SchemaNode để detect Couchbase connection type
  - [ ] Map Bucket → Database level (useDatabases hook)
  - [ ] Map Scope → Schema level (useSchemas hook)
  - [ ] Map Collection → Table level (useTables hook)
  - [ ] Extend context menu cho Collections
  
- [ ] `frontend/src/components/TableInfoTab.tsx`
  - [ ] Detect Couchbase connection và filter tabs
  - [ ] Extend Overview tab để hiển thị Collection metadata
  - [ ] Extend Columns tab để hiển thị inferred document fields

**Backend API cần implement:**

- [ ] `GET /api/connections/:id/databases` → Trả về buckets cho Couchbase
- [ ] `GET /api/connections/:id/schemas?database=<bucket>` → Trả về scopes
- [ ] `GET /api/connections/:id/tables?schema=<scope>&database=<bucket>` → Trả về collections
- [ ] `GET /api/connections/:id/columns?schema=<scope>&table=<collection>` → Trả về inferred fields

### Phase 2: Query Editor

**Files cần sửa đổi:**

- [ ] `frontend/src/components/QueryEditor.tsx`
  - [ ] Detect Couchbase connection và set language = 'n1ql'
  - [ ] Extend CodeMirror extensions để support N1QL syntax
  
- [ ] `frontend/src/components/query-editor/useQueryCompletion.ts`
  - [ ] Extend để support N1QL keywords và functions
  - [ ] Add context-aware completions (buckets, scopes, collections)
  
- [ ] `frontend/src/components/query-editor/QueryResults.tsx`
  - [ ] Detect Couchbase và format results as JSON
  - [ ] Extend để hiển thị JSON objects thay vì table format
  
- [ ] `frontend/src/components/query-editor/n1qlCompletions.ts` (mới)
  - [ ] Tạo file với N1QL keywords và functions constants
  - [ ] Implement context-aware completion logic

**Backend API cần implement:**

- [ ] `POST /api/connections/:id/query` → Execute N1QL queries
- [ ] `POST /api/connections/:id/query?explain=true` → Explain N1QL queries

### Phase 3: Document Management

**Files cần sửa đổi:**

- [ ] `frontend/src/components/TableDataView.tsx`
  - [ ] Detect Couchbase và format documents trong Data tab
  - [ ] Extend để support JSON document editing
  
- [ ] `frontend/src/components/DataGrid.tsx`
  - [ ] Detect Couchbase và format cells as JSON
  - [ ] Add JSON viewer component cho document cells
  
- [ ] `frontend/src/components/table-data/TableDataTab.tsx`
  - [ ] Extend để support document operations (create, edit, delete)
  - [ ] Add JSON editor cho document editing
  
- [ ] `frontend/src/components/ObjectDefinitionModal.tsx` (hoặc tạo DocumentEditorModal mới)
  - [ ] Extend để support document editing
  - [ ] Add JSON editor với validation
  - [ ] Display document metadata (CAS, expiry, size)

**Backend API cần implement:**

- [ ] `GET /api/connections/:id/query?schema=<scope>&table=<collection>` → Trả về documents
- [ ] `POST /api/connections/:id/documents` → Create document
- [ ] `PUT /api/connections/:id/documents/:id` → Update document
- [ ] `DELETE /api/connections/:id/documents/:id` → Delete document

### Phase 4: Index Management

**Files cần sửa đổi:**

- [ ] `frontend/src/components/table-info/IndexesSection.tsx`
  - [ ] Detect Couchbase và format index display
  - [ ] Add index state (online, building, pending) và progress
  - [ ] Add rebuild index functionality
  
- [ ] `frontend/src/components/table-info/CreateIndexModal.tsx` (mới hoặc extend)
  - [ ] Create modal cho Couchbase index creation
  - [ ] Support GSI và FTS index types
  - [ ] Add N1QL index definition editor

**Backend API cần implement:**

- [ ] `GET /api/connections/:id/indexes?schema=<scope>&table=<collection>` → Trả về GSI indexes
- [ ] `POST /api/connections/:id/indexes` → Create index (N1QL CREATE INDEX)
- [ ] `DELETE /api/connections/:id/indexes/:name` → Drop index
- [ ] `POST /api/connections/:id/indexes/:name/rebuild` → Rebuild index

### Phase 5: Advanced Features (Optional)

- [ ] FTS index management (Full Text Search)
- [ ] Analytics query support
- [ ] Eventing function management
- [ ] Transaction support (nếu Couchbase SDK support)

## References

- [Couchbase N1QL Documentation](https://docs.couchbase.com/server/current/n1ql/n1ql-language-reference/index.html)
- [Couchbase SDK Documentation](https://docs.couchbase.com/)
- [Couchbase Web Console UI Patterns](https://docs.couchbase.com/server/current/manage/manage-ui/manage-ui.html)
