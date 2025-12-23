export interface ColumnMetadata {
  table_name: string | null;
  column_name: string;
  is_primary_key: boolean;
  is_editable: boolean;
  schema_name: string | null;
}

export interface QueryResult {
  columns: string[];
  rows: any[][];
  affected_rows: number;
  column_metadata?: ColumnMetadata[];
  total_count?: number;
  limit?: number;
  offset?: number;
  has_more?: boolean;
  row_metadata?: Record<string, any>[];
  execution_time_ms?: number;
  json?: any;
  display_mode?: 'table' | 'json';
}

export type EditState = Record<string, Record<number, unknown>>;

export interface DatabaseType {
  id: string;
  name: string;
  abbreviation: string;
  color: string;
  isAvailable: boolean;
}

export interface CreateDatabaseOptions {
  owner?: string;
  template?: string;
  encoding?: string;
  lcCollate?: string;
  lcCtype?: string;
  tablespace?: string;
  allowConnections?: boolean;
  connectionLimit?: number;
  isTemplate?: boolean;
}

export interface CreateDatabaseRequest {
  name: string;
  options?: CreateDatabaseOptions;
}

export interface DatabaseManagementResponse {
  success: boolean;
  message: string;
}

export interface PermissionGrant {
  grantee: string;
  privilege: string;
  grantor?: string | null;
  is_grantable: boolean;
}

// Backend maps to TableGrant for all object types (schema, table, function)
export interface TableGrant {
  grantee: string;
  privilege: string;
  grantor?: string | null;
  is_grantable: boolean;
}

export interface RoleInfo {
  name: string;
  is_superuser: boolean;
  is_inherit: boolean;
  is_create_role: boolean;
  is_create_db: boolean;
  can_login: boolean;
  bypass_rls: boolean;
}
