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
        schema: string;
        columns: ColumnInfo[];
        primaryKeys: string[];
    };
}

export interface EREdge {
    id: string;
    source: string;
    target: string;
    sourceHandle?: string;
    targetHandle?: string;
    label?: string;
    animated?: boolean;
    data: {
        constraintName: string;
        columnName: string;
        referencedColumnName: string;
        onDelete: string;
        onUpdate: string;
    };
}

export interface ColumnInfo {
    name: string;
    type: string;
    isPrimaryKey: boolean;
    isForeignKey: boolean;
    isNullable: boolean;
}

export interface ERDiagramData {
    nodes: ERNode[];
    edges: EREdge[];
}
