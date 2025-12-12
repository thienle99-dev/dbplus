import { useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import { Save, X, RefreshCw, Plus } from 'lucide-react';
// import api from '../../services/api';
// import { useToast } from '../../context/ToastContext';
import { useSelectedRow } from '../../context/SelectedRowContext';
import { useTablePage } from '../../context/TablePageContext';
import { TableColumn, QueryResult, EditState } from '../../types';

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
      <div className="p-4 border-b border-border flex justify-between items-center bg-bg-1">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-text-primary">
            {schema}.{table}
          </h2>
          {isAddingRow && (
            <div className="flex items-center gap-2">
              <button
                onClick={onSaveNewRow}
                disabled={saving}
                className="flex items-center gap-1 px-3 py-1.5 bg-accent hover:bg-blue-600 text-white rounded text-sm font-medium disabled:opacity-50"
              >
                <Save size={14} />
                Save Row
              </button>
              <button
                onClick={onCancelNewRow}
                disabled={saving}
                className="flex items-center gap-1 px-3 py-1.5 bg-bg-3 hover:bg-bg-2 text-text-primary rounded text-sm font-medium"
              >
                <X size={14} />
                Cancel
              </button>
            </div>
          )}
          {hasChanges && (
            <div className="flex items-center gap-2">
              <button
                onClick={onSave}
                disabled={saving}
                className="flex items-center gap-1 px-3 py-1.5 bg-accent hover:bg-blue-600 text-white rounded text-sm font-medium disabled:opacity-50"
              >
                <Save size={14} />
                Save ({Object.keys(edits).length})
              </button>
              <button
                onClick={onDiscard}
                disabled={saving}
                className="flex items-center gap-1 px-3 py-1.5 bg-bg-3 hover:bg-bg-2 text-text-primary rounded text-sm font-medium"
              >
                <X size={14} />
                Discard
              </button>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={onStartAddingRow}
            className="flex items-center gap-1 px-3 py-1.5 bg-accent hover:bg-blue-600 text-white rounded text-sm font-medium"
            title="Add New Record"
          >
            <Plus size={14} />
            Row
          </button>
          <div className="h-4 w-px bg-border mx-2 self-center" />
          <button
            onClick={onRefresh}
            className="p-1.5 text-text-secondary hover:text-text-primary rounded hover:bg-bg-2"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
          <div className="h-4 w-px bg-border mx-2 self-center" />
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0 || loading}
            className="px-3 py-1 bg-bg-2 rounded hover:bg-bg-3 disabled:opacity-50 text-sm"
          >
            Previous
          </button>
          <span className="flex items-center text-sm text-text-secondary">
            Page {page + 1}
          </span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={!data.rows.length || data.rows.length < pageSize || loading}
            className="px-3 py-1 bg-bg-2 rounded hover:bg-bg-3 disabled:opacity-50 text-sm"
          >
            Next
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-bg-1 sticky top-0 z-10">
            {tableInstance.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="border-b border-r border-border px-4 py-2 text-left font-medium text-text-secondary min-w-[150px]"
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
            {isAddingRow && (
              <tr className="bg-accent/10">
                {data.columns.map((_col, index) => (
                  <td
                    key={`new-row-${index}`}
                    className="border-b border-r border-border px-4 py-1.5"
                  >
                    <input
                      autoFocus={index === 0}
                      className="w-full bg-transparent border-b border-accent/50 outline-none p-0 text-sm text-text-primary placeholder:text-text-secondary/50"
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
                  className={`hover:bg-bg-1/50 cursor-pointer ${isModified ? 'bg-accent/5' : ''}`}
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
                      className="border-b border-r border-border px-4 py-1.5 text-text-primary whitespace-nowrap overflow-hidden text-ellipsis max-w-[300px]"
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
          <div className="p-8 text-center text-text-secondary">No rows found</div>
        )}
      </div>
    </>
  );
}
