import { useMemo, useRef, useState, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ChevronLeft, ChevronRight, Save, X, RefreshCw, Plus, ArrowRight, Edit, Copy, MoreHorizontal, Trash2, Columns, Maximize2, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSelectedRow } from '../../context/SelectedRowContext';
import { useTablePage } from '../../context/TablePageContext';
import { TableColumn, QueryResult, EditState, SchemaForeignKey } from '../../types';
import Button from '../ui/Button';
import SavedFilters from './SavedFilters';
import JsonEditorModal from '../ui/JsonEditorModal';
import Checkbox from '../ui/Checkbox';
import { formatCellValue, isComplexType } from '../../utils/cellFormatters';
import { useConnectionStore } from '../../store/connectionStore';

interface TableDataTabProps {
  connectionId?: string;
  schema: string;
  table: string;
  data: QueryResult;
  columnsInfo: TableColumn[];
  edits: EditState;
  isAddingRow: boolean;
  newRowData: Record<number, unknown>;
  saving: boolean;
  loading: boolean;
  onEdit: (rowIndex: number, colIndex: number, value: unknown) => void;
  onSave: () => Promise<void>;
  onDiscard: () => void;
  onNewRowChange: (colIndex: number, value: string) => void;
  onSaveNewRow: () => Promise<void>;
  onCancelNewRow: () => void;
  onStartAddingRow: () => void;
  onRefresh: () => void;
  foreignKeys?: SchemaForeignKey[];
  isCouchbase?: boolean;
  filter?: string;
  setFilter?: (val: string) => void;
  documentId?: string;
  setDocumentId?: (val: string) => void;
  bucket?: string;
  setBucket?: (val: string) => void;
  onRetrieve?: () => void;
  onDelete?: (rowIndex: number) => Promise<void>;
  onDuplicate?: (rowIndex: number) => Promise<void>;
  fields?: string[];
  setFields?: (val: string[]) => void;
}

export default function TableDataTab({
  connectionId,
  schema,
  table,
  data,
  columnsInfo: _columnsInfo,
  edits,
  isAddingRow,
  newRowData,
  saving,
  loading,
  onEdit,
  onSave,
  onDiscard,
  onNewRowChange,
  onSaveNewRow,
  onCancelNewRow,
  onStartAddingRow,
  onRefresh,
  foreignKeys = [],
  isCouchbase = false,
  filter = '',
  setFilter,
  documentId = '',
  setDocumentId,
  bucket = '',
  setBucket,
  onRetrieve,
  onDelete,
  onDuplicate,
  fields = [],
  setFields,
}: TableDataTabProps) {
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const columnSelectorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (columnSelectorRef.current && !columnSelectorRef.current.contains(event.target as Node)) {
        setShowColumnSelector(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [columnSelectorRef]);
  const { currentPage: page, setCurrentPage: setPage, pageSize } = useTablePage();
  const { selectedRow, setSelectedRow } = useSelectedRow();
  const { connections } = useConnectionStore();
  const currentConnection = connections.find(c => c.id === connectionId);
  const [inlineEditingEnabled, setInlineEditingEnabled] = useState(true);
  const [localSearch, setLocalSearch] = useState('');

  // Virtualization Ref
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const [jsonEditorState, setJsonEditorState] = useState<{
    rowIndex: number;
    colIndex: number;
    value: unknown;
    readOnly: boolean;
  } | null>(null);

  const columns = useMemo(() => {
    // Show data columns
    const sourceColumns = data?.columns?.length ? data.columns : _columnsInfo.map(c => c.name);

    if (!sourceColumns.length) return [];
    const helper = createColumnHelper<unknown[]>();

    // Index Column
    const indexColumn = helper.display({
      id: '_index',
      header: '#',
      cell: (info) => (
        <div className="text-text-tertiary text-[10px] font-mono select-none text-right pr-2">
          {(page * pageSize) + info.row.index + 1}
        </div>
      ),
      size: 40,
      enableResizing: false,
    });

    // Actions Column
    const actionsColumn = helper.display({
      id: '_actions',
      header: 'Actions',
      cell: (info) => (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedRow({
                rowIndex: info.row.index,
                rowData: info.row.original,
                columns: data.columns,
                schema,
                table
              });
            }}
            className="p-1 hover:bg-bg-2 rounded text-text-secondary hover:text-accent transition-colors"
            title="Edit Details"
          >
            <Edit size={12} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate?.(info.row.index);
            }}
            className="p-1 hover:bg-bg-2 rounded text-text-secondary hover:text-accent transition-colors"
            title="Duplicate Row"
          >
            <Copy size={12} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.(info.row.index);
            }}
            className="p-1 hover:bg-error-50 rounded text-text-secondary hover:text-error transition-colors"
            title="Delete Row"
          >
            <Trash2 size={12} />
          </button>
          <button
            className="p-1 hover:bg-bg-2 rounded text-text-secondary transition-colors"
            title="More Actions"
          >
            <MoreHorizontal size={12} />
          </button>
        </div>
      ),
      size: 100,
      enableResizing: false,
    });

    const dataColumns = sourceColumns.map((col, index) =>
      helper.accessor((row, rowIndex) => {
        if (edits[rowIndex]?.[index] !== undefined) {
          return edits[rowIndex][index];
        }
        return row[index];
      }, {
        id: col,
        header: col,
        cell: (info) => {
          const val = info.getValue();
          const rowIndex = info.row.index;
          const isEdited = edits[rowIndex]?.[index] !== undefined;
          const isComplex = isComplexType(val);
          const displayValue = formatCellValue(val);

          // For complex types (JSON, arrays, objects), use textarea
          if (isComplex) {
            return (
              <div className="relative w-full group/complex h-full">
                <textarea
                  className={`w-full bg-transparent border-none outline-none p-0 text-xs font-mono resize-none ${isEdited ? 'text-accent font-medium' : 'text-text-primary'
                    }`}
                  value={displayValue}
                  onChange={(e) => onEdit(rowIndex, index, e.target.value)}
                  placeholder={val === null ? 'NULL' : ''}
                  rows={Math.min(5, displayValue.split('\n').length)}
                  style={{ minHeight: '20px' }}
                  readOnly={!inlineEditingEnabled}
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setJsonEditorState({
                      rowIndex,
                      colIndex: index,
                      value: isEdited ? edits[rowIndex][index] : val,
                      readOnly: !inlineEditingEnabled
                    });
                  }}
                  className="absolute top-0 right-0 p-1 rounded hover:bg-bg-3 text-text-tertiary hover:text-accent opacity-0 group-hover/complex:opacity-100 transition-opacity"
                  title="Open JSON Editor"
                >
                  <Maximize2 size={12} />
                </button>
              </div>
            );
          }

          // For simple types, use input
          const fk = foreignKeys.find(k => k.source_column === col);

          return (
            <div className="flex items-center gap-1 group/cell w-full">
              <input
                className={`flex-1 min-w-0 bg-transparent border-none outline-none p-0 text-sm ${isEdited ? 'text-accent font-medium' : 'text-text-primary'
                  }`}
                value={displayValue}
                onChange={(e) => onEdit(rowIndex, index, e.target.value)}
                placeholder={val === null ? 'NULL' : ''}
                readOnly={!inlineEditingEnabled}
              />
              {fk && connectionId && val !== null && (
                <Link
                  to={`/workspace/${connectionId}/tables/${fk.target_schema}/${fk.target_table}`}
                  className="opacity-0 group-hover/cell:opacity-100 transition-opacity p-0.5 rounded hover:bg-bg-2 text-accent"
                  title={`Go to ${fk.target_schema}.${fk.target_table}`}
                >
                  <ArrowRight size={12} />
                </Link>
              )}
            </div>
          );
        },
      })
    );

    return [indexColumn, actionsColumn, ...dataColumns];
  }, [data?.columns, _columnsInfo, edits, onEdit, foreignKeys, connectionId, page, pageSize, inlineEditingEnabled, onDelete, onDuplicate, setSelectedRow, schema, table]);

  const filteredRows = useMemo(() => {
    if (!localSearch) return data?.rows || [];
    const term = localSearch.toLowerCase();
    return (data?.rows || []).filter(row =>
      row.some(cell => String(cell).toLowerCase().includes(term))
    );
  }, [data?.rows, localSearch]);

  const tableInstance = useReactTable({
    data: filteredRows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const { rows } = tableInstance.getRowModel();

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 35, // Estimate 35px row height
    overscan: 10,
  });

  const hasChanges = Object.keys(edits).length > 0;

  return (
    <>
      {/* Generic Toolbar for SQL and NoSQL */}
      <div className="px-3 py-2 border-b border-white/5 flex flex-wrap items-center gap-4 bg-bg-1/20 backdrop-blur-md shadow-sm z-10 relative">
        {isCouchbase && (
          <>
            {/* Bucket Selector */}
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-tight">Bucket</label>
              <select
                className="h-7 px-2 bg-bg-2 border border-border-subtle rounded-md text-[11px] font-medium text-text-primary outline-none focus:ring-1 focus:ring-accent transition-all cursor-pointer min-w-[120px]"
                value={bucket || currentConnection?.database || ''}
                onChange={(e) => setBucket?.(e.target.value)}
              >
                <option value={currentConnection?.database || ''}>{currentConnection?.database || 'default'}</option>
              </select>
            </div>
            <div className="h-6 w-px bg-border-light/50" />
            {/* Doc ID Retrieval */}
            <div className="flex items-center gap-2 flex-1 max-w-[200px]">
              <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-tight whitespace-nowrap">Doc ID</label>
              <input
                className="h-7 px-2.5 bg-bg-2 border border-border-subtle rounded-md text-[11px] text-text-primary outline-none focus:ring-1 focus:ring-accent placeholder:text-text-tertiary/50 transition-all w-full"
                placeholder="Retrieval by ID..."
                value={documentId}
                onChange={(e) => setDocumentId?.(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onRetrieve?.()}
              />
            </div>
          </>
        )}

        {/* Universal Filter / WHERE */}
        <div className="flex items-center gap-2 flex-1 min-w-[260px]">
          <SavedFilters
            connectionId={connectionId || ''}
            schema={schema}
            table={table}
            currentFilter={filter}
            onApplyFilter={(f) => setFilter?.(f)}
          />
          <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-tight whitespace-nowrap">
            {isCouchbase ? 'N1QL WHERE' : 'SQL WHERE'}
          </label>
          <div className="relative flex-1">
            <input
              className="h-7 px-2.5 bg-bg-2 border border-border-subtle rounded-md text-[11px] text-text-primary outline-none focus:ring-1 focus:ring-accent placeholder:text-text-tertiary/50 font-mono transition-all w-full pr-8"
              placeholder={isCouchbase ? 'e.g. type="user"' : 'e.g. age > 18 AND status = \'active\''}
              value={filter}
              onChange={(e) => setFilter?.(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onRetrieve?.()}
            />
            {filter && (
              <button
                onClick={() => setFilter?.('')}
                className="absolute right-2 top-1.5 text-text-tertiary hover:text-text-primary"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={onRetrieve}
          className="h-7 px-4 font-semibold text-[11px] shadow-sm hover:shadow-md transition-all whitespace-nowrap"
          disabled={loading}
        >
          {isCouchbase ? 'Retrieve' : 'Run Filter'}
        </Button>

        {/* Local Table Filter */}
        <div className="flex items-center gap-2 border-l border-border-light pl-4 ml-auto">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" size={13} />
            <input
              className="h-7 px-8 bg-bg-2 border border-border-subtle rounded-md text-[11px] text-text-primary outline-none focus:ring-1 focus:ring-accent placeholder:text-text-tertiary/50 transition-all w-48 focus:w-64"
              placeholder="Search in current batch..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
            />
            {localSearch && (
              <button
                onClick={() => setLocalSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-3 py-1.5 bg-black/20 border-b border-white/5 flex items-center justify-between text-[10px] text-text-tertiary">
        <div className="flex items-center gap-1.5 px-1 py-0.5 rounded-md bg-bg-1/50 border border-border-light/20 shadow-inner">
          <span className="text-accent font-bold">
            {filteredRows.length}{localSearch ? ` / ${data.rows.length}` : ''} records
          </span>
          <span className="opacity-40">│</span>
          {isCouchbase ? (
            <code className="text-text-secondary">
              `{bucket || currentConnection?.database || 'default'}`.`{schema}`.`{table}`
            </code>
          ) : (
            <code className="text-text-secondary">
              {schema}.{table}
            </code>
          )}
          {filter && (
            <>
              <span className="opacity-40">where</span>
              <code className="text-accent/80 font-mono font-bold bg-accent/5 px-1 rounded truncate max-w-[200px]" title={filter}>
                {filter}
              </code>
            </>
          )}
          <span className="opacity-40">│</span>
          <span>limit {pageSize}</span>
        </div>

        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-2.5 bg-bg-2/50 hover:bg-bg-3/80 px-3 py-1 rounded-full border border-border-light/50 transition-all cursor-pointer group/edit-toggle select-none"
            onClick={() => setInlineEditingEnabled(!inlineEditingEnabled)}
            title={inlineEditingEnabled ? "Disable Inline Editing" : "Enable Inline Editing"}
          >
            <span className={`font-bold text-[9px] uppercase tracking-widest transition-colors ${inlineEditingEnabled ? 'text-accent' : 'text-text-tertiary opacity-60'}`}>
              Inline Edit
            </span>
            <div
              className={`w-8 h-4 rounded-full relative transition-all duration-300 ${inlineEditingEnabled ? 'bg-accent/20 ring-1 ring-accent/30' : 'bg-bg-active ring-1 ring-border-light/30'
                }`}
            >
              <div
                className={`absolute top-0.5 w-3 h-3 rounded-full shadow-sm transition-all duration-300 ${inlineEditingEnabled ? 'right-0.5 bg-accent' : 'left-0.5 bg-text-tertiary'
                  }`}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="px-3 py-2 border-b border-white/5 flex justify-between items-center bg-bg-1/20 backdrop-blur-lg">
        <div className="flex items-center gap-3">
          <h2 className="text-[11px] font-bold text-text-tertiary uppercase tracking-widest px-1 py-0.5 rounded bg-bg-2 border border-border-light/50">
            {!isCouchbase && `${schema}.${table}`}
            {isCouchbase && `${table}`}
          </h2>
          {isAddingRow && (
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={onSaveNewRow}
                disabled={saving}
                icon={<Save size={14} />}
              >
                Save Row
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancelNewRow}
                disabled={saving}
                icon={<X size={14} />}
              >
                Cancel
              </Button>
            </div>
          )}
          {hasChanges && (
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={onSave}
                disabled={saving}
                icon={<Save size={14} />}
              >
                Save ({Object.keys(edits).length})
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onDiscard}
                disabled={saving}
                icon={<X size={14} />}
              >
                Discard
              </Button>
            </div>
          )}
        </div>
        <div className="flex gap-2 items-center">
          <div className="relative" ref={columnSelectorRef}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowColumnSelector(!showColumnSelector)}
              icon={<Columns size={14} />}
              className={`h-8 px-2 ${fields.length > 0 ? 'text-accent bg-accent/10' : ''}`}
            >
              Cols {fields.length > 0 ? `(${fields.length})` : ''}
            </Button>
            {showColumnSelector && (
              <div className="absolute top-full right-0 mt-1 w-56 bg-bg-1 border border-border-light rounded-lg shadow-xl z-50 overflow-hidden flex flex-col max-h-[300px]">
                <div className="p-2 border-b border-border-light bg-bg-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-text-secondary">Select Columns</span>
                    <button
                      onClick={() => setFields?.([])}
                      className="text-[10px] text-accent hover:underline"
                    >
                      Reset
                    </button>
                  </div>
                </div>
                <div className="overflow-y-auto p-1 custom-scrollbar">
                  {_columnsInfo.map(col => (
                    <div key={col.name} className="flex items-center gap-2 p-1.5 hover:bg-bg-2 rounded cursor-pointer" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={fields.length === 0 || fields.includes(col.name)}
                        onChange={(checked) => {
                          if (!setFields) return;
                          if (fields.length === 0) {
                            // If currently "all" (empty), switch to all except one if unchecking?
                            // Or switch to just this one if checking?
                            // Logic:
                            // If empty, it means ALL. If user clicks one, it implies they want to filter.
                            // Actually, if it's empty, we should interpret "checked" as "unchecking this one means selecting all others".
                            // Simpler: If empty, treat as if all are checked.
                            const allMap = _columnsInfo.map(c => c.name);
                            if (checked) {
                              // Already "checked" implicitly. Do nothing?
                              // If they click an unchecked one?
                            } else {
                              // Unchecking one from "All".
                              setFields(allMap.filter(n => n !== col.name));
                            }
                          } else {
                            if (checked) {
                              setFields([...fields, col.name]);
                            } else {
                              setFields(fields.filter(f => f !== col.name));
                            }
                          }
                        }}
                      />
                      <span className="text-xs text-text-secondary">{col.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={onStartAddingRow}
            icon={<Plus size={14} />}
            className="h-8"
          >
            Row
          </Button>
          <div className="h-4 w-px bg-border-light mx-1 self-center" />
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            icon={<RefreshCw size={15} />}
            className="h-8 w-8 p-0"
            title="Refresh"
          />
          <div className="h-4 w-px bg-border-light mx-1 self-center" />
          {/* Pagination */}
          <div className="flex items-center gap-1 rounded-full bg-bg-2 border border-border-light p-0.5">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0 || loading}
              className="p-1.5 rounded-full hover:bg-bg-0 disabled:opacity-30 text-text-secondary hover:text-text-primary transition-all"
              title="Previous batch"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs text-text-secondary px-2 font-medium min-w-[60px] text-center">
              Batch {page + 1}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={!data.rows.length || data.rows.length < pageSize || loading}
              className="p-1.5 rounded-full hover:bg-bg-0 disabled:opacity-30 text-text-secondary hover:text-text-primary transition-all"
              title="Next batch"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      <div
        ref={tableContainerRef}
        className="flex-1 overflow-auto rounded-xl mt-[10px] border border-border-subtle shadow-sm bg-bg-1 backdrop-blur-sm mx-2 mb-2 pb-[50px] custom-scrollbar"
        style={{ scrollbarGutter: 'stable' }}
      >
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 z-20 bg-bg-1 shadow-lg">
            {tableInstance.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-xs font-semibold text-text-secondary tracking-wide select-none first:pl-6 border-b border-r border-border-subtle last:border-r-0 transition-colors hover:text-text-primary hover:bg-bg-2"
                    style={{ width: header.getSize() }}
                  >
                    <div className="flex items-center gap-1.5 cursor-pointer" onClick={header.column.getToggleSortingHandler()}>
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {{
                        asc: <span className="text-accent text-[9px] opacity-80">▲</span>,
                        desc: <span className="text-accent text-[9px] opacity-80">▼</span>,
                      }[header.column.getIsSorted() as string] ?? null}
                    </div>
                    {/* Resizer Handle */}
                    <div
                      onMouseDown={header.getResizeHandler()}
                      onTouchStart={header.getResizeHandler()}
                      className={`absolute right-0 top-3 bottom-3 w-[1px] bg-border-subtle hover:bg-accent hover:w-[2px] cursor-col-resize touch-none opacity-0 hover:opacity-100 transition-all ${header.column.getIsResizing() ? 'bg-accent w-[2px] opacity-100' : ''
                        }`}
                    />
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-border-subtle font-sans relative">
            {isAddingRow && (
              <tr className="bg-primary-transparent transition-all">
                {/* Spacer for Index Column */}
                <td className="px-4 py-2.5" />
                {(data?.columns?.length ? data.columns : _columnsInfo.map(c => c.name)).map((_col, index) => (
                  <td
                    key={`new-row-${index}`}
                    className="px-4 py-2.5"
                  >
                    <input
                      autoFocus={index === 0}
                      className="w-full bg-transparent border-b border-accent-subtle focus:border-accent outline-none py-1 text-xs text-text-primary placeholder:text-text-tertiary font-medium transition-colors"
                      value={newRowData[index] === undefined ? '' : String(newRowData[index])}
                      onChange={(e) => onNewRowChange(index, e.target.value)}
                      placeholder="Enter value"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          onSaveNewRow();
                        } else if (e.key === 'Escape') {
                          onCancelNewRow();
                        }
                      }}
                    />
                  </td>
                ))}
              </tr>
            )}

            {/* Top Padding for Virtualization */}
            {rowVirtualizer.getVirtualItems().length > 0 && (
              <tr style={{ height: `${rowVirtualizer.getVirtualItems()[0].start}px` }}>
                <td colSpan={columns.length} />
              </tr>
            )}

            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const row = rows[virtualRow.index];
              const isModified = edits[row.index] !== undefined;
              const isSelected = selectedRow?.rowIndex === row.index;

              return (
                <tr
                  key={row.id}
                  data-index={virtualRow.index}
                  ref={rowVirtualizer.measureElement}
                  className={`
                    group transition-colors duration-150 ease-out cursor-pointer
                    ${isSelected
                      ? 'bg-primary-transparent'
                      : isModified ? 'bg-warning-50' : `hover:bg-bg-2/50 ${row.index % 2 === 1 ? 'bg-bg-subtle' : ''}`
                    }
                  `}
                  onClick={() => {
                    setSelectedRow({
                      rowIndex: row.index,
                      rowData: row.original,
                      columns: data.columns,
                      schema: schema,
                      table: table,
                    });
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={`
                        px-4 py-2.5 text-xs text-text-primary whitespace-nowrap overflow-hidden text-ellipsis max-w-[300px] first:pl-6
                        border-r border-border-subtle last:border-r-0
                        ${isSelected ? 'text-accent-foreground' : ''}
                      `}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              )
            })}
            {/* Bottom Padding for Virtualization */}
            {rowVirtualizer.getVirtualItems().length > 0 && (
              <tr style={{ height: `${rowVirtualizer.getTotalSize() - rowVirtualizer.getVirtualItems()[rowVirtualizer.getVirtualItems().length - 1].end}px` }}>
                <td colSpan={columns.length} />
              </tr>
            )}
          </tbody>
        </table>
        {data.rows.length === 0 && (
          <div className="flex flex-col items-center justify-center p-12 text-text-secondary/60">
            <p>No rows found</p>
          </div>
        )}
      </div>
      {jsonEditorState && (
        <JsonEditorModal
          isOpen={true}
          onClose={() => setJsonEditorState(null)}
          onSave={(newValue) => {
            if (jsonEditorState) {
              onEdit(jsonEditorState.rowIndex, jsonEditorState.colIndex, newValue);
            }
          }}
          initialValue={jsonEditorState.value as any}
          readOnly={jsonEditorState.readOnly}
          title={`Edit ${data?.columns?.[jsonEditorState.colIndex] || 'JSON'}`}
        />
      )}
    </>
  );
}
