import React, { useMemo, useState, useCallback } from 'react';
import { QueryResult } from '../../types';
import { getCoreRowModel, useReactTable, flexRender, createColumnHelper, getSortedRowModel, SortingState } from '@tanstack/react-table';
import { EditableCell } from './EditableCell';
import api from '../../services/api';

interface QueryResultsProps {
    result: QueryResult | null;
    loading: boolean;
    error: string | null;
    onRefresh?: () => void;
    connectionId: string;
}



export const QueryResults: React.FC<QueryResultsProps> = ({ result, loading, error, onRefresh, connectionId }) => {
    const [edits, setEdits] = useState<Record<number, Record<string, any>>>({});
    const [saving, setSaving] = useState(false);
    const [sorting, setSorting] = React.useState<SortingState>([]);

    const hasEditableColumns = useMemo(() => {
        return result?.column_metadata?.some(c => c.is_editable) ?? false;
    }, [result]);

    const handleCellSave = useCallback((rowIndex: number, colName: string, value: any) => {
        setEdits(prev => ({
            ...prev,
            [rowIndex]: {
                ...(prev[rowIndex] || {}),
                [colName]: value
            }
        }));
    }, []);

    const handleSaveChanges = async () => {
        if (!result || !result.column_metadata) return;

        setSaving(true);
        try {
            // Group edits by table if needed, but for now typical query is single table
            // We need to find the PK for the edited rows.

            // Assume single table context for current row
            const tableMeta = result.column_metadata.find(c => c.table_name);
            if (!tableMeta || !tableMeta.table_name) {
                console.error("No table metadata found, cannot save");
                return;
            }

            const pkCols = result.column_metadata.filter(c => c.is_primary_key);
            if (pkCols.length === 0) {
                alert("Cannot save changes: No primary key found for this table.");
                return;
            }

            const updates = Object.entries(edits).map(([rowIndexStr, rowUpdates]) => {
                const rowIndex = parseInt(rowIndexStr);
                const originalRow = result.rows[rowIndex];

                const primaryKey: Record<string, any> = {};
                pkCols.forEach(pk => {
                    const colIndex = result.columns.indexOf(pk.column_name);
                    if (colIndex !== -1) {
                        primaryKey[pk.column_name] = originalRow[colIndex];
                    }
                });

                return {
                    schema: tableMeta.schema_name || 'public',
                    table: tableMeta.table_name!,
                    primary_key: primaryKey,
                    updates: rowUpdates
                };
            });

            // Better: Promise.all
            await Promise.all(updates.map(u => api.patch(`/api/connections/${connectionId}/query-results`, u)));

            setEdits({});
            if (onRefresh) onRefresh();

        } catch (err) {
            console.error("Failed to save changes", err);
            alert("Failed to save changes. Check console for details.");
        } finally {
            setSaving(false);
        }
    };

    const handleDiscardChanges = () => {
        setEdits({});
    };

    const handleDeleteRow = async (rowIndex: number) => {
        if (!result || !result.column_metadata) return;

        // Confirm deletion
        if (!window.confirm("Are you sure you want to delete this row? This action cannot be undone.")) {
            return;
        }

        const tableMeta = result.column_metadata.find(c => c.table_name);
        if (!tableMeta || !tableMeta.table_name) {
            console.error("No table metadata found, cannot delete");
            return;
        }

        const pkCols = result.column_metadata.filter(c => c.is_primary_key);
        if (pkCols.length === 0) {
            alert("Cannot delete row: No primary key found for this table.");
            return;
        }

        const originalRow = result.rows[rowIndex];
        const primaryKey: Record<string, any> = {};
        pkCols.forEach(pk => {
            const colIndex = result.columns.indexOf(pk.column_name);
            if (colIndex !== -1) {
                primaryKey[pk.column_name] = originalRow[colIndex];
            }
        });

        const deleteRequest = {
            schema: tableMeta.schema_name || 'public',
            table: tableMeta.table_name!,
            primary_key: primaryKey,
        };

        try {
            await api.delete(`/api/connections/${connectionId}/query-results`, { data: deleteRequest });
            if (onRefresh) onRefresh();
        } catch (err) {
            console.error("Failed to delete row", err);
            alert("Failed to delete row. Check console for details.");
        }
    };

    // Export functions
    const handleExportCSV = () => {
        if (!result || result.rows.length === 0) return;

        // Header
        const header = result.columns.join(',');

        // Rows
        const rows = result.rows.map(row => {
            return row.map(cell => {
                if (cell === null) return '';
                if (typeof cell === 'string') {
                    // Escape quotes and wrap in quotes if contains comma
                    const escaped = cell.replace(/"/g, '""');
                    if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
                        return `"${escaped}"`;
                    }
                    return cell;
                }
                return String(cell);
            }).join(',');
        }).join('\n');

        const csvContent = `${header}\n${rows}`;
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `query_results_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportJSON = () => {
        if (!result || result.rows.length === 0) return;

        const data = result.rows.map(row => {
            const obj: Record<string, any> = {};
            result.columns.forEach((col, i) => {
                obj[col] = row[i];
            });
            return obj;
        });

        const jsonContent = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `query_results_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const columns = useMemo(() => {
        const baseColumns = (result?.columns.map((col, index) => {
            const helper = createColumnHelper<unknown[]>();
            const metadata = result.column_metadata ? result.column_metadata[index] : null;
            const isEditable = metadata?.is_editable ?? false;

            return helper.accessor((row) => row[index], {
                id: col,
                header: () => (
                    <div className="flex items-center gap-1">
                        {metadata?.is_primary_key && <span title="Primary Key" className="text-yellow-500">🔑</span>}
                        {col}
                    </div>
                ),
                cell: (info) => {
                    const rowIndex = info.row.index;
                    const val = edits[rowIndex]?.[col] !== undefined ? edits[rowIndex][col] : info.getValue();

                    // Determine type from value or metadata? 
                    // For now simple inference
                    let type: 'string' | 'number' | 'boolean' | 'null' = 'string';
                    if (val === null) type = 'null';
                    else if (typeof val === 'number') type = 'number';
                    else if (typeof val === 'boolean') type = 'boolean';

                    return (
                        <EditableCell
                            value={val}
                            onSave={(newVal) => handleCellSave(rowIndex, col, newVal)}
                            type={type as any}
                            isEditable={isEditable}
                        />
                    );
                }
            });
        }) || []) as any[];

        // Add Delete Action Column if editable
        if (hasEditableColumns) {
            const helper = createColumnHelper<unknown[]>();
            baseColumns.push(helper.display({
                id: 'actions',
                header: () => <div className="w-8"></div>,
                cell: (info) => (
                    <button
                        onClick={() => handleDeleteRow(info.row.index)}
                        className="text-text-secondary hover:text-error opacity-0 group-hover:opacity-100 transition-opacity p-1"
                        title="Delete Row"
                    >
                        🗑️
                    </button>
                ),
                size: 40,
                enableSorting: false,
                enableResizing: false,
            }));
        }

        return baseColumns;
    }, [result, edits, handleCellSave, hasEditableColumns]);

    const tableInstance = useReactTable({
        data: result?.rows || [],
        columns,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        columnResizeMode: 'onChange',
        state: {
            sorting,
        },
        onSortingChange: setSorting,
    });

    const pendingEditsCount = Object.keys(edits).length;

    return (
        <div className="flex-1 overflow-auto bg-bg-0 flex flex-col">
            {loading && <div className="p-4 text-text-secondary">Executing query...</div>}
            {error && <div className="p-4 text-error font-mono text-sm whitespace-pre-wrap">{error}</div>}

            {result && (
                <div className="flex flex-col h-full">
                    <div className="p-2 bg-bg-2 text-xs border-b border-border flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                                {result.affected_rows > 0
                                    ? `Affected rows: ${result.affected_rows}`
                                    : `${result.rows.length} rows returned`}
                            </span>
                            {hasEditableColumns && (
                                <span className="text-text-secondary text-[10px] bg-bg-3 px-1 rounded border border-border">
                                    Double-click cells to edit
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Export Buttons */}
                            {result.rows.length > 0 && (
                                <div className="flex items-center border-r border-border pr-2 mr-2 gap-1">
                                    <button
                                        onClick={handleExportCSV}
                                        className="px-2 py-1 hover:bg-bg-3 rounded text-text-secondary hover:text-text-primary flex items-center gap-1 transition-colors"
                                        title="Export as CSV"
                                    >
                                        📄 CSV
                                    </button>
                                    <button
                                        onClick={handleExportJSON}
                                        className="px-2 py-1 hover:bg-bg-3 rounded text-text-secondary hover:text-text-primary flex items-center gap-1 transition-colors"
                                        title="Export as JSON"
                                    >
                                        {/* JSON Icon or just text */}
                                        📦 JSON
                                    </button>
                                </div>
                            )}

                            {pendingEditsCount > 0 && (
                                <>
                                    <span className="text-primary-default font-bold">{pendingEditsCount} modified rows</span>
                                    <button
                                        onClick={handleDiscardChanges}
                                        className="px-2 py-1 text-text-secondary hover:text-text-primary text-xs"
                                        disabled={saving}
                                    >
                                        Discard
                                    </button>
                                    <button
                                        onClick={handleSaveChanges}
                                        className="px-3 py-1 bg-primary-default text-text-inverse rounded hover:bg-primary-hover text-xs font-medium flex items-center gap-1"
                                        disabled={saving}
                                    >
                                        {saving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </>
                            )}
                            {result.rows.length > 0 && (
                                <span className="bg-accent/20 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ color: 'var(--color-primary-default)' }}>
                                    {result.rows.length} {result.rows.length === 1 ? 'row' : 'rows'}
                                </span>
                            )}
                        </div>
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
                                <table className="w-full border-collapse text-sm" style={{ width: tableInstance.getTotalSize() }}>
                                    <thead className="bg-bg-1 sticky top-0 z-10">
                                        {tableInstance.getHeaderGroups().map((headerGroup) => (
                                            <tr key={headerGroup.id}>
                                                {headerGroup.headers.map((header) => (
                                                    <th
                                                        key={header.id}
                                                        className="border-b border-r border-border px-4 py-2 text-left relative group select-none"
                                                        style={{
                                                            width: header.getSize(),
                                                            color: 'var(--color-text-primary)',
                                                            fontWeight: '600',
                                                            fontSize: '0.75rem',
                                                            textTransform: 'uppercase',
                                                            letterSpacing: '0.05em'
                                                        }}
                                                    >
                                                        <div
                                                            className={`flex items-center gap-1 cursor-pointer ${header.column.getCanSort() ? 'hover:text-primary-default' : ''}`}
                                                            onClick={header.column.getToggleSortingHandler()}
                                                        >
                                                            {flexRender(
                                                                header.column.columnDef.header,
                                                                header.getContext()
                                                            )}
                                                            {{
                                                                asc: ' 🔼',
                                                                desc: ' 🔽',
                                                            }[header.column.getIsSorted() as string] ?? null}
                                                        </div>
                                                        <div
                                                            onMouseDown={header.getResizeHandler()}
                                                            onTouchStart={header.getResizeHandler()}
                                                            className={`absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary-default ${header.column.getIsResizing() ? 'bg-primary-default' : 'bg-transparent'
                                                                }`}
                                                        />
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
                                                        className="border-b border-r border-border font-mono text-xs p-0 overflow-hidden text-ellipsis whitespace-nowrap"
                                                        style={{
                                                            width: cell.column.getSize(),
                                                            maxWidth: cell.column.getSize(),
                                                            color: 'var(--color-text-primary)'
                                                        }}
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

