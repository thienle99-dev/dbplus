import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { QueryResult } from '../../types';
import {
    getCoreRowModel,
    useReactTable,
    flexRender,
    createColumnHelper,
    getSortedRowModel,
    SortingState,
    RowSelectionState,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { EditableCell } from './EditableCell';
import { useUpdateQueryResult, useDeleteQueryResult } from '../../hooks/useQuery';
import { useToast } from '../../context/ToastContext';
import type { ApiErrorDetails } from '../../utils/apiError';
import {
    buildExportFilename,
    copyToClipboard,
    DEFAULT_CSV_OPTIONS,
    downloadTextFile,
    EXCEL_CSV_OPTIONS,
    toDelimitedText,
    toExcelHtmlTable,
    toInsertStatements,
    toJsonObjects,
    toJsonRows,
} from '../../utils/queryResultExport';

interface QueryResultsProps {
    result: QueryResult | null;
    loading: boolean;
    error: string | null;
    errorDetails?: ApiErrorDetails | null;
    onRefresh?: () => void;
    lastSql?: string;
    onPaginate?: (limit: number, offset: number) => void;
    connectionId: string;
}

export const QueryResults: React.FC<QueryResultsProps> = ({ result, loading, error, errorDetails, onRefresh, lastSql, onPaginate, connectionId }) => {
    const [edits, setEdits] = useState<Record<number, Record<string, any>>>({});
    const editsRef = useRef<Record<number, Record<string, any>>>({});
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
    const [exportMenuOpen, setExportMenuOpen] = useState(false);
    const [showErrorDetails, setShowErrorDetails] = useState(false);
    const [renderAllRows, setRenderAllRows] = useState(false);
    const [pageSize, setPageSize] = useState(1000);
    const exportMenuRef = useRef<HTMLDivElement>(null);
    const tableScrollRef = useRef<HTMLDivElement>(null);
    const { showToast } = useToast();

    // Custom Hooks
    const updateQueryResult = useUpdateQueryResult(connectionId);
    const deleteQueryResult = useDeleteQueryResult(connectionId);

    // Check if saving is in progress
    const saving = updateQueryResult.isPending || deleteQueryResult.isPending;

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

    useEffect(() => {
        editsRef.current = edits;
    }, [edits]);

    const handleSaveChanges = async () => {
        if (!result || !result.column_metadata) return;

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
            await Promise.all(updates.map(u => updateQueryResult.mutateAsync(u)));

            setEdits({});
            if (onRefresh) onRefresh();

        } catch (err) {
            console.error("Failed to save changes", err);
            alert("Failed to save changes. Check console for details.");
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
            await deleteQueryResult.mutateAsync(deleteRequest);
            if (onRefresh) onRefresh();
        } catch (err) {
            console.error("Failed to delete row", err);
            alert("Failed to delete row. Check console for details.");
        }
    };

    useEffect(() => {
        if (!exportMenuOpen) return;
        const onDocMouseDown = (e: MouseEvent) => {
            if (!exportMenuRef.current) return;
            if (!exportMenuRef.current.contains(e.target as Node)) setExportMenuOpen(false);
        };
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setExportMenuOpen(false);
        };
        document.addEventListener('mousedown', onDocMouseDown);
        window.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('mousedown', onDocMouseDown);
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [exportMenuOpen]);

    useEffect(() => {
        // Reset potentially heavy rendering & selection when a new result arrives.
        setRenderAllRows(false);
        setRowSelection({});
        if (typeof result?.limit === 'number' && Number.isFinite(result.limit)) {
            setPageSize(result.limit);
        }
    }, [result]);

    const MAX_RENDER_ROWS = 5000;
    const displayRows = useMemo(() => {
        if (!result?.rows) return [];
        if (renderAllRows) return result.rows;
        return result.rows.slice(0, MAX_RENDER_ROWS);
    }, [result, renderAllRows]);

    const hasTruncatedRows = !!result?.rows && !renderAllRows && result.rows.length > MAX_RENDER_ROWS;
    const canPaginate =
        !!result &&
        typeof result.total_count === 'number' &&
        typeof result.limit === 'number' &&
        typeof result.offset === 'number' &&
        !!onPaginate &&
        !!lastSql;

    const totalCount = typeof result?.total_count === 'number' ? result.total_count : undefined;
    const limit = typeof result?.limit === 'number' ? result.limit : undefined;
    const offset = typeof result?.offset === 'number' ? result.offset : undefined;
    const currentPage = limit && offset !== undefined ? Math.floor(offset / limit) + 1 : undefined;
    const totalPages = limit && totalCount !== undefined ? Math.max(1, Math.ceil(totalCount / limit)) : undefined;

    const columns = useMemo(() => {
        const helper = createColumnHelper<unknown[]>();
        const baseColumns: any[] = [
            helper.display({
                id: '__select__',
                header: ({ table }) => (
                    <input
                        type="checkbox"
                        className="accent-[var(--color-primary-default)]"
                        checked={table.getIsAllRowsSelected()}
                        ref={(el) => {
                            if (!el) return;
                            el.indeterminate = table.getIsSomeRowsSelected();
                        }}
                        onChange={table.getToggleAllRowsSelectedHandler()}
                        aria-label="Select all rows"
                    />
                ),
                cell: ({ row }) => (
                    <input
                        type="checkbox"
                        className="accent-[var(--color-primary-default)]"
                        checked={row.getIsSelected()}
                        disabled={!row.getCanSelect()}
                        onChange={row.getToggleSelectedHandler()}
                        aria-label="Select row"
                    />
                ),
                size: 36,
                enableSorting: false,
                enableResizing: false,
            }),
        ];

        if (result?.columns?.length) {
            baseColumns.push(
                ...result.columns.map((col, index) => {
                    const metadata = result.column_metadata ? result.column_metadata[index] : null;
                    const isEditable = metadata?.is_editable ?? false;

                    return helper.accessor((row) => row[index], {
                        id: col,
                        header: () => (
                            <div className="flex items-center gap-1">
                                {metadata?.is_primary_key && (
                                    <span title="Primary Key" className="text-yellow-500">
                                        🔑
                                    </span>
                                )}
                                {col}
                            </div>
                        ),
                        cell: (info) => {
                            const rowIndex = info.row.index;
                            const rowEdits = editsRef.current[rowIndex];
                            const val = rowEdits?.[col] !== undefined ? rowEdits[col] : info.getValue();

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
                        },
                    });
                })
            );
        }

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
    }, [result, handleCellSave, hasEditableColumns]);

    const tableInstance = useReactTable({
        data: displayRows,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        columnResizeMode: 'onChange',
        state: {
            sorting,
            rowSelection,
        },
        onSortingChange: setSorting,
        onRowSelectionChange: setRowSelection,
        enableRowSelection: true,
    });

    const pendingEditsCount = Object.keys(edits).length;
    const selectedCount = useMemo(() => Object.keys(rowSelection).length, [rowSelection]);
    const rowModelRows = tableInstance.getRowModel().rows;

    const rowVirtualizer = useVirtualizer({
        count: rowModelRows.length,
        getScrollElement: () => tableScrollRef.current,
        estimateSize: () => 28,
        overscan: 16,
    });

    const getExportRows = useCallback(() => {
        if (!result) return [];
        const selected = tableInstance.getSelectedRowModel().rows;
        const source = selected.length > 0 ? selected : tableInstance.getRowModel().rows;
        const colIndexByName = new Map<string, number>(result.columns.map((c, i) => [c, i]));

        return source.map((r) => {
            const original = (r.original || []) as any[];
            const values = [...original];
            const rowEdits = edits[r.index];
            if (rowEdits) {
                for (const [colName, newVal] of Object.entries(rowEdits)) {
                    const idx = colIndexByName.get(colName);
                    if (idx !== undefined) values[idx] = newVal;
                }
            }
            return values;
        });
    }, [edits, result, tableInstance]);

    const confirmLargeExport = useCallback((rowCount: number) => {
        if (rowCount <= 10000) return true;
        return window.confirm(`Exporting ${rowCount} rows may take a while and could freeze the UI. Continue?`);
    }, []);

    const handleDownloadCsv = useCallback(
        (opts = DEFAULT_CSV_OPTIONS) => {
            if (!result) return;
            const rows = getExportRows();
            if (rows.length === 0) return;
            if (!confirmLargeExport(rows.length)) return;

            const text = toDelimitedText(result.columns, rows, opts);
            const filename = buildExportFilename(['query_results', connectionId], 'csv');
            downloadTextFile(text, filename, 'text/csv;charset=utf-8;');
            showToast('Exported CSV', 'success');
        },
        [confirmLargeExport, connectionId, getExportRows, result, showToast]
    );

    const handleDownloadTsvForExcel = useCallback(() => {
        if (!result) return;
        const rows = getExportRows();
        if (rows.length === 0) return;
        if (!confirmLargeExport(rows.length)) return;

        const text = toDelimitedText(result.columns, rows, { ...EXCEL_CSV_OPTIONS, delimiter: '\t', quote: '"' });
        const filename = buildExportFilename(['query_results', connectionId], 'tsv');
        downloadTextFile(text, filename, 'text/tab-separated-values;charset=utf-8;');
        showToast('Exported TSV (Excel-friendly)', 'success');
    }, [confirmLargeExport, connectionId, getExportRows, result, showToast]);

    const handleDownloadExcelXls = useCallback(() => {
        if (!result) return;
        const rows = getExportRows();
        if (rows.length === 0) return;
        if (!confirmLargeExport(rows.length)) return;

        const html = toExcelHtmlTable(result.columns, rows, 'Results');
        const filename = buildExportFilename(['query_results', connectionId], 'xls');
        downloadTextFile(html, filename, 'application/vnd.ms-excel;charset=utf-8;');
        showToast('Exported Excel (.xls)', 'success');
    }, [confirmLargeExport, connectionId, getExportRows, result, showToast]);

    const handleDownloadJson = useCallback(
        (mode: 'objects' | 'rows' = 'objects', pretty = true) => {
            if (!result) return;
            const rows = getExportRows();
            if (rows.length === 0) return;
            if (!confirmLargeExport(rows.length)) return;

            const text =
                mode === 'objects' ? toJsonObjects(result.columns, rows, pretty) : toJsonRows(result.columns, rows, pretty);
            const filename = buildExportFilename(['query_results', connectionId], 'json');
            downloadTextFile(text, filename, 'application/json;charset=utf-8;');
            showToast('Exported JSON', 'success');
        },
        [confirmLargeExport, connectionId, getExportRows, result, showToast]
    );

    const handleDownloadInsertSql = useCallback(() => {
        if (!result) return;
        const rows = getExportRows();
        if (rows.length === 0) return;
        if (!confirmLargeExport(rows.length)) return;

        const meta = result.column_metadata?.find((c) => c.table_name);
        const defaultTarget = meta?.table_name ? `${meta.schema_name || 'public'}.${meta.table_name}` : '';
        const target = window.prompt('Target table for INSERT statements (schema.table)', defaultTarget);
        if (!target) return;

        const [schema, table] = target.includes('.') ? target.split('.', 2) : ['public', target];
        const text = toInsertStatements({ schema, table, columns: result.columns, rows });
        const filename = buildExportFilename(['query_results', connectionId], 'sql');
        downloadTextFile(text, filename, 'application/sql;charset=utf-8;');
        showToast('Exported INSERT statements', 'success');
    }, [confirmLargeExport, connectionId, getExportRows, result, showToast]);

    const handleCopy = useCallback(
        async (kind: 'csv' | 'tsv' | 'json' | 'insert') => {
            if (!result) return;
            const rows = getExportRows();
            if (rows.length === 0) return;
            if (!confirmLargeExport(rows.length)) return;

            let text = '';
            if (kind === 'csv') text = toDelimitedText(result.columns, rows, DEFAULT_CSV_OPTIONS);
            if (kind === 'tsv') text = toDelimitedText(result.columns, rows, { ...DEFAULT_CSV_OPTIONS, delimiter: '\t' });
            if (kind === 'json') text = toJsonObjects(result.columns, rows, true);
            if (kind === 'insert') {
                const meta = result.column_metadata?.find((c) => c.table_name);
                const defaultTarget = meta?.table_name ? `${meta.schema_name || 'public'}.${meta.table_name}` : '';
                const target = window.prompt('Target table for INSERT statements (schema.table)', defaultTarget);
                if (!target) return;
                const [schema, table] = target.includes('.') ? target.split('.', 2) : ['public', target];
                text = toInsertStatements({ schema, table, columns: result.columns, rows });
            }

            try {
                await copyToClipboard(text);
                showToast(`Copied ${selectedCount > 0 ? 'selected' : 'all'} rows`, 'success');
            } catch (e) {
                console.error(e);
                showToast('Copy failed', 'error');
            }
        },
        [confirmLargeExport, getExportRows, result, selectedCount, showToast]
    );

    const formattedDbError = useMemo(() => {
        if (!error || !errorDetails) return null;
        const data = errorDetails.responseData;
        const db = data && typeof data === 'object' ? (data as any).db : undefined;
        if (!db || typeof db !== 'object') return null;

        const engine = db.engine as string | undefined;
        if (engine !== 'postgres') return null;

        const sql = typeof errorDetails.sql === 'string' ? errorDetails.sql : null;
        const posRaw = db.position as string | undefined;
        const message = (db.message as string | undefined) || error;
        const hint = db.hint as string | undefined;

        if (!sql || !posRaw) return null;
        const m = String(posRaw).match(/^(\d+)/);
        const pos = m ? Number(m[1]) : NaN;
        if (!Number.isFinite(pos) || pos <= 0) return null;

        const offset = Math.min(pos - 1, sql.length);
        const before = sql.slice(0, offset);
        const line = before.split('\n').length;
        const lineStart = before.lastIndexOf('\n') + 1;
        const lineEndIdx = sql.indexOf('\n', lineStart);
        const lineText = (lineEndIdx === -1 ? sql.slice(lineStart) : sql.slice(lineStart, lineEndIdx)).replace(/\r$/, '');
        const colInLine = Math.max(0, offset - lineStart);

        const linePrefix = `LINE ${line}: `;
        const caretLine = `${' '.repeat(linePrefix.length + colInLine)}^`;

        const parts = [
            `Query ERROR at Line ${line}: ERROR:  ${message}`,
            `${linePrefix}${lineText}`,
            caretLine,
        ];
        if (hint) parts.push(`HINT:  ${hint}`);
        return parts.join('\n');
    }, [error, errorDetails]);

    return (
        <div className="flex-1 overflow-auto bg-bg-0 flex flex-col">
            {loading && <div className="p-4 text-text-secondary">Executing query...</div>}
            {error && (
                <div className="p-4 border-b border-border bg-bg-1">
                    {(() => {
                        const data = errorDetails?.responseData;
                        const db = data && typeof data === 'object' ? (data as any).db : undefined;
                        const engine = db?.engine as string | undefined;
                        const code = db?.code as string | undefined;
                        const dbMessage = db?.message as string | undefined;
                        const detail = db?.detail as string | undefined;
                        const hint = db?.hint as string | undefined;
                        const position = db?.position as string | undefined;
                        return (
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <div className="text-xs font-semibold text-error uppercase tracking-wider mb-2">Database Error</div>
                            <div className="text-error font-mono text-sm whitespace-pre-wrap break-words">{dbMessage || error}</div>
                            {formattedDbError && (
                                <pre className="mt-3 p-3 rounded bg-bg-0 border border-border text-[11px] text-text-secondary overflow-auto max-h-[240px] whitespace-pre-wrap break-words">
                                    {formattedDbError}
                                </pre>
                            )}
                            {(engine || code || detail || hint || position) && (
                                <div className="mt-2 space-y-1 text-xs text-text-secondary">
                                    {(engine || code) && (
                                        <div>
                                            {engine ? `${engine.toUpperCase()} ` : ''}
                                            {code ? `(${code})` : ''}
                                        </div>
                                    )}
                                    {position && <div>{`Position: ${position}`}</div>}
                                    {detail && <div>{`Detail: ${detail}`}</div>}
                                    {hint && <div>{`Hint: ${hint}`}</div>}
                                </div>
                            )}
                            {errorDetails?.status && (
                                <div className="mt-2 text-xs text-text-secondary">
                                    {errorDetails.method ? `${errorDetails.method} ` : ''}
                                    {errorDetails.url ? `${errorDetails.url} ` : ''}
                                    {errorDetails.status}
                                    {errorDetails.statusText ? ` ${errorDetails.statusText}` : ''}
                                    {errorDetails.code ? ` • ${errorDetails.code}` : ''}
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            {errorDetails && (
                                <>
                                    <button
                                        onClick={() => setShowErrorDetails((v) => !v)}
                                        className="px-2 py-1 text-xs rounded border border-border bg-bg-2 text-text-secondary hover:text-text-primary hover:bg-bg-3 transition-colors"
                                        title="Toggle raw error details"
                                    >
                                        {showErrorDetails ? 'Hide details' : 'Show details'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            const payload =
                                                typeof errorDetails.responseData === 'string'
                                                    ? errorDetails.responseData
                                                    : JSON.stringify(errorDetails, null, 2);
                                            void copyToClipboard(payload)
                                                .then(() => showToast('Copied error details', 'success'))
                                                .catch(() => showToast('Copy failed', 'error'));
                                        }}
                                        className="px-2 py-1 text-xs rounded border border-border bg-bg-2 text-text-secondary hover:text-text-primary hover:bg-bg-3 transition-colors"
                                        title="Copy error details"
                                    >
                                        Copy
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                        );
                    })()}

                    {showErrorDetails && errorDetails && (
                        <pre className="mt-3 p-3 rounded bg-bg-0 border border-border text-[11px] text-text-secondary overflow-auto max-h-[240px] whitespace-pre-wrap break-words">
                            {typeof errorDetails.responseData === 'string'
                                ? errorDetails.responseData
                                : JSON.stringify(errorDetails, null, 2)}
                        </pre>
                    )}
                </div>
            )}

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
                            {hasTruncatedRows && (
                                <span className="text-text-secondary text-[10px] bg-bg-3 px-1 rounded border border-border">
                                    Showing first {MAX_RENDER_ROWS.toLocaleString()} of {result.rows.length.toLocaleString()} rows
                                </span>
                            )}
                            {totalCount !== undefined && limit !== undefined && offset !== undefined && (
                                <span className="text-text-secondary text-[10px] bg-bg-3 px-1 rounded border border-border">
                                    Total {totalCount.toLocaleString()} • Page {currentPage}/{totalPages}
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Export Menu */}
                            {result.rows.length > 0 && (
                                <div className="relative flex items-center border-r border-border pr-2 mr-2 gap-2" ref={exportMenuRef}>
                                    <button
                                        onClick={() => setExportMenuOpen((v) => !v)}
                                        className="px-2 py-1 hover:bg-bg-3 rounded text-text-secondary hover:text-text-primary flex items-center gap-1 transition-colors"
                                        title="Export / Copy"
                                    >
                                        ⬇ Export
                                    </button>
                                    {selectedCount > 0 && (
                                        <span className="text-[10px] text-text-secondary bg-bg-3 px-1 rounded border border-border">
                                            {selectedCount} selected
                                        </span>
                                    )}

                                    {exportMenuOpen && (
                                        <div className="absolute right-0 top-full mt-1 w-64 bg-bg-1 border border-border rounded shadow-2xl overflow-hidden z-50">
                                            <div className="px-3 py-2 text-[10px] font-semibold text-text-secondary uppercase tracking-wider border-b border-border">
                                                Download
                                            </div>
                                            <button
                                                onClick={() => { setExportMenuOpen(false); handleDownloadCsv(DEFAULT_CSV_OPTIONS); }}
                                                className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-bg-2"
                                            >
                                                CSV (.csv)
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setExportMenuOpen(false);
                                                    handleDownloadCsv({ ...DEFAULT_CSV_OPTIONS, delimiter: ';' });
                                                }}
                                                className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-bg-2"
                                            >
                                                CSV (semicolon)
                                            </button>
                                            <button
                                                onClick={() => { setExportMenuOpen(false); handleDownloadCsv(EXCEL_CSV_OPTIONS); }}
                                                className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-bg-2"
                                            >
                                                CSV for Excel (UTF-8 BOM)
                                            </button>
                                            <button
                                                onClick={() => { setExportMenuOpen(false); handleDownloadTsvForExcel(); }}
                                                className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-bg-2"
                                            >
                                                Excel-friendly TSV (.tsv)
                                            </button>
                                            <button
                                                onClick={() => { setExportMenuOpen(false); handleDownloadExcelXls(); }}
                                                className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-bg-2"
                                            >
                                                Excel (.xls)
                                            </button>
                                            <button
                                                onClick={() => { setExportMenuOpen(false); handleDownloadJson('objects', true); }}
                                                className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-bg-2"
                                            >
                                                JSON (array of objects, pretty)
                                            </button>
                                            <button
                                                onClick={() => { setExportMenuOpen(false); handleDownloadJson('rows', true); }}
                                                className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-bg-2"
                                            >
                                                JSON (columns + rows, pretty)
                                            </button>
                                            <button
                                                onClick={() => { setExportMenuOpen(false); handleDownloadJson('objects', false); }}
                                                className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-bg-2"
                                            >
                                                JSON (minified)
                                            </button>
                                            <button
                                                onClick={() => { setExportMenuOpen(false); handleDownloadInsertSql(); }}
                                                className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-bg-2 border-t border-border"
                                            >
                                                INSERT statements (.sql)
                                            </button>

                                            <div className="px-3 py-2 text-[10px] font-semibold text-text-secondary uppercase tracking-wider border-y border-border">
                                                Copy To Clipboard
                                            </div>
                                            <button
                                                onClick={() => { setExportMenuOpen(false); void handleCopy('csv'); }}
                                                className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-bg-2"
                                            >
                                                Copy CSV
                                            </button>
                                            <button
                                                onClick={() => { setExportMenuOpen(false); void handleCopy('tsv'); }}
                                                className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-bg-2"
                                            >
                                                Copy TSV (Excel-friendly)
                                            </button>
                                            <button
                                                onClick={() => { setExportMenuOpen(false); void handleCopy('json'); }}
                                                className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-bg-2"
                                            >
                                                Copy JSON
                                            </button>
                                            <button
                                                onClick={() => { setExportMenuOpen(false); void handleCopy('insert'); }}
                                                className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-bg-2"
                                            >
                                                Copy INSERT statements
                                            </button>
                                        </div>
                                    )}
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
                                    {displayRows.length} {displayRows.length === 1 ? 'row' : 'rows'}
                                </span>
                            )}
                            {hasTruncatedRows && (
                                <button
                                    onClick={() => {
                                        if (window.confirm(`Render all ${result.rows.length.toLocaleString()} rows? This may freeze the UI.`)) {
                                            setRenderAllRows(true);
                                        }
                                    }}
                                    className="px-2 py-1 rounded bg-bg-3 border border-border text-[10px] text-text-secondary hover:text-text-primary hover:bg-bg-2 transition-colors"
                                    title="Render all rows (may be slow)"
                                >
                                    Render all
                                </button>
                            )}
                            {result.rows.length > 2000 && (
                                <span className="bg-bg-3 px-2 py-0.5 rounded-full text-[10px] text-text-secondary border border-border">
                                    Virtualized
                                </span>
                            )}
                        </div>
                    </div>

                    {canPaginate && totalCount !== undefined && limit !== undefined && offset !== undefined && (
                        <div className="px-2 py-2 bg-bg-1 border-b border-border flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 text-xs text-text-secondary">
                                <span>Rows per page</span>
                                <select
                                    className="bg-bg-0 border border-border rounded px-2 py-1 text-xs text-text-primary"
                                    value={pageSize}
                                    onChange={(e) => {
                                        const next = Number(e.target.value);
                                        setPageSize(next);
                                        onPaginate(next, 0);
                                    }}
                                >
                                    {[100, 500, 1000, 2000, 5000, 10000].map((n) => (
                                        <option key={n} value={n}>
                                            {n.toLocaleString()}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => onPaginate(limit, Math.max(0, offset - limit))}
                                    disabled={loading || offset === 0}
                                    className="px-2 py-1 rounded bg-bg-2 border border-border text-xs text-text-secondary hover:text-text-primary hover:bg-bg-3 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Prev
                                </button>
                                <button
                                    onClick={() => onPaginate(limit, Math.min(offset + limit, Math.max(0, totalCount - 1)))}
                                    disabled={loading || (result.has_more === false)}
                                    className="px-2 py-1 rounded bg-bg-2 border border-border text-xs text-text-secondary hover:text-text-primary hover:bg-bg-3 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Next
                                </button>
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        const form = e.currentTarget;
                                        const input = form.elements.namedItem('page') as HTMLInputElement | null;
                                        if (!input) return;
                                        const page = Number(input.value);
                                        if (!Number.isFinite(page) || page < 1 || !totalPages) return;
                                        const clamped = Math.min(Math.max(1, page), totalPages);
                                        onPaginate(limit, (clamped - 1) * limit);
                                    }}
                                    className="flex items-center gap-1"
                                >
                                    <span className="text-xs text-text-secondary">Go</span>
                                    <input
                                        name="page"
                                        defaultValue={currentPage}
                                        className="w-16 bg-bg-0 border border-border rounded px-2 py-1 text-xs text-text-primary"
                                        type="number"
                                        min={1}
                                        max={totalPages}
                                    />
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="px-2 py-1 rounded bg-bg-2 border border-border text-xs text-text-secondary hover:text-text-primary hover:bg-bg-3 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Go
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}

                    {result.columns.length > 0 && (
                        <div className="flex-1 overflow-auto" ref={tableScrollRef}>
                            {result.rows.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-text-secondary">
                                    <div className="text-4xl mb-2">📊</div>
                                    <div className="text-sm">Query executed successfully</div>
                                    <div className="text-xs mt-1">No rows returned</div>
                                </div>
                            ) : (
                                <table
                                    className="w-full border-collapse text-sm"
                                    style={{ width: tableInstance.getTotalSize(), tableLayout: 'fixed' }}
                                >
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
                                        {(() => {
                                            const virtualItems = rowVirtualizer.getVirtualItems();
                                            const totalSize = rowVirtualizer.getTotalSize();
                                            const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
                                            const last = virtualItems.length > 0 ? virtualItems[virtualItems.length - 1] : null;
                                            const paddingBottom = last ? totalSize - (last.start + last.size) : 0;
                                            const colSpan = tableInstance.getAllLeafColumns().length;

                                            return (
                                                <>
                                                    {paddingTop > 0 && (
                                                        <tr>
                                                            <td style={{ height: `${paddingTop}px` }} colSpan={colSpan} />
                                                        </tr>
                                                    )}

                                                    {virtualItems.map((virtualRow) => {
                                                        const row = rowModelRows[virtualRow.index];
                                                        return (
                                                            <tr key={row.id} className="hover:bg-bg-2/50 group h-7">
                                                                {row.getVisibleCells().map((cell) => (
                                                                    <td
                                                                        key={cell.id}
                                                                        className="border-b border-r border-border font-mono text-xs p-0 overflow-hidden text-ellipsis whitespace-nowrap"
                                                                        style={{
                                                                            width: cell.column.getSize(),
                                                                            maxWidth: cell.column.getSize(),
                                                                            color: 'var(--color-text-primary)',
                                                                        }}
                                                                    >
                                                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                                    </td>
                                                                ))}
                                                            </tr>
                                                        );
                                                    })}

                                                    {paddingBottom > 0 && (
                                                        <tr>
                                                            <td style={{ height: `${paddingBottom}px` }} colSpan={colSpan} />
                                                        </tr>
                                                    )}
                                                </>
                                            );
                                        })()}
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
