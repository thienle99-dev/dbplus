export interface TableInfo {
  name: string;
  schema: string;
  table_type?: string;
}

export interface ViewInfo {
    name: string;
    schema: string;
    owner?: string;
    definition?: string;
}

export interface FunctionInfo {
    name: string;
    schema: string;
    owner?: string;
    language?: string;
    return_type?: string;
    definition?: string;
}

export interface SearchResult {
    schema: string;
    name: string;
    type: string;
}

export interface SchemaForeignKey {
    name: string;
    source_schema: string;
    source_table: string;
    source_column: string;
    target_schema: string;
    target_table: string;
    target_column: string;
}
