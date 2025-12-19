import { Handle, Position } from 'reactflow';
import { Key, Database, Loader2 } from 'lucide-react';
import { ColumnInfo } from '../../types/foreignKey';

interface TableNodeData {
    label: string;
    tableName: string;
    schema: string;
    columns: ColumnInfo[];
    primaryKeys: string[];
    isLoadingColumns?: boolean;
    database?: string;
}

interface TableNodeProps {
    data: TableNodeData;
    selected?: boolean;
}

export default function TableNode({ data, selected }: TableNodeProps) {
    return (
        <div
            className={`
                bg-bg-1 border-2 rounded-lg shadow-lg min-w-[220px] max-w-[280px]
                transition-all duration-200
                ${selected
                    ? 'border-accent shadow-accent/20 shadow-xl'
                    : 'border-border hover:border-accent/50'
                }
            `}
        >
            {/* Header */}
            <div className="px-3 py-2 bg-gradient-to-r from-accent/20 to-accent/10 border-b-2 border-border rounded-t-md">
                <div className="flex items-center gap-2">
                    <Database size={14} className="text-accent shrink-0" />
                    <div className="font-semibold text-sm text-text-primary truncate">
                        {data.tableName}
                    </div>
                </div>
                {(data.schema || data.database) && (
                    <div className="text-[10px] text-text-tertiary mt-0.5 truncate">
                        {data.database ? `${data.database} . ` : ''}{data.schema}
                    </div>
                )}
            </div>

            {/* Columns */}
            <div className="p-2 max-h-[300px] overflow-y-auto">
                {data.isLoadingColumns ? (
                    <div className="space-y-2">
                        {/* Skeleton loading animation */}
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center gap-2 px-2 py-1.5 animate-pulse">
                                <div className="w-3 h-3 bg-bg-3 rounded"></div>
                                <div className="flex-1 space-y-1">
                                    <div className="h-3 bg-bg-3 rounded w-3/4"></div>
                                    <div className="h-2 bg-bg-3 rounded w-1/2"></div>
                                </div>
                            </div>
                        ))}
                        <div className="px-2 py-2 flex items-center justify-center gap-2 text-xs text-text-tertiary">
                            <Loader2 size={12} className="animate-spin text-accent" />
                            <span>Loading columns...</span>
                        </div>
                    </div>
                ) : data.columns.length === 0 ? (
                    <div className="px-2 py-3 text-xs text-text-tertiary text-center">
                        <div>No columns found</div>
                    </div>
                ) : (
                    data.columns.map((col, idx) => (
                        <div
                            key={idx}
                            className="relative flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-bg-2 rounded group"
                        >
                            {/* Primary Key Icon */}
                            {col.isPrimaryKey && (
                                <Key size={11} className="text-accent shrink-0" />
                            )}

                            {/* Column Name */}
                            <div className="flex-1 min-w-0">
                                <div className={`truncate ${col.isPrimaryKey ? 'font-semibold text-text-primary' : 'text-text-secondary'}`}>
                                    {col.name}
                                </div>
                                <div className="text-[10px] text-text-tertiary truncate">
                                    {col.type}
                                </div>
                            </div>

                            {/* Foreign Key Indicator */}
                            {col.isForeignKey && (
                                <div className="text-[10px] px-1 py-0.5 bg-accent/20 text-accent rounded shrink-0">
                                    FK
                                </div>
                            )}

                            {/* Connection Handles */}
                            <Handle
                                type="source"
                                position={Position.Right}
                                id={`${data.tableName}-${col.name}-source`}
                                className="!w-2 !h-2 !bg-accent !border-accent opacity-0 group-hover:opacity-100 transition-opacity"
                            />
                            <Handle
                                type="target"
                                position={Position.Left}
                                id={`${data.tableName}-${col.name}-target`}
                                className="!w-2 !h-2 !bg-accent !border-accent opacity-0 group-hover:opacity-100 transition-opacity"
                            />
                        </div>
                    ))
                )}
            </div>

            {/* Default handles for tables without columns */}
            <Handle
                type="source"
                position={Position.Right}
                id={`${data.tableName}-default-source`}
                className="!w-3 !h-3 !bg-accent !border-2 !border-white"
                style={{ top: '50%' }}
            />
            <Handle
                type="target"
                position={Position.Left}
                id={`${data.tableName}-default-target`}
                className="!w-3 !h-3 !bg-accent !border-2 !border-white"
                style={{ top: '50%' }}
            />

            {/* Footer with column count */}
            {data.columns.length > 0 && (
                <div className="px-3 py-1 bg-bg-2 border-t border-border rounded-b-md text-[10px] text-text-tertiary">
                    {data.columns.length} column{data.columns.length !== 1 ? 's' : ''}
                </div>
            )}
        </div>
    );
}
