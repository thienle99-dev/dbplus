import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import api from '../services/api';

interface QueryResult {
  columns: string[];
  rows: unknown[][];
  affected_rows: number;
}

export default function DataGrid() {
  const { connectionId, schema, table } = useParams();
  const [data, setData] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const pageSize = 100;

  useEffect(() => {
    if (connectionId && schema && table) {
      fetchData();
    }
  }, [connectionId, schema, table, page]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const offset = page * pageSize;
      const response = await api.get(
        `/api/connections/${connectionId}/query?schema=${schema}&table=${table}&limit=${pageSize}&offset=${offset}`
      );
      setData(response.data);
    } catch (err: unknown) {
      const errorMessage = (err as any).response?.data || (err as Error).message || 'Failed to fetch data';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const columns = useMemo(() => {
    if (!data?.columns) return [];
    const helper = createColumnHelper<unknown[]>();
    return data.columns.map((col, index) => 
      helper.accessor((row) => row[index], {
        id: col,
        header: col,
        cell: (info) => {
          const val = info.getValue();
          if (val === null) return <span className="text-text-secondary italic">null</span>;
          if (typeof val === 'boolean') return val ? 'true' : 'false';
          if (typeof val === 'object') return JSON.stringify(val);
          return String(val);
        }
      })
    );
  }, [data?.columns]);

  const tableInstance = useReactTable({
    data: data?.rows || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

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
      <div className="p-4 border-b border-border flex justify-between items-center">
        <h2 className="text-lg font-semibold text-text-primary">
          {schema}.{table}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0 || loading}
            className="px-3 py-1 bg-bg-2 rounded hover:bg-bg-3 disabled:opacity-50 text-sm"
          >
            Previous
          </button>
          <span className="flex items-center text-sm text-text-secondary">
            Page {page + 1}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
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
            {tableInstance.getRowModel().rows.map((row) => (
              <tr key={row.id} className="hover:bg-bg-1/50">
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className="border-b border-r border-border px-4 py-1.5 text-text-primary whitespace-nowrap overflow-hidden text-ellipsis max-w-[300px]"
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {data.rows.length === 0 && (
          <div className="p-8 text-center text-text-secondary">No rows found</div>
        )}
      </div>
    </div>
  );
}
