import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { useSettingsStore } from '../../store/settingsStore';
import { isDarkTheme } from '../../utils/theme';
import { QueryResult } from '../../types';
import { ChartConfig, ChartConfigData } from './ChartConfig';
import { ChartRenderer } from './ChartRenderer';
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
import { useDialog } from '../../context/DialogContext';
import { ArrowRight, ChevronLeft, ChevronRight, Check, Minus, Copy, Trash2, BarChart3, Maximize2, Search } from 'lucide-react';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { workerManager } from '../../services/workerManager';


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
    // Snapshot props
    hasSnapshot?: boolean;
    onSnapshot?: (result: QueryResult) => void;
    onCompareSnapshot?: () => void;
    onClearSnapshot?: () => void;
    onSaveChart?: (config: ChartConfigData) => void;
    initialChartConfig?: ChartConfigData;
    onChartConfigChange?: (config: ChartConfigData) => void;
}

export const QueryResults: React.FC<QueryResultsProps> = ({
    result, loading, error, errorDetails, onRefresh, lastSql, onPaginate, connectionId,
    hasSnapshot, onSnapshot, onCompareSnapshot, onClearSnapshot, initialChartConfig,
    onChartConfigChange
}) => {
    const [jsonCopied, setJsonCopied] = useState(false);
    const [resultsSearchTerm, setResultsSearchTerm] = useState('');

    const [edits, setEdits] = useState<Record<number, Record<string, any>>>({});
    const editsRef = useRef<Record<number, Record<string, any>>>({});
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
    const [exportMenuOpen, setExportMenuOpen] = useState(false);
    const [moreActionsOpen, setMoreActionsOpen] = useState(false);
    const [showErrorDetails, setShowErrorDetails] = useState(false);
    const [renderAllRows, setRenderAllRows] = useState(false);
    const [pageSize, setPageSize] = useState(1000);
    const exportMenuRef = useRef<HTMLDivElement>(null);
    const moreActionsRef = useRef<HTMLDivElement>(null);
    const tableScrollRef = useRef<HTMLDivElement>(null);
    const { showToast } = useToast();
    const dialog = useDialog();
    const { theme } = useSettingsStore();

    const [viewMode, setViewMode] = useState<'table' | 'json' | 'chart'>('table');
    const [isChartModalOpen, setIsChartModalOpen] = useState(false);
    const [inlineEditingEnabled, setInlineEditingEnabled] = useState(true);
    const [metricChartConfig, setMetricChartConfig] = useState<ChartConfigData>({
        type: 'bar',
        xAxis: '',
        yAxis: []
    });

    // Initialize/Sync chart config
    useEffect(() => {
        if (initialChartConfig) {
            setMetricChartConfig(initialChartConfig);
            if (initialChartConfig.xAxis && initialChartConfig.yAxis.length > 0) {
                setViewMode('chart');
            }
        }
    }, [initialChartConfig]);

    useEffect(() => {
        if (onChartConfigChange) {
            onChartConfigChange(metricChartConfig);
        }
    }, [metricChartConfig, onChartConfigChange]);

    useEffect(() => {
        if (result?.display_mode) {
            // Only override if valid mode
            if (result.display_mode === 'json') setViewMode('json');
            else if (result.display_mode === 'table') setViewMode('table');
        }
    }, [result?.display_mode]);

    const [processedRows, setProcessedRows] = useState<any[][]>([]);
    const [isWorkerProcessing, setIsWorkerProcessing] = useState(false);

    useEffect(() => {
        const processResults = async () => {
            if (!result?.rows) {
                setProcessedRows([]);
                return;
            }

            // For large datasets (>5000 rows), use Web Worker for formatting/processing
            if (result.rows.length > 5000) {
                setIsWorkerProcessing(true);
                try {
                    const response = await workerManager.processData<{ formattedRows: any[][], processTime: number }>({
                        type: 'format',
                        data: {
                            rows: result.rows,
                            columns: result.columns,
                            types: result.column_metadata?.map(c => c.data_type) || [],
                        },
                    });
                    setProcessedRows(response.formattedRows);
                    console.log(`[Worker] Processed ${result.rows.length} rows in ${response.processTime.toFixed(2)}ms`);
                } catch (error) {
                    console.error('[Worker] Processing failed:', error);
                    setProcessedRows(result.rows);
                } finally {
                    setIsWorkerProcessing(false);
                }
            } else {
                setProcessedRows(result.rows);
            }
        };

        processResults();
    }, [result]);

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

    const jsonValue = useMemo(() => {
        if (result?.json) {
            return JSON.stringify(result.json, null, 4);
        }
        if (!result || !result.columns || !result.rows) return '[]';

        // Convert rows to objects if standard table results
        const data = result.rows.map(row => {
            const obj: Record<string, any> = {};
            result.columns.forEach((col, idx) => {
                obj[col] = row[idx];
            });
            return obj;
        });
        return JSON.stringify(data, null, 4);
    }, [result]);

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
                showToast("Cannot save changes: No primary key found for this table.", "error");
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
            showToast("Failed to save changes. Check console for details.", "error");
        }
    };

    const handleDiscardChanges = () => {
        setEdits({});
    };

    const handleDeleteRow = async (rowIndex: number) => {
        if (!result || !result.column_metadata) return;

        // Confirm deletion
        const confirmed = await dialog.confirm({
            title: 'Delete Row',
            message: 'Are you sure you want to delete this row? This action cannot be undone.',
            confirmLabel: 'Delete',
            variant: 'destructive'
        });

        if (!confirmed) return;

        const tableMeta = result.column_metadata.find(c => c.table_name);
        if (!tableMeta || !tableMeta.table_name) {
            console.error("No table metadata found, cannot delete");
            return;
        }

        const pkCols = result.column_metadata.filter(c => c.is_primary_key);
        if (pkCols.length === 0) {
            showToast("Cannot delete row: No primary key found for this table.", "error");
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
            showToast("Failed to delete row. Check console for details.", "error");
        }
    };

    const handleCloneRow = useCallback(async (rowIndex: number) => {
        if (!result || !result.column_metadata) return;

        const tableMeta = result.column_metadata.find(c => c.table_name);
        if (!tableMeta || !tableMeta.table_name) {
            showToast('Cannot clone: No table metadata found', 'error');
            return;
        }

        const originalRow = result.rows[rowIndex];
        const rowEdits = edits[rowIndex] || {};

        // Get all column values (use edited values if available)
        const values = result.columns.map((col, index) => {
            const value = rowEdits[col] !== undefined ? rowEdits[col] : originalRow[index];

            // Format value for SQL
            if (value === null || value === undefined) return 'NULL';
            if (typeof value === 'number') return String(value);
            if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
            // Escape single quotes in strings
            return `'${String(value).replace(/'/g, "''")}'`;
        });

        // Find primary key columns to exclude them (let DB auto-generate)
        const pkCols = result.column_metadata.filter(c => c.is_primary_key);
        const pkColNames = new Set(pkCols.map(pk => pk.column_name));

        // Filter out primary key columns
        const columnsToInsert = result.columns.filter(col => !pkColNames.has(col));
        const valuesToInsert = result.columns
            .map((col, index) => pkColNames.has(col) ? null : values[index])
            .filter((_, index) => !pkColNames.has(result.columns[index]));

        const schema = tableMeta.schema_name || 'public';
        const table = tableMeta.table_name;
        const insertSql = `INSERT INTO ${schema}.${table} (${columnsToInsert.join(', ')})\nVALUES (${valuesToInsert.join(', ')});`;

        try {
            await copyToClipboard(insertSql);
            showToast('INSERT statement copied! Paste and run to clone row.', 'success');
        } catch (e) {
            console.error(e);
            showToast('Failed to copy INSERT statement', 'error');
        }
    }, [result, edits, showToast]);


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
        if (!moreActionsOpen) return;
        const onDocMouseDown = (e: MouseEvent) => {
            if (!moreActionsRef.current) return;
            if (!moreActionsRef.current.contains(e.target as Node)) setMoreActionsOpen(false);
        };
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setMoreActionsOpen(false);
        };
        document.addEventListener('mousedown', onDocMouseDown);
        window.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('mousedown', onDocMouseDown);
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [moreActionsOpen]);

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
        if (!processedRows) return [];
        let rows = processedRows;

        if (resultsSearchTerm) {
            const term = resultsSearchTerm.toLowerCase();
            rows = rows.filter(row =>
                row.some(cell => String(cell).toLowerCase().includes(term))
            );
        }

        if (renderAllRows) return rows;
        return rows.slice(0, MAX_RENDER_ROWS);
    }, [processedRows, renderAllRows, resultsSearchTerm]);

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
        const rowNumberOffset = (offset || 0) + 1;

        const baseColumns: any[] = [
            helper.display({
                id: '__select__',
                header: ({ table }) => {
                    const isAll = table.getIsAllRowsSelected();
                    const isSome = table.getIsSomeRowsSelected();
                    return (
                        <div
                            onClick={table.getToggleAllRowsSelectedHandler()}
                            className={`
                                w-4 h-4 rounded border flex items-center justify-center transition-all cursor-pointer
                                ${isAll || isSome
                                    ? 'bg-accent border-accent text-bg-1'
                                    : 'border-border-subtle hover:border-text-secondary bg-transparent'}
                            `}
                        >
                            {isAll && !isSome && <Check size={12} strokeWidth={3} />}
                            {isSome && <Minus size={12} strokeWidth={3} />}
                        </div>
                    );
                },
                cell: ({ row }) => (
                    <div
                        onClick={row.getToggleSelectedHandler()}
                        className={`
                            w-4 h-4 rounded border flex items-center justify-center transition-all cursor-pointer
                            ${row.getIsSelected()
                                ? 'bg-accent border-accent text-bg-1'
                                : 'border-border-subtle hover:border-text-secondary bg-transparent'}
                        `}
                    >
                        {row.getIsSelected() && <Check size={12} strokeWidth={3} />}
                    </div>
                ),
                size: 36,
                enableSorting: false,
                enableResizing: false,
            }),
            helper.display({
                id: '__row_number__',
                header: () => <div className="text-center w-full">#</div>,
                cell: ({ row }) => (
                    <div className="text-center w-full text-text-tertiary select-none font-mono text-[10px]">
                        {rowNumberOffset + row.index}
                    </div>
                ),
                size: 40,
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
                                    isEditable={isEditable && inlineEditingEnabled}
                                />
                            );
                        },
                    });
                })
            );
        }

        // Add Clone & Delete Action Columns if editable
        if (hasEditableColumns) {
            const helper = createColumnHelper<unknown[]>();
            baseColumns.push(helper.display({
                id: 'actions',
                header: () => <div className="w-16"></div>,
                cell: (info) => (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={() => handleCloneRow(info.row.index)}
                            className="p-1 hover:bg-bg-0 rounded-md text-text-secondary hover:text-accent transition-all active:scale-90"
                            title="Clone Row"
                        >
                            <Copy size={12} />
                        </button>
                        <button
                            onClick={() => handleDeleteRow(info.row.index)}
                            className="p-1 hover:bg-error/10 rounded-md text-text-secondary hover:text-error transition-all active:scale-90"
                            title="Delete Row"
                        >
                            <Trash2 size={12} />
                        </button>
                    </div>
                ),
                size: 64,
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

    const handleCloneSelectedRows = useCallback(async () => {
        if (!result || !result.column_metadata) return;

        const tableMeta = result.column_metadata.find(c => c.table_name);
        if (!tableMeta || !tableMeta.table_name) {
            showToast('Cannot clone: No table metadata found', 'error');
            return;
        }

        const selectedRows = tableInstance.getSelectedRowModel().rows;
        if (selectedRows.length === 0) {
            showToast('No rows selected', 'error');
            return;
        }

        // Find primary key columns to exclude them
        const pkCols = result.column_metadata.filter(c => c.is_primary_key);
        const pkColNames = new Set(pkCols.map(pk => pk.column_name));

        // Filter out primary key columns
        const columnsToInsert = result.columns.filter(col => !pkColNames.has(col));

        const schema = tableMeta.schema_name || 'public';
        const table = tableMeta.table_name;

        // Generate INSERT statements for all selected rows
        const insertStatements = selectedRows.map(row => {
            const rowIndex = row.index;
            const originalRow = result.rows[rowIndex];
            const rowEdits = edits[rowIndex] || {};

            // Get all column values (use edited values if available)
            const values = result.columns.map((col, index) => {
                const value = rowEdits[col] !== undefined ? rowEdits[col] : originalRow[index];

                // Format value for SQL
                if (value === null || value === undefined) return 'NULL';
                if (typeof value === 'number') return String(value);
                if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
                // Escape single quotes in strings
                return `'${String(value).replace(/'/g, "''")}'`;
            });

            const valuesToInsert = result.columns
                .map((col, index) => pkColNames.has(col) ? null : values[index])
                .filter((_, index) => !pkColNames.has(result.columns[index]));

            return `(${valuesToInsert.join(', ')})`;
        });

        const insertSql = `INSERT INTO ${schema}.${table} (${columnsToInsert.join(', ')})\nVALUES\n${insertStatements.join(',\n')};`;

        try {
            await copyToClipboard(insertSql);
            showToast(`${selectedRows.length} row(s) copied as INSERT! Paste and run to clone.`, 'success');
        } catch (e) {
            console.error(e);
            showToast('Failed to copy INSERT statements', 'error');
        }
    }, [result, edits, tableInstance, showToast]);


    const rowVirtualizer = useVirtualizer({
        count: rowModelRows.length,
        getScrollElement: () => tableScrollRef.current,
        estimateSize: () => 36, // Balanced size - not too big, not too small
        overscan: 30, // Increased from 16 for smoother scrolling
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

    const confirmLargeExport = async (rowCount: number) => {
        if (rowCount <= 10000) return true;
        return dialog.confirm({
            title: 'Large Export',
            message: `Exporting ${rowCount} rows may take a while and could freeze the UI. Continue?`,
            confirmLabel: 'Continue'
        });
    };

    const handleDownloadCsv = useCallback(
        async (opts = DEFAULT_CSV_OPTIONS) => {
            if (!result) return;
            const rows = getExportRows();
            if (rows.length === 0) return;
            const confirmed = await confirmLargeExport(rows.length);
            if (!confirmed) return;

            const text = toDelimitedText(result.columns, rows, opts);
            const filename = buildExportFilename(['query_results', connectionId], 'csv');
            downloadTextFile(text, filename, 'text/csv;charset=utf-8;');
            showToast('Exported CSV', 'success');
        },
        [confirmLargeExport, connectionId, getExportRows, result, showToast]
    );

    const handleDownloadTsvForExcel = useCallback(async () => {
        if (!result) return;
        const rows = getExportRows();
        if (rows.length === 0) return;
        const confirmed = await confirmLargeExport(rows.length);
        if (!confirmed) return;

        const text = toDelimitedText(result.columns, rows, { ...EXCEL_CSV_OPTIONS, delimiter: '\t', quote: '"' });
        const filename = buildExportFilename(['query_results', connectionId], 'tsv');
        downloadTextFile(text, filename, 'text/tab-separated-values;charset=utf-8;');
        showToast('Exported TSV (Excel-friendly)', 'success');
    }, [confirmLargeExport, connectionId, getExportRows, result, showToast]);

    const handleDownloadExcelXls = useCallback(async () => {
        if (!result) return;
        const rows = getExportRows();
        if (rows.length === 0) return;
        const confirmed = await confirmLargeExport(rows.length);
        if (!confirmed) return;

        const html = toExcelHtmlTable(result.columns, rows, 'Results');
        const filename = buildExportFilename(['query_results', connectionId], 'xls');
        downloadTextFile(html, filename, 'application/vnd.ms-excel;charset=utf-8;');
        showToast('Exported Excel (.xls)', 'success');
    }, [confirmLargeExport, connectionId, getExportRows, result, showToast]);

    const handleDownloadJson = useCallback(
        async (mode: 'objects' | 'rows' = 'objects', pretty = true) => {
            if (!result) return;
            const rows = getExportRows();
            if (rows.length === 0) return;
            const confirmed = await confirmLargeExport(rows.length);
            if (!confirmed) return;

            const text =
                mode === 'objects' ? toJsonObjects(result.columns, rows, pretty) : toJsonRows(result.columns, rows, pretty);
            const filename = buildExportFilename(['query_results', connectionId], 'json');
            downloadTextFile(text, filename, 'application/json;charset=utf-8;');
            showToast('Exported JSON', 'success');
        },
        [confirmLargeExport, connectionId, getExportRows, result, showToast]
    );

    const handleDownloadInsertSql = useCallback(async () => {
        if (!result) return;
        const rows = getExportRows();
        if (rows.length === 0) return;
        if (!confirmLargeExport(rows.length)) return;

        const meta = result.column_metadata?.find((c) => c.table_name);
        const defaultTarget = meta?.table_name ? `${meta.schema_name || 'public'}.${meta.table_name}` : '';
        const target = await dialog.prompt({
            title: 'Export INSERT SQL',
            message: 'Target table for INSERT statements (schema.table):',
            initialValue: defaultTarget,
            confirmLabel: 'Export'
        });
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
            const confirmed = await confirmLargeExport(rows.length);
            if (!confirmed) return;

            let text = '';
            if (kind === 'csv') text = toDelimitedText(result.columns, rows, DEFAULT_CSV_OPTIONS);
            if (kind === 'tsv') text = toDelimitedText(result.columns, rows, { ...DEFAULT_CSV_OPTIONS, delimiter: '\t' });
            if (kind === 'json') text = toJsonObjects(result.columns, rows, true);
            if (kind === 'insert') {
                const meta = result.column_metadata?.find((c) => c.table_name);
                const defaultTarget = meta?.table_name ? `${meta.schema_name || 'public'}.${meta.table_name}` : '';
                const target = await dialog.prompt({
                    title: 'Copy INSERT SQL',
                    message: 'Target table for INSERT statements (schema.table):',
                    initialValue: defaultTarget,
                    confirmLabel: 'Copy'
                });
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
        <div className="flex-1 overflow-auto bg-bg-default flex flex-col">
            {isWorkerProcessing && (
                <div className="absolute inset-0 bg-bg-default/50 backdrop-blur-[1px] z-50 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-bg-1 border border-border-light shadow-xl">
                        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm font-medium text-text-secondary">Processing {result?.rows?.length} rows...</span>
                    </div>
                </div>
            )}
            {loading && <div className="p-4 text-text-secondary animate-pulse">Executing query...</div>}
            {error && (
                <div className="p-4 border-b border-border-light bg-bg-1">
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
                                        <pre className="mt-3 p-3 rounded bg-bg-0 border border-border-light text-[11px] text-text-secondary overflow-auto max-h-[240px] whitespace-pre-wrap break-words">
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
                                                className="px-2 py-1 text-xs rounded border border-border-light bg-bg-2 text-text-secondary hover:text-text-primary hover:bg-bg-3 transition-colors"
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
                                                className="px-2 py-1 text-xs rounded border border-border-light bg-bg-2 text-text-secondary hover:text-text-primary hover:bg-bg-3 transition-colors"
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
                        <pre className="mt-3 p-3 rounded bg-bg-0 border border-border-light text-[11px] text-text-secondary overflow-auto max-h-[240px] whitespace-pre-wrap break-words">
                            {typeof errorDetails.responseData === 'string'
                                ? errorDetails.responseData
                                : JSON.stringify(errorDetails, null, 2)}
                        </pre>
                    )}
                </div>
            )}

            {result && (
                <div className="flex flex-col h-full">
                    <div className="relative z-30 p-2 bg-bg-1 text-sm border-b border-border-subtle flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {/* Consolidated Status Pill */}
                            <div className="flex items-center gap-3 pl-3 pr-4 py-1.5 bg-bg-sunken/50 rounded-full border border-border-default/50 shadow-sm text-[11px] font-medium text-text-secondary select-none">
                                <span className="font-bold text-text-primary">
                                    {result.affected_rows > 0 ? result.affected_rows : result.rows.length}
                                </span>
                                <span className="text-text-tertiary">records</span>
                                <span className="w-px h-3 bg-border-default" />

                                {totalCount !== undefined && (
                                    <>
                                        <span>Page {currentPage}/{totalPages}</span>
                                        <span className="w-px h-3 bg-border-default" />
                                    </>
                                )}

                                {result.execution_time_ms !== undefined && (
                                    <span className="font-mono text-text-tertiary">{result.execution_time_ms}ms</span>
                                )}

                                {/* Inline Edit Toggle - Moved inside status bar for efficiency */}
                                {hasEditableColumns && (
                                    <>
                                        <span className="w-px h-3 bg-border-default" />
                                        <button
                                            className={`flex items-center gap-1.5 hover:text-accent transition-colors ${inlineEditingEnabled ? 'text-accent' : 'text-text-tertiary'}`}
                                            onClick={() => setInlineEditingEnabled(!inlineEditingEnabled)}
                                        >
                                            <span className="uppercase tracking-wider text-[9px] font-bold">Inline Edit</span>
                                            <div className={`w-6 h-3 rounded-full relative transition-colors ${inlineEditingEnabled ? 'bg-accent' : 'bg-bg-3'}`}>
                                                <div className={`absolute top-0.5 w-2 h-2 rounded-full bg-white shadow-sm transition-transform ${inlineEditingEnabled ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
                                            </div>
                                        </button>
                                    </>
                                )}
                            </div>

                            {/* Results Filter Bar */}
                            {result.rows.length > 0 && viewMode === 'table' && (
                                <div className="flex-1 max-w-lg mx-4 relative group">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary group-focus-within:text-accent transition-colors" size={14} />
                                    <input
                                        type="text"
                                        placeholder="Filtered by values..."
                                        value={resultsSearchTerm}
                                        onChange={(e) => setResultsSearchTerm(e.target.value)}
                                        className="w-full pl-9 pr-3 py-1.5 bg-bg-sunken/50 hover:bg-bg-sunken focus:bg-bg-0 border border-border-default/50 focus:border-accent rounded-full text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/10 transition-all shadow-inner"
                                    />
                                </div>
                            )}

                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest mr-1 hidden lg:inline">View:</span>
                                <div className="flex items-center bg-bg-sunken p-1 rounded-lg border border-border-default/50">
                                    <button
                                        onClick={() => setViewMode('table')}
                                        className={`px-3 py-1 text-[11px] font-semibold rounded-md transition-all ${viewMode === 'table' ? 'bg-bg-0 text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary hover:bg-bg-0/50'}`}
                                    >
                                        DATA
                                    </button>
                                    <button
                                        onClick={() => setViewMode('json')}
                                        className={`px-3 py-1 text-[11px] font-semibold rounded-md transition-all ${viewMode === 'json' ? 'bg-bg-0 text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary hover:bg-bg-0/50'}`}
                                    >
                                        JSON
                                    </button>
                                    <button
                                        onClick={() => setViewMode('chart')}
                                        className={`px-3 py-1 text-[11px] font-semibold rounded-md transition-all flex items-center gap-1.5 ${viewMode === 'chart' ? 'bg-bg-0 text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary hover:bg-bg-0/50'}`}
                                    >
                                        <BarChart3 size={12} />
                                        CHART
                                    </button>
                                </div>
                            </div>

                            {viewMode === 'chart' && (
                                <button
                                    onClick={() => setIsChartModalOpen(true)}
                                    className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-bg-sunken rounded-md transition-all"
                                    title="Maximize Chart"
                                >
                                    <Maximize2 size={14} />
                                    Maximize
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Export Menu - Keep visible (primary action) */}
                            {result.rows.length > 0 && (
                                <div className="relative flex items-center gap-2" ref={exportMenuRef}>
                                    <button
                                        onClick={() => setExportMenuOpen((v) => !v)}
                                        className="h-8 px-3 hover:bg-bg-2 rounded-lg text-text-secondary hover:text-text-primary flex items-center gap-1.5 transition-all text-[12px] font-medium border border-border-light hover:border-border-strong"
                                        title="Export / Copy"
                                    >
                                        ⬇ Export
                                        {selectedCount > 0 && (
                                            <span className="text-xs bg-primary-transparent text-accent px-1.5 py-0.5 rounded">
                                                {selectedCount}
                                            </span>
                                        )}
                                    </button>

                                    {exportMenuOpen && (
                                        <div className="absolute right-0 top-full mt-1 w-64 bg-bg-1 border border-border-light rounded shadow-2xl overflow-hidden z-50">
                                            <div className="px-3 py-2 text-xs font-semibold text-text-secondary uppercase tracking-wider border-b border-border-light">
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
                                                className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-bg-2 border-t border-border-light"
                                            >
                                                INSERT statements (.sql)
                                            </button>

                                            <div className="px-3 py-2 text-xs font-semibold text-text-secondary uppercase tracking-wider border-y border-border-light">
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

                            {/* Save Changes - Keep visible (critical action) */}
                            {pendingEditsCount > 0 && (
                                <div className="flex items-center gap-2 border-l border-border-light pl-3 ml-2">
                                    <span className="text-accent font-bold text-[11px] uppercase tracking-wider">{pendingEditsCount} modified</span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleDiscardChanges}
                                        disabled={saving}
                                        className="h-7 px-2.5 text-[11px]"
                                    >
                                        Discard
                                    </Button>
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        onClick={handleSaveChanges}
                                        disabled={saving}
                                        className="h-7 px-4 text-[11px] font-bold"
                                        isLoading={saving}
                                    >
                                        Save Changes
                                    </Button>
                                </div>
                            )}

                            {/* More Actions Dropdown - Secondary actions */}
                            {result.rows.length > 0 && (onSnapshot || (selectedCount > 0 && hasEditableColumns) || hasTruncatedRows) && (
                                <div className="relative" ref={moreActionsRef}>
                                    <button
                                        onClick={() => {
                                            setExportMenuOpen(false); // Close export if open
                                            setMoreActionsOpen(!moreActionsOpen);
                                        }}
                                        className="px-2 py-1.5 hover:bg-bg-3 rounded text-text-secondary hover:text-text-primary transition-colors border border-border-light hover:border-border-strong"
                                        title="More actions"
                                    >
                                        ⋯
                                    </button>

                                    {moreActionsOpen && (
                                        <div className="absolute right-0 top-full mt-1 w-56 bg-bg-1 border border-border-light rounded shadow-2xl overflow-hidden z-50">
                                            {/* Snapshot actions */}
                                            {onSnapshot && (
                                                <>
                                                    {!hasSnapshot ? (
                                                        <button
                                                            onClick={() => {
                                                                onSnapshot(result);
                                                                setMoreActionsOpen(false);
                                                            }}
                                                            className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-bg-2 flex items-center gap-2"
                                                        >
                                                            📸 Save Snapshot
                                                        </button>
                                                    ) : (
                                                        <>
                                                            <button
                                                                onClick={() => {
                                                                    onCompareSnapshot?.();
                                                                    setMoreActionsOpen(false);
                                                                }}
                                                                className="w-full px-3 py-2 text-left text-sm text-accent hover:bg-primary-transparent flex items-center gap-2 font-medium"
                                                            >
                                                                ⚖️ Compare with Snapshot
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    onClearSnapshot?.();
                                                                    setMoreActionsOpen(false);
                                                                }}
                                                                className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-bg-2 flex items-center gap-2"
                                                            >
                                                                ✕ Clear Snapshot
                                                            </button>
                                                        </>
                                                    )}
                                                    {(selectedCount > 0 && hasEditableColumns) || hasTruncatedRows ? (
                                                        <div className="border-t border-border-light my-1" />
                                                    ) : null}
                                                </>
                                            )}

                                            {/* Clone action */}
                                            {selectedCount > 0 && hasEditableColumns && (
                                                <>
                                                    <button
                                                        onClick={() => {
                                                            handleCloneSelectedRows();
                                                            setMoreActionsOpen(false);
                                                        }}
                                                        className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-bg-2 flex items-center gap-2"
                                                    >
                                                        📋 Clone {selectedCount} {selectedCount === 1 ? 'Row' : 'Rows'}
                                                    </button>
                                                    {hasTruncatedRows ? (
                                                        <div className="border-t border-border-light my-1" />
                                                    ) : null}
                                                </>
                                            )}

                                            {/* Render all action */}
                                            {hasTruncatedRows && (
                                                <button
                                                    onClick={async () => {
                                                        setMoreActionsOpen(false);
                                                        const confirmed = await dialog.confirm(
                                                            'Render All Rows',
                                                            `Render all ${result.rows.length.toLocaleString()} rows? This may freeze the UI.`,
                                                            { variant: 'danger' }
                                                        );
                                                        if (confirmed) {
                                                            setRenderAllRows(true);
                                                        }
                                                    }}
                                                    className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-bg-2 flex items-center gap-2"
                                                >
                                                    🔄 Render All Rows
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Row count badge */}
                            {result.rows.length > 0 && (
                                <span className="bg-primary-transparent px-2 py-1 rounded text-xs font-medium text-accent border border-border-light">
                                    {displayRows.length} {displayRows.length === 1 ? 'row' : 'rows'}
                                </span>
                            )}

                            {/* Virtualized badge */}
                            {result.rows.length > 2000 && (
                                <span className="bg-bg-3 px-2 py-0.5 rounded text-xs text-text-secondary border border-border-light">
                                    Virtualized
                                </span>
                            )}
                        </div>
                    </div>

                    {canPaginate && totalCount !== undefined && limit !== undefined && offset !== undefined && (
                        <div className="px-2 py-2 bg-bg-1 border-b border-border-light flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 text-xs text-text-secondary">
                                <span>Rows per page</span>
                                <select
                                    className="bg-bg-0 border border-border-light rounded px-2 py-1 text-xs text-text-primary"
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
                                    className="p-1.5 rounded bg-bg-2 border border-border-light text-xs text-text-secondary hover:text-text-primary hover:bg-bg-3 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Previous page"
                                    aria-label="Previous page"
                                >
                                    <ChevronLeft size={14} />
                                </button>
                                <button
                                    onClick={() => onPaginate(limit, Math.min(offset + limit, Math.max(0, totalCount - 1)))}
                                    disabled={loading || (result.has_more === false)}
                                    className="p-1.5 rounded bg-bg-2 border border-border-light text-xs text-text-secondary hover:text-text-primary hover:bg-bg-3 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Next page"
                                    aria-label="Next page"
                                >
                                    <ChevronRight size={14} />
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
                                    <input
                                        name="page"
                                        defaultValue={currentPage}
                                        className="w-16 bg-bg-0 border border-border-light rounded px-2 py-1 text-xs text-text-primary"
                                        type="number"
                                        min={1}
                                        max={totalPages}
                                    />
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="p-1.5 rounded bg-bg-2 border border-border-light text-xs text-text-secondary hover:text-text-primary hover:bg-bg-3 disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Go to page"
                                        aria-label="Go to page"
                                    >
                                        <ArrowRight size={14} />
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}

                    {viewMode === 'table' ? (
                        result.columns.length > 0 && (
                            <div
                                className="flex-1 overflow-auto rounded-lg border border-border-subtle shadow-sm bg-bg-1 mx-2 mb-2 custom-scrollbar"
                                ref={tableScrollRef}
                                style={{ scrollbarGutter: 'stable' }}
                            >
                                {result.rows.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-text-tertiary">
                                        <div className="text-4xl mb-4 opacity-50">📊</div>
                                        <div className="text-sm font-medium">Query executed successfully</div>
                                        <div className="text-xs mt-1 opacity-70">No rows returned</div>
                                    </div>
                                ) : (
                                    <table
                                        className="w-full border-collapse text-left"
                                        style={{ minWidth: '100%', tableLayout: 'fixed' }}
                                    >
                                        <thead className="sticky top-0 z-20 bg-bg-1 shadow-sm border-b border-border-subtle">
                                            {tableInstance.getHeaderGroups().map((headerGroup) => (
                                                <tr key={headerGroup.id}>
                                                    {headerGroup.headers.map((header) => (
                                                        <th
                                                            key={header.id}
                                                            className="px-3 py-2.5 text-[11px] font-bold text-text-secondary uppercase tracking-wider border-b border-border-default bg-bg-sunken/50 hover:bg-bg-sunken transition-colors cursor-pointer select-none group relative text-left"
                                                            style={{
                                                                width: header.getSize(),
                                                                minWidth: header.column.columnDef.minSize,
                                                                maxWidth: header.column.columnDef.maxSize,
                                                            }}
                                                            onClick={header.column.getToggleSortingHandler()}
                                                        >
                                                            <div className="flex items-center gap-1.5 overflow-hidden">
                                                                <span className="truncate flex-1">
                                                                    {flexRender(header.column.columnDef.header, header.getContext())}
                                                                </span>
                                                                <span className="flex-shrink-0 w-3 h-3 flex items-center justify-center text-accent/50 group-hover:text-accent">
                                                                    {{
                                                                        asc: '↑',
                                                                        desc: '↓',
                                                                    }[header.column.getIsSorted() as string] ?? null}
                                                                </span>
                                                            </div>

                                                            <div
                                                                onMouseDown={header.getResizeHandler()}
                                                                onTouchStart={header.getResizeHandler()}
                                                                className={`absolute right-0 top-0 h-full w-1 cursor-col-resize transition-all ${header.column.getIsResizing() ? 'bg-accent bg-opacity-50' : 'hover:bg-accent hover:bg-opacity-30'
                                                                    }`}
                                                            />
                                                        </th>
                                                    ))}
                                                </tr>
                                            ))}
                                        </thead>
                                        <tbody className="font-sans">
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
                                                                <tr
                                                                    key={row.id}
                                                                    className={`
                                                                 
                                                                    hover:bg-bg-2 group transition-colors duration-150 ease-out border-b border-transparent hover:border-border-subtle
                                                                    ${virtualRow.index % 2 === 1 ? 'bg-bg-subtle' : ''}
                                                                `}
                                                                >
                                                                    {row.getVisibleCells().map((cell) => (
                                                                        <td
                                                                            key={cell.id}
                                                                            className="px-3 py-2 border-b border-border-default/40 first:border-l-0 text-sm text-text-primary overflow-hidden text-ellipsis whitespace-nowrap"
                                                                            style={{
                                                                                width: cell.column.getSize(),
                                                                                maxWidth: cell.column.getSize(),
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
                        )
                    ) : viewMode === 'chart' ? (
                        <div className="flex-1 flex flex-col overflow-hidden mx-2 mb-2 rounded-lg border border-border-subtle bg-bg-0 shadow-sm">
                            <ChartConfig
                                columns={result.columns}
                                config={metricChartConfig}
                                onChange={setMetricChartConfig}
                            />
                            <div className="flex-1 relative p-4 min-h-0 overflow-hidden">
                                <ChartRenderer
                                    data={result.rows.map(row => {
                                        const obj: Record<string, any> = {};
                                        result.columns.forEach((col, i) => obj[col] = row[i]);
                                        return obj;
                                    })}
                                    config={metricChartConfig}
                                />
                            </div>

                            {/* Chart Modal */}
                            {isChartModalOpen && (
                                <Modal
                                    isOpen={true}
                                    onClose={() => setIsChartModalOpen(false)}
                                    title="Chart Visualization"
                                    size="full"
                                >
                                    <div className="flex flex-col lg:flex-row gap-4 h-[80vh]">
                                        <div className="w-full lg:w-1/4 border-b lg:border-b-0 lg:border-r border-border-light pb-4 lg:pb-0 lg:pr-4 overflow-y-auto shrink-0">
                                            <h3 className="text-sm font-semibold text-text-primary mb-3">Configuration</h3>
                                            <ChartConfig
                                                columns={result.columns}
                                                config={metricChartConfig}
                                                onChange={setMetricChartConfig}
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <ChartRenderer
                                                data={result.rows.map(row => {
                                                    const obj: Record<string, any> = {};
                                                    result.columns.forEach((col, i) => obj[col] = row[i]);
                                                    return obj;
                                                })}
                                                config={metricChartConfig}
                                            />
                                        </div>
                                    </div>
                                </Modal>
                            )}
                        </div>
                    ) : (
                        <div className="flex-1 overflow-hidden mx-2 mb-2 rounded-lg border border-border-subtle bg-bg-0 shadow-sm relative group">
                            <button
                                onClick={async () => {
                                    try {
                                        await navigator.clipboard.writeText(jsonValue);
                                        setJsonCopied(true);
                                        setTimeout(() => setJsonCopied(false), 2000);
                                    } catch (err) {
                                        console.error('Failed to copy', err);
                                    }
                                }}
                                className="absolute right-4 top-2 z-10 p-1.5 bg-bg-2 border border-border-light rounded-md text-text-secondary hover:text-text-primary opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                                title="Copy JSON"
                            >
                                {jsonCopied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                            </button>
                            <CodeMirror
                                value={jsonValue}
                                theme={isDarkTheme(theme) ? 'dark' : 'light'}
                                height="100%"
                                readOnly
                                basicSetup={{
                                    lineNumbers: true,
                                    foldGutter: true,
                                    dropCursor: true,
                                    allowMultipleSelections: false,
                                    indentOnInput: true,
                                }}
                                className="h-full w-full text-[13px] absolute inset-0 font-mono"
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
