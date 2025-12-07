import { useState, useMemo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

interface TableColumn {
    name: string;
    data_type: string;
    is_nullable: boolean;
    default_value: string | null;
    is_primary_key: boolean;
}

interface ForeignKey {
    column_name: string;
    foreign_schema: string;
    foreign_table: string;
    foreign_column: string;
}

interface ColumnsDetailsTableProps {
    columns: TableColumn[];
    foreignKeys: ForeignKey[];
    indexes: { name: string; columns: string[] }[];
}

type SortField = 'name' | 'data_type' | 'nullable' | 'default';
type SortDirection = 'asc' | 'desc' | null;

export default function ColumnsDetailsTable({ columns, foreignKeys, indexes }: ColumnsDetailsTableProps) {
    const [sortField, setSortField] = useState<SortField | null>(null);
    const [sortDirection, setSortDirection] = useState<SortDirection>(null);

    // Create lookup maps for quick checks
    const fkColumns = useMemo(() => {
        const set = new Set<string>();
        foreignKeys.forEach(fk => set.add(fk.column_name));
        return set;
    }, [foreignKeys]);

    const indexedColumns = useMemo(() => {
        const set = new Set<string>();
        indexes.forEach(idx => {
            idx.columns.forEach(col => set.add(col));
        });
        return set;
    }, [indexes]);

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            // Cycle through: asc -> desc -> null
            if (sortDirection === 'asc') {
                setSortDirection('desc');
            } else if (sortDirection === 'desc') {
                setSortField(null);
                setSortDirection(null);
            }
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const sortedColumns = useMemo(() => {
        if (!sortField || !sortDirection) return columns;

        return [...columns].sort((a, b) => {
            let aVal: any;
            let bVal: any;

            switch (sortField) {
                case 'name':
                    aVal = a.name;
                    bVal = b.name;
                    break;
                case 'data_type':
                    aVal = a.data_type;
                    bVal = b.data_type;
                    break;
                case 'nullable':
                    aVal = a.is_nullable;
                    bVal = b.is_nullable;
                    break;
                case 'default':
                    aVal = a.default_value || '';
                    bVal = b.default_value || '';
                    break;
                default:
                    return 0;
            }

            if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }, [columns, sortField, sortDirection]);

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) {
            return <ArrowUpDown size={12} className="opacity-30" />;
        }
        return sortDirection === 'asc' ? (
            <ArrowUp size={12} className="text-accent" />
        ) : (
            <ArrowDown size={12} className="text-accent" />
        );
    };

    return (
        <div className="bg-bg-0 border border-border rounded overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-[10px] md:text-xs">
                    <thead className="bg-bg-1">
                        <tr>
                            <th className="border-b border-border px-2 md:px-3 py-1.5 md:py-2 text-left font-medium text-text-secondary whitespace-nowrap">
                                Icons
                            </th>
                            <th
                                className="border-b border-border px-2 md:px-3 py-1.5 md:py-2 text-left font-medium text-text-secondary whitespace-nowrap cursor-pointer hover:bg-bg-2"
                                onClick={() => handleSort('name')}
                            >
                                <div className="flex items-center gap-1">
                                    Name
                                    <SortIcon field="name" />
                                </div>
                            </th>
                            <th
                                className="border-b border-border px-2 md:px-3 py-1.5 md:py-2 text-left font-medium text-text-secondary whitespace-nowrap cursor-pointer hover:bg-bg-2"
                                onClick={() => handleSort('data_type')}
                            >
                                <div className="flex items-center gap-1">
                                    Type
                                    <SortIcon field="data_type" />
                                </div>
                            </th>
                            <th
                                className="border-b border-border px-2 md:px-3 py-1.5 md:py-2 text-left font-medium text-text-secondary whitespace-nowrap cursor-pointer hover:bg-bg-2"
                                onClick={() => handleSort('nullable')}
                            >
                                <div className="flex items-center gap-1">
                                    Nullable
                                    <SortIcon field="nullable" />
                                </div>
                            </th>
                            <th
                                className="border-b border-border px-2 md:px-3 py-1.5 md:py-2 text-left font-medium text-text-secondary whitespace-nowrap cursor-pointer hover:bg-bg-2"
                                onClick={() => handleSort('default')}
                            >
                                <div className="flex items-center gap-1">
                                    Default
                                    <SortIcon field="default" />
                                </div>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedColumns.map((column) => {
                            const isPK = column.is_primary_key;
                            const isFK = fkColumns.has(column.name);
                            const isIndexed = indexedColumns.has(column.name);

                            return (
                                <tr key={column.name} className="hover:bg-bg-1/50">
                                    <td className="border-b border-border px-2 md:px-3 py-1.5 md:py-2">
                                        <div className="flex items-center gap-1">
                                            {isPK && (
                                                <span
                                                    className="text-xs"
                                                    title="Primary Key"
                                                >
                                                    🔑
                                                </span>
                                            )}
                                            {isFK && (
                                                <span
                                                    className="text-xs"
                                                    title="Foreign Key"
                                                >
                                                    🔗
                                                </span>
                                            )}
                                            {isIndexed && !isPK && (
                                                <span
                                                    className="text-xs"
                                                    title="Indexed"
                                                >
                                                    🔍
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="border-b border-border px-2 md:px-3 py-1.5 md:py-2 text-text-primary font-mono break-all">
                                        {column.name}
                                    </td>
                                    <td className="border-b border-border px-2 md:px-3 py-1.5 md:py-2">
                                        <span className="text-[9px] md:text-xs bg-bg-2 text-text-secondary px-1.5 md:px-2 py-0.5 rounded whitespace-nowrap inline-block">
                                            {column.data_type}
                                        </span>
                                    </td>
                                    <td className="border-b border-border px-2 md:px-3 py-1.5 md:py-2">
                                        {column.is_nullable ? (
                                            <span className="text-[9px] md:text-xs bg-yellow-500/20 text-yellow-400 px-1.5 md:px-2 py-0.5 rounded whitespace-nowrap inline-block">
                                                YES
                                            </span>
                                        ) : (
                                            <span className="text-[9px] md:text-xs bg-bg-2 text-text-secondary px-1.5 md:px-2 py-0.5 rounded whitespace-nowrap inline-block">
                                                NO
                                            </span>
                                        )}
                                    </td>
                                    <td className="border-b border-border px-2 md:px-3 py-1.5 md:py-2 text-text-secondary text-[9px] md:text-xs font-mono break-all">
                                        {column.default_value || (
                                            <span className="italic opacity-50">NULL</span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
