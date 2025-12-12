# API Documentation

## Connections

### Get All Connections
`GET /api/connections`
Returns a list of all saved connections.

### Get Connection by ID
`GET /api/connections/:id`
Returns details of a specific connection.

### Create Connection
`POST /api/connections`
Body:
```json
{
  "name": "My DB",
  "db_type": "postgres",
  "host": "localhost",
  "port": 5432,
  "database": "mydb",
  "username": "user",
  "password": "password",
  "ssl": false
}
```

### Update Connection
`PUT /api/connections/:id`
Body: Same as Create Connection.

### Delete Connection
`DELETE /api/connections/:id`

### Test Connection
`POST /api/connections/test`
Body: Same as Create Connection (without saving).

## Schema & Data

### List Databases
`GET /api/connections/:id/databases`
Returns a list of database names.

### Create Database (Postgres)
`POST /api/connections/:id/databases`
Body:
```json
{
  "name": "my_new_db"
}
```

### Drop Database (Postgres)
`DELETE /api/connections/:id/databases/:name`

### Get Schemas
`GET /api/connections/:id/schemas`
Returns a list of schema names.

### Create Schema (Postgres)
`POST /api/connections/:id/schemas`
Body:
```json
{
  "name": "my_new_schema"
}
```

### Drop Schema (Postgres)
`DELETE /api/connections/:id/schemas/:name`

### Get Tables
`GET /api/connections/:id/tables?schema=public`
Returns a list of tables in the specified schema.

### Get Columns
`GET /api/connections/:id/columns?schema=public&table=users`
Returns column definitions for the specified table.

### Get Table Data
`GET /api/connections/:id/query?schema=public&table=users&limit=100&offset=0`
Returns rows from the specified table.

## Query Execution

### Execute Query
`POST /api/connections/:id/execute`
Body:
```json
{
  "query": "SELECT * FROM users"
}
```
Returns:
```json
{
  "columns": ["id", "name", "email"],
  "rows": [[1, "Alice", "alice@example.com"], ...],
  "affected_rows": 0
}
```

## Saved Queries & History

### Get Saved Queries
`GET /api/connections/:id/saved-queries`

### Save Query
`POST /api/connections/:id/saved-queries`
Body:
```json
{
  "name": "My Query",
  "description": "Selects all users",
  "sql": "SELECT * FROM users",
  "tags": []
}
```

### Get Query History
`GET /api/connections/:id/history`
