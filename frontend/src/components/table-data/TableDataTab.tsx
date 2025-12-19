import { useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import { ChevronLeft, ChevronRight, Save, X, RefreshCw, Plus, ArrowRight, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
// import api from '../../services/api';
// import { useToast } from '../../context/ToastContext';
import { useSelectedRow } from '../../context/SelectedRowContext';
import { useTablePage } from '../../context/TablePageContext';
import { TableColumn, QueryResult, EditState, SchemaForeignKey } from '../../types';
import Button from '../ui/Button';
import { formatCellValue, isComplexType } from '../../utils/cellFormatters';

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
  onDelete?: () => Promise<void>;
  foreignKeys?: SchemaForeignKey[];
  isCouchbase?: boolean;
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
  onDelete,
  foreignKeys = [],
  isCouchbase = false,
}: TableDataTabProps) {
  const { currentPage: page, setCurrentPage: setPage, pageSize } = useTablePage();
  // const { showToast } = useToast();
  const { selectedRow, setSelectedRow } = useSelectedRow();

  const rowTerm = isCouchbase ? 'Document' : 'Row';

  const columns = useMemo(() => {
    if (!data?.columns) return [];
    const helper = createColumnHelper<unknown[]>();
    return data.columns.map((col, index) =>
      helper.accessor((row, rowIndex) => {
        if (edits[rowIndex]?.[index] !== undefined) {
          return edits[rowIndex][index];
        }
        return row[index];
      }, {
        id: col,
        header: () => {
          const colInfo = _columnsInfo.find(c => c.name === col);
          const isPk = colInfo?.is_primary_key || (isCouchbase && (col === '_id' || col === 'id'));
          return (
            <div className="flex items-center gap-1.5 min-w-0">
              {isPk && (
                <span title="Primary Key" className="text-yellow-500 flex-shrink-0 drop-shadow-sm">
                  🔑
                </span>
              )}
              <span className="truncate">{col}</span>
            </div>
          );
        },
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
        }
      })
    );
  }, [data?.columns, edits, onEdit, foreignKeys, connectionId]);

  const tableInstance = useReactTable({
    data: data?.rows || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const hasChanges = Object.keys(edits).length > 0;

  return (
    <>
      <div className="p-3 border-b border-border/40 flex justify-between items-center bg-bg-1/80 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <h2 className="text-sm font-semibold text-text-primary px-2">
            {schema}.{table}
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
                Save {rowTerm}
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
          {selectedRow && !hasChanges && !isAddingRow && onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              icon={<Trash2 size={14} />}
              className="text-red-500 hover:text-red-600 hover:bg-red-50/10"
            >
              Delete {rowTerm}
            </Button>
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
            {rowTerm}
          </Button>
          <div className="h-4 w-px bg-border/40 mx-1 self-center" />
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            icon={<RefreshCw size={15} />}
            className="h-8 w-8 p-0"
            title="Refresh"
          />
          <div className="h-4 w-px bg-border/40 mx-1 self-center" />
          <div className="flex items-center gap-1 rounded-full bg-bg-2/50 border border-border/40 p-0.5">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0 || loading}
              className="p-1.5 rounded-full hover:bg-bg-0 disabled:opacity-30 text-text-secondary hover:text-text-primary transition-all"
              title="Previous page"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs text-text-secondary px-2 font-medium min-w-[60px] text-center">
              Page {page + 1}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={!data.rows.length || data.rows.length < pageSize || loading}
              className="p-1.5 rounded-full hover:bg-bg-0 disabled:opacity-30 text-text-secondary hover:text-text-primary transition-all"
              title="Next page"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div >

      <div
        className="flex-1 overflow-auto rounded-xl border border-border/10 shadow-sm bg-bg-1/30 backdrop-blur-sm mx-2 mb-2 custom-scrollbar"
        style={{ scrollbarGutter: 'stable' }}
      >
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 z-20 bg-bg-1/85 backdrop-blur-md shadow-sm">
            {tableInstance.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-xs font-semibold text-text-secondary/90 tracking-wide select-none first:pl-6 border-b border-r border-border/10 last:border-r-0 transition-colors hover:text-text-primary hover:bg-bg-2/30"
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
                      className={`absolute right-0 top-3 bottom-3 w-[1px] bg-border/20 hover:bg-accent hover:w-[2px] cursor-col-resize touch-none opacity-0 hover:opacity-100 transition-all ${header.column.getIsResizing() ? 'bg-accent w-[2px] opacity-100' : ''
                        }`}
                    />
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-border/10 font-sans">
            {isAddingRow && (
              <tr className="bg-accent/5 transition-all">
                {data.columns.map((_col, index) => (
                  <td
                    key={`new-row-${index}`}
                    className="px-4 py-2.5 first:pl-6"
                  >
                    <input
                      autoFocus={index === 0}
                      className="w-full bg-transparent border-b border-accent/30 focus:border-accent outline-none py-1 text-xs text-text-primary placeholder:text-text-secondary/40 font-medium transition-colors"
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
            {tableInstance.getRowModel().rows.map((row, i) => {
              const isModified = edits[row.index] !== undefined;
              const isSelected = selectedRow?.rowIndex === row.index;

              return (
                <tr
                  key={row.id}
                  className={`
                    group transition-colors duration-150 ease-out cursor-pointer
                    ${isSelected
                      ? 'bg-accent/10'
                      : isModified ? 'bg-amber-500/5' : `hover:bg-bg-2/50 ${i % 2 === 1 ? 'bg-gray-500/5' : ''}`
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
                        border-r border-border/5 last:border-r-0
                        ${isSelected ? 'text-accent-foreground' : ''}
                      `}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
        {data.rows.length === 0 && (
          <div className="flex flex-col items-center justify-center p-12 text-text-secondary/60">
            <p>No {rowTerm.toLowerCase()}s found</p>
          </div>
        )}
      </div>
    </>
  );
}
