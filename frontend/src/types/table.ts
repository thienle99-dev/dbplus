export interface TableColumn {
    name: string;
    data_type: string;
    is_nullable: boolean;
    default_value: string | null;
    is_primary_key: boolean;
}

export interface IndexInfo {
    name: string;
    columns: string[];
    is_unique: boolean;
    is_primary: boolean;
    algorithm?: string;
    condition?: string;
    include?: string[];
    comment?: string;
}

export interface ForeignKey {
    constraint_name: string; // Note: ColumnsDetailsTable had different fields, normalizing to the more complete one from TableInfoTab/ConstraintsSection
    column_name: string;
    foreign_schema: string;
    foreign_table: string;
    foreign_column: string;
    update_rule: string;
    delete_rule: string;
}

// ColumnsDetailsTable had a simpler ForeignKey interface.
// To handle this, I will check ColumnsDetailsTable usage.
// It uses: column_name, foreign_schema, foreign_table, foreign_column.
// Those are all present in the fuller interface above.
// However, ColumnsDetailsTable does NOT have constraint_name, update_rule, delete_rule in its local definition.
// But when TableInfoTab passes data to ColumnsDetailsTable, it passes data from `constraints.foreign_keys`, which DOES have those fields (fetched from backend).
// So using the superset interface is safe.

export interface CheckConstraint {
    constraint_name: string;
    check_clause: string;
}

export interface UniqueConstraint {
    constraint_name: string;
    columns: string[];
}

export interface TableConstraints {
    foreign_keys: ForeignKey[];
    check_constraints: CheckConstraint[];
    unique_constraints: UniqueConstraint[];
}

export interface TableStats {
    row_count: number | null;
    table_size: number | null;
    index_size: number | null;
    total_size: number | null;
    created_at: string | null;
    last_modified: string | null;
}

export interface ViewInfo {
    schema: string;
    name: string;
    definition: string;
    owner?: string;
    created_at?: string;
}

export interface FunctionInfo {
    schema: string;
    name: string;
    definition: string;
    return_type: string;
    language: string;
    owner?: string;
}

export interface FilterCondition {
    column: string;
    operator: string;
    value: string | null;
    logic: 'AND' | 'OR';
}

export interface FilterGroup {
    conditions: FilterCondition[];
    logic: 'AND' | 'OR';
}
