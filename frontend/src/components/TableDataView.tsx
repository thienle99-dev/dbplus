import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import { Save, X, RefreshCw, Plus } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { useSelectedRow } from '../context/SelectedRowContext';
import { useTablePage } from '../context/TablePageContext';

interface TableColumn {
  name: string;
  data_type: string;
  is_nullable: boolean;
  default_value: string | null;
  is_primary_key: boolean;
}

interface QueryResult {
  columns: string[];
  rows: unknown[][];
  affected_rows: number;
}

interface EditState {
  [rowId: string]: {
    [colIndex: number]: unknown;
  };
}

export default function TableDataView() {
  const { connectionId, schema, table } = useParams();
  const [data, setData] = useState<QueryResult | null>(null);
  const [columnsInfo, setColumnsInfo] = useState<TableColumn[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { currentPage: page, setCurrentPage: setPage, pageSize } = useTablePage();
  const [edits, setEdits] = useState<EditState>({});
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();
  const { setSelectedRow } = useSelectedRow();

  const fetchColumns = useCallback(async () => {
    try {
      const response = await api.get(
        `/api/connections/${connectionId}/columns?schema=${schema}&table=${table}`
      );
      setColumnsInfo(response.data);
    } catch (err) {
      console.error('Failed to fetch columns:', err);
    }
  }, [connectionId, schema, table]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const offset = page * pageSize;
      const response = await api.get(
        `/api/connections/${connectionId}/query?schema=${schema}&table=${table}&limit=${pageSize}&offset=${offset}`
      );
      setData(response.data);
      setEdits({}); // Clear edits on page change/refresh
    } catch (err: unknown) {
      const errorMessage = (err as any).response?.data || (err as Error).message || 'Failed to fetch data';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [connectionId, schema, table, page]);

  useEffect(() => {
    if (connectionId && schema && table) {
      fetchColumns();
      fetchData();
    }
  }, [connectionId, schema, table, fetchColumns, fetchData]);

  useEffect(() => {
    const handleRefresh = () => {
      fetchData();
    };
    window.addEventListener('refresh-table-data', handleRefresh);
    return () => window.removeEventListener('refresh-table-data', handleRefresh);
  }, [fetchData]);

  const handleEdit = (rowIndex: number, colIndex: number, value: unknown) => {
    setEdits(prev => ({
      ...prev,
      [rowIndex]: {
        ...prev[rowIndex],
        [colIndex]: value
      }
    }));
  };

  const getRowPK = (row: unknown[]) => {
    // Find indices of PK columns
    const pkIndices = columnsInfo
      .map((col, idx) => col.is_primary_key ? idx : -1)
      .filter(idx => idx !== -1);

    if (pkIndices.length === 0) return null;

    // Return object with PK column names and values
    const pk: Record<string, any> = {};
    pkIndices.forEach(idx => {
      pk[columnsInfo[idx].name] = row[idx];
    });
    return pk;
  };

  const handleSave = async () => {
    if (!data) return;
    setSaving(true);
    try {
      const updates = Object.entries(edits).map(([rowIndexStr, rowEdits]) => {
        const rowIndex = parseInt(rowIndexStr);
        const originalRow = data.rows[rowIndex];
        const pk = getRowPK(originalRow);

        if (!pk) {
          throw new Error(`Row ${rowIndex} has no primary key. Cannot update.`);
        }

        const setClauses = Object.entries(rowEdits).map(([colIndexStr, value]) => {
          const colIndex = parseInt(colIndexStr);
          const colName = data.columns[colIndex];
          // Simple escaping - strictly for prototype
          const escapedValue = value === null ? 'NULL' : `'${String(value).replace(/'/g, "''")}'`;
          return `"${colName}" = ${escapedValue}`;
        });

        const whereClauses = Object.entries(pk).map(([col, val]) => {
          const escapedVal = typeof val === 'string' ? `'${val.replace(/'/g, "''")}'` : val;
          return `"${col}" = ${escapedVal}`;
        });

        return `UPDATE "${schema}"."${table}" SET ${setClauses.join(', ')} WHERE ${whereClauses.join(' AND ')};`;
      });

      // Execute all updates in a transaction (conceptually - simplistic execution for now)
      for (const query of updates) {
        await api.post(`/api/connections/${connectionId}/execute`, { query });
      }

      await fetchData(); // Refresh data
      showToast('Changes saved successfully', 'success');
    } catch (err: unknown) {
      showToast(`Failed to save changes: ${(err as Error).message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const columns = useMemo(() => {
    if (!data?.columns) return [];
    const helper = createColumnHelper<unknown[]>();
    return data.columns.map((col, index) =>
      helper.accessor((row, rowIndex) => {
        // Return edited value if exists, else original
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
              onChange={(e) => handleEdit(rowIndex, index, e.target.value)}
              placeholder={val === null ? 'NULL' : ''}
            />
          );
        }
      })
    );
  }, [data?.columns, edits]);

  const tableInstance = useReactTable({
    data: data?.rows || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const hasChanges = Object.keys(edits).length > 0;

  if (loading && !data) {
    return <div className="p-8 text-text-secondary">Loading data...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-500">Error: {error}</div>;
  }

  if (!data) {
    return <div className="p-8 text-text-secondary">Select a table to view data</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border flex justify-between items-center bg-bg-1">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-text-primary">
            {schema}.{table}
          </h2>
          {hasChanges && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1 px-3 py-1.5 bg-accent hover:bg-blue-600 text-white rounded text-sm font-medium disabled:opacity-50"
              >
                <Save size={14} />
                Save ({Object.keys(edits).length})
              </button>
              <button
                onClick={() => setEdits({})}
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
            onClick={() => {
              if (data) {
                setSelectedRow({
                  rowIndex: -1,
                  rowData: new Array(data.columns.length).fill(null),
                  columns: data.columns,
                });
              }
            }}
            className="flex items-center gap-1 px-3 py-1.5 bg-accent hover:bg-blue-600 text-white rounded text-sm font-medium"
            title="Add New Record"
          >
            <Plus size={14} />
            Add Record
          </button>
          <div className="h-4 w-px bg-border mx-2 self-center" />
          <button
            onClick={fetchData}
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
            {tableInstance.getRowModel().rows.map((row) => {
              const isModified = edits[row.index] !== undefined;
              return (
                <tr 
                  key={row.id} 
                  className={`hover:bg-bg-1/50 cursor-pointer ${isModified ? 'bg-accent/5' : ''}`}
                  onClick={() => {
                    if (data) {
                      setSelectedRow({
                        rowIndex: row.index,
                        rowData: row.original,
                        columns: data.columns,
                      });
                    }
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
    </div>
  );
}
