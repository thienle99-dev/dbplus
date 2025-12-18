import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Database, Info, Table } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { useTablePage } from '../context/TablePageContext';
import { useSelectedRow } from '../context/SelectedRowContext';
import TableStructureTab from './TableStructureTab';
import TableInfoTab from './TableInfoTab';
import TableDataTab from './table-data/TableDataTab';
import { TableColumn, QueryResult, EditState, TableDataViewProps } from '../types';
import { useConstraints } from '../hooks/useDatabase';
import { useConnectionStore } from '../store/connectionStore';

export default function TableDataView({ schema: schemaProp, table: tableProp, database }: TableDataViewProps = {}) {
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
  const { selectedRow, setSelectedRow } = useSelectedRow();
  const { connections } = useConnectionStore();
  const connection = useMemo(() => connections.find((c) => c.id === connectionId), [connections, connectionId]);
  const isCouchbase = connection?.type === 'couchbase';

  const rowTerm = isCouchbase ? 'Document' : 'Row';


  const constraintsQuery = useConstraints(connectionId, schema, table, database);

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
  // Guard: Return early if schema or table is not defined
  if (!schema || !table) {
    return <div className="flex h-full items-center justify-center text-text-secondary/50 font-medium">Select a {isCouchbase ? 'collection' : 'table'} to view data</div>;
  }

  const getRequestConfig = useCallback(() => {
    return database ? { headers: { 'x-dbplus-database': database } } : {};
  }, [database]);

  const fetchColumns = useCallback(async () => {
    if (!connectionId || !schema || !table || fetchingColumnsRef.current) return;
    const cacheKey = `${connectionId}-${schema}-${table}-${database || ''}`;
    if (columnsCacheKeyRef.current === cacheKey) {
      return;
    }
    fetchingColumnsRef.current = true;
    columnsCacheKeyRef.current = cacheKey;
    try {
      const response = await api.get(
        `/api/connections/${connectionId}/columns?schema=${schema}&table=${table}`,
        getRequestConfig()
      );
      setColumnsInfo(response.data);
    } catch (err) {
      console.error('Failed to fetch columns:', err);
      columnsCacheKeyRef.current = '';
    } finally {
      fetchingColumnsRef.current = false;
    }
  }, [connectionId, schema, table, database, getRequestConfig]);

  const fetchData = useCallback(async () => {
    if (!connectionId || !schema || !table || fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const offset = page * pageSize;
      const response = await api.get(
        `/api/connections/${connectionId}/query?schema=${schema}&table=${table}&limit=${pageSize}&offset=${offset}`,
        getRequestConfig()
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
  }, [connectionId, schema, table, page, pageSize, database, getRequestConfig]);

  useEffect(() => {
    const cacheKey = `${connectionId}-${schema}-${table}-${database || ''}`;
    if (columnsCacheKeyRef.current !== cacheKey) {
      columnsCacheKeyRef.current = '';
      setColumnsInfo([]);
    }
  }, [connectionId, schema, table, database]);

  useEffect(() => {
    if (connectionId && schema && table) {
      fetchColumns();
      fetchData();
    }
  }, [connectionId, schema, table, page, pageSize, database]);

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
      const updatePromises = Object.entries(edits).map(async ([rowIndexStr, rowEdits]) => {
        const rowIndex = parseInt(rowIndexStr);
        const originalRow = data.rows[rowIndex];
        const pk = getRowPK(originalRow);

        if (!pk) {
          throw new Error(`${rowTerm} ${rowIndex} has no primary key. Cannot update.`);
        }

        const updates: Record<string, any> = {};
        Object.entries(rowEdits).forEach(([colIndexStr, value]) => {
          const colIndex = parseInt(colIndexStr);
          const colName = data.columns[colIndex];
          updates[colName] = value;
        });

        return api.patch(`/api/connections/${connectionId}/query-results`, {
          schema,
          table,
          primary_key: pk,
          updates,
        }, getRequestConfig());
      });

      await Promise.all(updatePromises);

      await fetchData();
      showToast('Changes saved successfully', 'success');
    } catch (err: unknown) {
      showToast(`Failed to save changes: ${(err as Error).message}`, 'error');
    } finally {
      setSaving(false);
    }
  }, [data, edits, getRowPK, schema, table, connectionId, fetchData, showToast, getRequestConfig]);

  const handleNewRowChange = useCallback((colIndex: number, value: string) => {
    setNewRowData(prev => ({
      ...prev,
      [colIndex]: value
    }));
  }, []);

  const handleSaveNewRow = useCallback(async () => {
    if (!data) return;
    setSaving(true);
    const entries = Object.entries(newRowData);
    if (entries.length === 0) {
      showToast('No data to insert', 'error');
      setSaving(false);
      return;
    }
    try {
      const row: Record<string, any> = {};
      entries.forEach(([colIndexStr, value]) => {
        const colIndex = parseInt(colIndexStr);
        const colName = data.columns[colIndex];
        row[colName] = value;
      });

      await api.post(`/api/connections/${connectionId}/query-results`, {
        schema,
        table,
        row,
      }, getRequestConfig());

      await fetchData();
      showToast(`${rowTerm} added successfully`, 'success');
      setIsAddingRow(false);
      setNewRowData({});
    } catch (err: unknown) {
      showToast(`Failed to add ${rowTerm.toLowerCase()}: ${(err as Error).message}`, 'error');
    } finally {
      setSaving(false);
    }
  }, [data, newRowData, schema, table, connectionId, fetchData, showToast, getRequestConfig]);

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

  const handleDelete = useCallback(async () => {
    if (!selectedRow) return;
    if (!confirm(`Are you sure you want to delete this ${rowTerm.toLowerCase()}?`)) return;

    const pk = getRowPK(selectedRow.rowData as unknown[]);

    if (!pk) {
      showToast(`Cannot delete ${rowTerm.toLowerCase()} without primary key`, 'error');
      return;
    }

    try {
      const config: any = {
        data: {
          schema,
          table,
          primary_key: pk
        },
        ...getRequestConfig()
      };

      await api.delete(`/api/connections/${connectionId}/query-results`, config);
      await fetchData();
      setSelectedRow(null);
      showToast(`${rowTerm} deleted successfully`, 'success');
    } catch (err: unknown) {
      showToast(`Failed to delete ${rowTerm.toLowerCase()}: ${(err as Error).message}`, 'error');
    }
  }, [selectedRow, getRowPK, schema, table, connectionId, fetchData, setSelectedRow, showToast, rowTerm, getRequestConfig]);

  if (loading && !data) {
    return <div className="flex h-full items-center justify-center text-text-secondary">Loading data...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-500">Error: {error}</div>;
  }

  if (!data) {
    return <div className="flex h-full items-center justify-center text-text-secondary/50 font-medium">Select a {isCouchbase ? 'collection' : 'table'} to view data</div>;
  }

  return (
    <div className="flex flex-col h-full bg-bg-1/50 rounded-2xl overflow-hidden shadow-sm border border-border/40">
      {/* Tab Navigation */}
      <div className="flex items-center justify-between border-b border-border/40 bg-bg-1 p-2">
        <div className="flex p-0.5 bg-bg-2/50 rounded-xl border border-border/40">
          <button
            onClick={() => setActiveTab('data')}
            className={`px-5 py-2 text-sm font-medium flex items-center gap-2.5 transition-all rounded-lg ${activeTab === 'data'
              ? 'text-text-primary bg-bg-0 shadow-sm ring-1 ring-black/5'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-2/50'
              }`}
          >
            <Table size={14} />
            Data
          </button>
          <button
            onClick={() => setActiveTab('structure')}
            className={`px-5 py-2 text-sm font-medium flex items-center gap-2.5 transition-all rounded-lg ${activeTab === 'structure'
              ? 'text-text-primary bg-bg-0 shadow-sm ring-1 ring-black/5'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-2/50'
              }`}
          >
            <Database size={14} />
            Structure
          </button>
          <button
            onClick={() => setActiveTab('info')}
            className={`px-5 py-2 text-sm font-medium flex items-center gap-2.5 transition-all rounded-lg ${activeTab === 'info'
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
            onDelete={handleDelete}
            foreignKeys={constraintsQuery.data?.foreign_keys || []}
            isCouchbase={isCouchbase}
          />
        ) : activeTab === 'structure' ? (
          <TableStructureTab schema={schema} table={table} isCouchbase={isCouchbase} database={database} />
        ) : (
          <TableInfoTab schema={schema} table={table} database={database} />
        )}
      </div>
    </div>
  );
}
