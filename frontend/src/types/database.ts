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
