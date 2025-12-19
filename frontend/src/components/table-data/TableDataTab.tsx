import { useMemo, useRef, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ChevronLeft, ChevronRight, Save, X, RefreshCw, Plus, ArrowRight, Edit, Copy, MoreHorizontal, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSelectedRow } from '../../context/SelectedRowContext';
import { useTablePage } from '../../context/TablePageContext';
import { TableColumn, QueryResult, EditState, SchemaForeignKey } from '../../types';
import Button from '../ui/Button';
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
}: TableDataTabProps) {
  const { currentPage: page, setCurrentPage: setPage, pageSize } = useTablePage();
  const { selectedRow, setSelectedRow } = useSelectedRow();
  const { connections } = useConnectionStore();
  const currentConnection = connections.find(c => c.id === connectionId);
  const [inlineEditingEnabled, setInlineEditingEnabled] = useState(true);

  // Virtualization Ref
  const tableContainerRef = useRef<HTMLDivElement>(null);

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

  const tableInstance = useReactTable({
    data: data?.rows || [],
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
      {isCouchbase && (
        <div className="px-3 py-2 border-b border-border-light flex flex-wrap items-center gap-3 bg-bg-1 glass shadow-sm">
          {/* Bucket Selector */}
          <div className="flex flex-col gap-0.5 min-w-[140px]">
            <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider ml-1">Bucket</label>
            <select
              className="h-8 px-2 bg-bg-2 border border-border-subtle rounded-lg text-xs font-medium text-text-primary outline-none focus:ring-1 focus:ring-accent transition-all cursor-pointer"
              value={bucket || currentConnection?.database || ''}
              onChange={(e) => setBucket?.(e.target.value)}
            >
              <option value={currentConnection?.database || ''}>{currentConnection?.database || 'default'}</option>
              {/* Other buckets could be fetched/listed here if needed */}
            </select>
          </div>

          <div className="h-8 w-px bg-border-light mx-1 self-end mb-1" />

          {/* Doc ID Retrieval */}
          <div className="flex flex-col gap-0.5 min-w-[180px]">
            <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider ml-1">Document ID</label>
            <input
              className="h-8 px-3 bg-bg-2 border border-border-subtle rounded-lg text-xs text-text-primary outline-none focus:ring-1 focus:ring-accent placeholder:text-text-tertiary transition-all"
              placeholder="Retrieval by ID..."
              value={documentId}
              onChange={(e) => setDocumentId?.(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onRetrieve?.()}
            />
          </div>

          {/* N1QL WHERE Filtering */}
          <div className="flex-1 flex flex-col gap-0.5 min-w-[240px]">
            <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider ml-1">N1QL WHERE</label>
            <input
              className="h-8 px-3 bg-bg-2 border border-border-subtle rounded-lg text-xs text-text-primary outline-none focus:ring-1 focus:ring-accent placeholder:text-text-tertiary font-mono transition-all"
              placeholder='e.g. type="user" AND city="HCM"'
              value={filter}
              onChange={(e) => setFilter?.(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onRetrieve?.()}
            />
          </div>

          <div className="flex flex-col gap-0.5 self-end mb-0.5">
            <Button
              variant="primary"
              size="sm"
              onClick={onRetrieve}
              className="h-8 px-5 font-semibold shadow-sm hover:shadow-md active:scale-95 transition-all"
              disabled={loading}
            >
              Retrieve Docs
            </Button>
          </div>
        </div>
      )}

      {isCouchbase && (
        <div className="px-4 py-1.5 bg-bg-2/50 border-b border-border-light flex items-center justify-between text-[11px] text-text-tertiary">
          <div className="flex items-center gap-1.5 font-medium">
            <span className="text-accent underline cursor-help decoration-accent/30 underline-offset-2">
              {data.rows.length} results
            </span>
            <span>for selection from</span>
            <code className="bg-bg-3 px-1.5 py-0.5 rounded text-text-secondary border border-border-light">
              `{bucket || currentConnection?.database || 'default'}`.`{schema}`.`{table}`
            </code>
            {filter && (
              <>
                <span>where</span>
                <code className="bg-bg-3 px-1.5 py-0.5 rounded text-accent/80 border border-border-light font-bold">
                  {filter}
                </code>
              </>
            )}
            <span>limit {pageSize} offset {page * pageSize}</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-bg-3 px-2 py-0.5 rounded-full border border-border-light">
              <span className="font-bold text-[9px] uppercase tracking-tighter">Edit Labels</span>
              <button
                onClick={() => setInlineEditingEnabled(!inlineEditingEnabled)}
                className={`w-7 h-3.5 rounded-full relative transition-colors ${inlineEditingEnabled ? 'bg-accent' : 'bg-bg-active'}`}
              >
                <div className={`absolute top-0.5 w-2.5 h-2.5 bg-white rounded-full shadow-sm transition-all ${inlineEditingEnabled ? 'right-0.5' : 'left-0.5'}`} />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="p-3 border-b border-border-light flex justify-between items-center bg-bg-1 glass">
        <div className="flex items-center gap-4">
          <h2 className="text-sm font-semibold text-text-primary px-2">
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
    </>
  );
}
