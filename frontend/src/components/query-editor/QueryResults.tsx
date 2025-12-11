import React, { useMemo } from 'react';
import { QueryResult } from '../../types';
import { getCoreRowModel, useReactTable, flexRender, createColumnHelper } from '@tanstack/react-table';

interface QueryResultsProps {
    result: QueryResult | null;
    loading: boolean;
    error: string | null;
}

export const QueryResults: React.FC<QueryResultsProps> = ({ result, loading, error }) => {
    const columns = useMemo(() => {
        return result?.columns.map((col, index) => {
            const helper = createColumnHelper<unknown[]>();
            return helper.accessor((row) => row[index], {
                id: col,
                header: col,
                cell: (info) => {
                    const val = info.getValue();
                    if (val === null) return (
                        <span className="italic font-semibold" style={{ color: 'var(--color-text-muted)', opacity: 0.8 }}>
                            null
                        </span>
                    );
                    if (typeof val === 'boolean') return val ? 'true' : 'false';
                    if (typeof val === 'object') return JSON.stringify(val);
                    return String(val);
                }
            });
        }) || [];
    }, [result]);

    const tableInstance = useReactTable({
        data: result?.rows || [],
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    return (
        <div className="flex-1 overflow-auto bg-bg-0">
            {loading && <div className="p-4 text-text-secondary">Executing query...</div>}
            {error && <div className="p-4 text-error font-mono text-sm whitespace-pre-wrap">{error}</div>}

            {result && (
                <div className="flex flex-col h-full">
                    <div className="p-2 bg-bg-2 text-xs border-b border-border flex items-center justify-between">
                        <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                            {result.affected_rows > 0
                                ? `Affected rows: ${result.affected_rows}`
                                : `${result.rows.length} rows returned`}
                        </span>
                        {result.rows.length > 0 && (
                            <span className="bg-accent/20 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ color: 'var(--color-primary-default)' }}>
                                {result.rows.length} {result.rows.length === 1 ? 'row' : 'rows'}
                            </span>
                        )}
                    </div>

                    {result.columns.length > 0 && (
                        <div className="flex-1 overflow-auto">
                            {result.rows.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-text-secondary">
                                    <div className="text-4xl mb-2">📊</div>
                                    <div className="text-sm">Query executed successfully</div>
                                    <div className="text-xs mt-1">No rows returned</div>
                                </div>
                            ) : (
                                <table className="w-full border-collapse text-sm">
                                    <thead className="bg-bg-1 sticky top-0 z-10">
                                        {tableInstance.getHeaderGroups().map((headerGroup) => (
                                            <tr key={headerGroup.id}>
                                                {headerGroup.headers.map((header) => (
                                                    <th
                                                        key={header.id}
                                                        className="border-b border-r border-border px-4 py-2 text-left min-w-[100px]"
                                                        style={{
                                                            color: 'var(--color-text-primary)',
                                                            fontWeight: '600',
                                                            fontSize: '0.75rem',
                                                            textTransform: 'uppercase',
                                                            letterSpacing: '0.05em'
                                                        }}
                                                    >
                                                        {flexRender(
                                                            header.column.columnDef.header,
                                                            header.getContext()
                                                        )}
                                                    </th>
                                                ))}
                                            </tr>
                                        ))}
                                    </thead>
                                    <tbody>
                                        {tableInstance.getRowModel().rows.map((row) => (
                                            <tr key={row.id} className="hover:bg-bg-2/50 group">
                                                {row.getVisibleCells().map((cell) => (
                                                    <td
                                                        key={cell.id}
                                                        className="border-b border-r border-border px-4 py-2 whitespace-nowrap overflow-hidden text-ellipsis max-w-xs font-mono text-xs"
                                                        style={{ color: 'var(--color-text-primary)' }}
                                                    >
                                                        {flexRender(
                                                            cell.column.columnDef.cell,
                                                            cell.getContext()
                                                        )}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
