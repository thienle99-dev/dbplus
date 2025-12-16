# Schema Diff Tool - Scope & Design

## Objective

Enable users to compare two database schemas (e.g., Development vs. Production, or Local vs. Remote) to identify structural differences and generate synchronization scripts.

## Scope of Comparison

The tool will compare the following database objects:

1.  **Tables**:
    - Existence (Table added/removed).
    - Columns: Name, Data Type, Nullability, Default Values.
    - Primary Keys.
2.  **Constraints**:
    - Foreign Keys (Source/Target columns, Cascade rules).
    - Unique Constraints.
    - Check Constraints.
3.  **Indexes**:
    - Index Name, Columns, Uniqueness, Method (B-tree, etc.).
4.  **Views**:
    - Definition SQL (textual comparison).
5.  **Functions/Procedures**:
    - Signature (Arguments, Return Type).
    - Body Definition (textual comparison).

## Architecture

### Backend API

**Endpoint**: `POST /api/tools/schema-diff`

**Request Body**:

```json
{
  "source": {
    "connectionId": "uuid-...",
    "schema": "public"
  },
  "target": {
    "connectionId": "uuid-...",
    "schema": "public"
  }
}
```

**Response**:

```json
{
  "diffs": [
    {
      "objectType": "TABLE",
      "name": "users",
      "status": "MODIFIED", // ADDED, REMOVED, MODIFIED
      "changes": [
        { "type": "COLUMN_ADDED", "details": "email varchar(255)" },
        { "type": "COLUMN_TYPE_CHANGED", "details": "age: int -> bigint" }
      ]
    },
    {
      "objectType": "VIEW",
      "name": "active_users",
      "status": "MODIFIED",
      "diff": "..." // Unified Diff format
    }
  ]
}
```

### Frontend UI

1.  **Selection Screen**:

    - Left Panel: "Source" (Connection Dropdown -> Schema Dropdown).
    - Right Panel: "Target" (Connection Dropdown -> Schema Dropdown).
    - "Compare" Button.

2.  **Results View**:

    - **Summary**: "5 Tables Modified, 2 Views Added".
    - **Diff Explorer**: Tree view grouping objects by type and status.
      - Green icon for Added.
      - Red icon for Removed.
      - Yellow icon for Modified.
    - **Detail View**:
      - Clicking a modified table lists specific column/constraint changes.
      - Clicking a modified view/function shows a side-by-side Monaco Diff Editor.

3.  **Synchronization (Phase 2)**:
    - "Generate Migration Script" button.
    - Produces SQL to transform Target to match Source.

## Implementation Steps

1.  **Backend Service**: Implement `SchemaDiffService`.
    - Reuse `SchemaIntrospection` to fetch metadata from both sources.
    - Implement comparison logic (struct diffing).
2.  **API Layer**: Expose the endpoint.
3.  **Frontend**: Build `SchemaDiffTool` component.

## Limitations (v1)

- No data comparison (Schema structure only).
- No automatic migration execution (Script generation only).
