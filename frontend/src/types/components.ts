export interface TableDataViewProps {
  schema?: string;
  table?: string;
  database?: string;
}

export interface TableInfoTabProps {
  schema?: string;
  table?: string;
  database?: string;
}

export interface TableStructureTabProps {
  schema?: string;
  table?: string;
  database?: string;
}

export interface RightSidebarProps {
  connectionId?: string;
  schema?: string;
  table?: string;
}

export interface TableStatisticsProps {
  statistics: {
    row_count: number | null;
    table_size: number | null;
    index_size: number | null;
    total_size: number | null;
    created_at: string | null;
    last_modified: string | null;
  };
  onRefresh: () => void;
  loading?: boolean;
}

export interface ColumnsDetailsTableProps {
  columns: Array<{
    name: string;
    data_type: string;
    is_nullable: boolean;
    default_value: string | null;
    is_primary_key: boolean;
  }>;
  foreignKeys: Array<{
    constraint_name: string;
    column_name: string;
    foreign_schema: string;
    foreign_table: string;
    foreign_column: string;
    update_rule: string;
    delete_rule: string;
  }>;
  indexes: Array<{
    name: string;
    columns: string[];
  }>;
  onRefresh: () => void;
}
