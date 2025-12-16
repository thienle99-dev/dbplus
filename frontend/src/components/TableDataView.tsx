import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Database, Info, Table } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { useTablePage } from '../context/TablePageContext';
import TableStructureTab from './TableStructureTab';
import TableInfoTab from './TableInfoTab';
import TableDataTab from './table-data/TableDataTab';
import { TableColumn, QueryResult, EditState, TableDataViewProps } from '../types';

export default function TableDataView({ schema: schemaProp, table: tableProp }: TableDataViewProps = {}) {
  const params = useParams();
  // Use props if provided, otherwise fall back to URL params
  const schema = schemaProp || params.schema;
  const table = tableProp || params.table;
  const connectionId = params.connectionId;
  const [data, setData] = useState<QueryResult | null>(null);
  const [columnsInfo, setColumnsInfo] = useState<TableColumn[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { currentPage: page, pageSize } = useTablePage();
  const [edits, setEdits] = useState<EditState>({});
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();
  const fetchingRef = useRef(false);
  const fetchingColumnsRef = useRef(false);
  const columnsCacheKeyRef = useRef<string>('');
  const [activeTab, setActiveTab] = useState<'data' | 'structure' | 'info'>('data');
  const [isAddingRow, setIsAddingRow] = useState(false);
  const [newRowData, setNewRowData] = useState<Record<number, unknown>>({});

  // Guard: Return early if schema or table is not defined
  if (!schema || !table) {
    return <div className="flex h-full items-center justify-center text-text-secondary/50 font-medium">Select a table to view data</div>;
  }

  const fetchColumns = useCallback(async () => {
    if (!connectionId || !schema || !table || fetchingColumnsRef.current) return;
    const cacheKey = `${connectionId}-${schema}-${table}`;
    if (columnsCacheKeyRef.current === cacheKey) {
      return;
    }
    fetchingColumnsRef.current = true;
    columnsCacheKeyRef.current = cacheKey;
    try {
      const response = await api.get(
        `/api/connections/${connectionId}/columns?schema=${schema}&table=${table}`
      );
      setColumnsInfo(response.data);
    } catch (err) {
      console.error('Failed to fetch columns:', err);
      columnsCacheKeyRef.current = '';
    } finally {
      fetchingColumnsRef.current = false;
    }
  }, [connectionId, schema, table]);

  const fetchData = useCallback(async () => {
    if (!connectionId || !schema || !table || fetchingRef.current) return;
    fetchingRef.current = true;
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
      fetchingRef.current = false;
    }
  }, [connectionId, schema, table, page, pageSize]);

  useEffect(() => {
    const cacheKey = `${connectionId}-${schema}-${table}`;
    if (columnsCacheKeyRef.current !== cacheKey) {
      columnsCacheKeyRef.current = '';
      setColumnsInfo([]);
    }
  }, [connectionId, schema, table]);

  useEffect(() => {
    if (connectionId && schema && table) {
      fetchColumns();
      fetchData();
    }
  }, [connectionId, schema, table, page, pageSize]);

  useEffect(() => {
    const handleRefresh = () => {
      if (connectionId && schema && table) {
        fetchData();
      }
    };
    window.addEventListener('refresh-table-data', handleRefresh);
    return () => window.removeEventListener('refresh-table-data', handleRefresh);
  }, [connectionId, schema, table, page, pageSize]);

  const handleEdit = useCallback((rowIndex: number, colIndex: number, value: unknown) => {
    setEdits(prev => ({
      ...prev,
      [rowIndex]: {
        ...prev[rowIndex],
        [colIndex]: value
      }
    }));
  }, []);

  const getRowPK = useCallback((row: unknown[]) => {
    const pkIndices = columnsInfo
      .map((col, idx) => col.is_primary_key ? idx : -1)
      .filter(idx => idx !== -1);

    if (pkIndices.length === 0) return null;

    const pk: Record<string, any> = {};
    pkIndices.forEach(idx => {
      pk[columnsInfo[idx].name] = row[idx];
    });
    return pk;
  }, [columnsInfo]);

  const handleSave = useCallback(async () => {
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
          const escapedValue = value === null ? 'NULL' : `'${String(value).replace(/'/g, "''")}'`;
          return `"${colName}" = ${escapedValue}`;
        });

        const whereClauses = Object.entries(pk).map(([col, val]) => {
          const escapedVal = typeof val === 'string' ? `'${val.replace(/'/g, "''")}'` : val;
          return `"${col}" = ${escapedVal}`;
        });

        return `UPDATE "${schema}"."${table}" SET ${setClauses.join(', ')} WHERE ${whereClauses.join(' AND ')};`;
      });

      for (const query of updates) {
        await api.post(`/api/connections/${connectionId}/execute`, { query });
      }

      await fetchData();
      showToast('Changes saved successfully', 'success');
    } catch (err: unknown) {
      showToast(`Failed to save changes: ${(err as Error).message}`, 'error');
    } finally {
      setSaving(false);
    }
  }, [data, edits, getRowPK, schema, table, connectionId, fetchData, showToast]);

  const handleNewRowChange = useCallback((colIndex: number, value: string) => {
    setNewRowData(prev => ({
      ...prev,
      [colIndex]: value
    }));
  }, []);

  const handleSaveNewRow = useCallback(async () => {
    if (!data) return;
    setSaving(true);
    try {
      const entries = Object.entries(newRowData);
      if (entries.length === 0) {
        showToast('No data to insert', 'error');
        setSaving(false);
        return;
      }

      const columns: string[] = [];
      const values: string[] = [];

      entries.forEach(([colIndexStr, value]) => {
        const colIndex = parseInt(colIndexStr);
        const colName = data.columns[colIndex];
        columns.push(`"${colName}"`);
        values.push(`'${String(value).replace(/'/g, "''")}'`);
      });

      const query = `INSERT INTO "${schema}"."${table}" (${columns.join(', ')}) VALUES (${values.join(', ')});`;

      await api.post(`/api/connections/${connectionId}/execute`, { query });

      await fetchData();
      showToast('Row added successfully', 'success');
      setIsAddingRow(false);
      setNewRowData({});
    } catch (err: unknown) {
      showToast(`Failed to add row: ${(err as Error).message}`, 'error');
    } finally {
      setSaving(false);
    }
  }, [data, newRowData, schema, table, connectionId, fetchData, showToast]);

  const handleCancelNewRow = useCallback(() => {
    setIsAddingRow(false);
    setNewRowData({});
  }, []);

  const handleStartAddingRow = useCallback(() => {
    if (data) {
      setIsAddingRow(true);
    }
  }, [data]);

  const handleDiscard = useCallback(() => {
    setEdits({});
  }, []);

  if (loading && !data) {
    return <div className="flex h-full items-center justify-center text-text-secondary">Loading data...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-500">Error: {error}</div>;
  }

  if (!data) {
    return <div className="flex h-full items-center justify-center text-text-secondary/50 font-medium">Select a table to view data</div>;
  }

  return (
    <div className="flex flex-col h-full bg-bg-1/50 rounded-2xl overflow-hidden shadow-sm border border-border/40">
      {/* Tab Navigation */}
      <div className="flex items-center justify-between border-b border-border/40 bg-bg-1 p-2">
        <div className="flex p-0.5 bg-bg-2/50 rounded-xl border border-border/40">
          <button
            onClick={() => setActiveTab('data')}
            className={`px-4 py-1.5 text-xs font-medium flex items-center gap-2 transition-all rounded-lg ${activeTab === 'data'
              ? 'text-text-primary bg-bg-0 shadow-sm ring-1 ring-black/5'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-2/50'
              }`}
          >
            <Table size={14} />
            Data
          </button>
          <button
            onClick={() => setActiveTab('structure')}
            className={`px-4 py-1.5 text-xs font-medium flex items-center gap-2 transition-all rounded-lg ${activeTab === 'structure'
              ? 'text-text-primary bg-bg-0 shadow-sm ring-1 ring-black/5'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-2/50'
              }`}
          >
            <Database size={14} />
            Structure
          </button>
          <button
            onClick={() => setActiveTab('info')}
            className={`px-4 py-1.5 text-xs font-medium flex items-center gap-2 transition-all rounded-lg ${activeTab === 'info'
              ? 'text-text-primary bg-bg-0 shadow-sm ring-1 ring-black/5'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-2/50'
              }`}
          >
            <Info size={14} />
            Info
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative">
        {activeTab === 'data' && data ? (
          <TableDataTab
            connectionId={connectionId}
            schema={schema}
            table={table}
            data={data}
            columnsInfo={columnsInfo}
            edits={edits}
            isAddingRow={isAddingRow}
            newRowData={newRowData}
            saving={saving}
            loading={loading}
            onEdit={handleEdit}
            onSave={handleSave}
            onDiscard={handleDiscard}
            onNewRowChange={handleNewRowChange}
            onSaveNewRow={handleSaveNewRow}
            onCancelNewRow={handleCancelNewRow}
            onStartAddingRow={handleStartAddingRow}
            onRefresh={fetchData}
          />
        ) : activeTab === 'structure' ? (
          <TableStructureTab schema={schema} table={table} />
        ) : (
          <TableInfoTab schema={schema} table={table} />
        )}
      </div>
    </div>
  );
}
