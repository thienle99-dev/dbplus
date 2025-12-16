import { useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import { ChevronLeft, ChevronRight, Save, X, RefreshCw, Plus } from 'lucide-react';
// import api from '../../services/api';
// import { useToast } from '../../context/ToastContext';
import { useSelectedRow } from '../../context/SelectedRowContext';
import { useTablePage } from '../../context/TablePageContext';
import { TableColumn, QueryResult, EditState } from '../../types';
import Button from '../ui/Button';

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
}

export default function TableDataTab({
  // connectionId,
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
}: TableDataTabProps) {
  const { currentPage: page, setCurrentPage: setPage, pageSize } = useTablePage();
  // const { showToast } = useToast();
  const { setSelectedRow } = useSelectedRow();

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
        header: col,
        cell: (info) => {
          const val = info.getValue();
          const rowIndex = info.row.index;
          const isEdited = edits[rowIndex]?.[index] !== undefined;

          return (
            <input
              className={`w-full bg-transparent border-none outline-none p-0 text-sm ${isEdited ? 'text-accent font-medium' : 'text-text-primary'}`}
              value={val === null ? '' : String(val)}
              onChange={(e) => onEdit(rowIndex, index, e.target.value)}
              placeholder={val === null ? 'NULL' : ''}
            />
          );
        }
      })
    );
  }, [data?.columns, edits, onEdit]);

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
      </div>

      <div className="flex-1 overflow-auto bg-bg-1/30">
        <table className="w-full border-collapse text-xs">
          <thead className="bg-bg-2/80 backdrop-blur sticky top-0 z-10">
            {tableInstance.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-border/60">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="border-r border-border/30 px-4 py-2 text-left font-semibold text-text-secondary tracking-wide min-w-[150px] first:pl-6"
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
          <tbody className="divide-y divide-border/30">
            {isAddingRow && (
              <tr className="bg-accent/5">
                {data.columns.map((_col, index) => (
                  <td
                    key={`new-row-${index}`}
                    className="border-r border-border/30 px-4 py-2 first:pl-6"
                  >
                    <input
                      autoFocus={index === 0}
                      className="w-full bg-transparent border-b border-accent/50 outline-none p-0 text-xs text-text-primary placeholder:text-text-secondary/50 focus:border-accent font-medium"
                      value={newRowData[index] === undefined ? '' : String(newRowData[index])}
                      onChange={(e) => onNewRowChange(index, e.target.value)}
                      placeholder="NULL"
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
            {tableInstance.getRowModel().rows.map((row) => {
              const isModified = edits[row.index] !== undefined;
              return (
                <tr
                  key={row.id}
                  className={`group hover:bg-bg-2/50 transition-colors ${isModified ? 'bg-amber-500/5' : 'odd:bg-bg-1/30'}`}
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
                      className="border-r border-border/20 px-4 py-2 text-text-primary whitespace-nowrap overflow-hidden text-ellipsis max-w-[300px] first:pl-6 group-hover:border-border/10"
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
            <p>No rows found</p>
          </div>
        )}
      </div>
    </>
  );
}
