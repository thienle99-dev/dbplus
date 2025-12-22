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
import { useConstraints } from '../hooks/useDatabase';
import { useTabStateStore } from '../store/tabStateStore';
import { useConnectionStore } from '../store/connectionStore';
import { useDialog } from '../context/DialogContext';

interface Props extends TableDataViewProps {
  tabId?: string;
}

export default function TableDataView({ schema: schemaProp, table: tableProp, tabId }: Props = {}) {
  const params = useParams();
  const { setTabState, getTabState } = useTabStateStore();
  // Use props if provided, otherwise fall back to URL params
  const schema = schemaProp || params.schema;
  const table = tableProp || params.table;
  const connectionId = params.connectionId;
  const [data, setData] = useState<QueryResult | null>(null);
  const [columnsInfo, setColumnsInfo] = useState<TableColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentPage: page, pageSize, setCurrentPage: setPage } = useTablePage();

  const constraintsQuery = useConstraints(connectionId, schema, table);

  const [edits, setEdits] = useState<EditState>({});
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();
  const dialog = useDialog();
  const fetchingRef = useRef(false);
  const fetchingColumnsRef = useRef(false);
  const columnsCacheKeyRef = useRef<string>('');
  const [activeTab, setActiveTab] = useState<'data' | 'structure' | 'info'>('data');
  const [isAddingRow, setIsAddingRow] = useState(false);
  const [newRowData, setNewRowData] = useState<Record<number, unknown>>({});

  // Restore State
  const [isRestored, setIsRestored] = useState(false);

  useEffect(() => {
    if (!tabId) return;
    const saved = getTabState(tabId);
    if (saved) {
      if (saved.tableData) setData(saved.tableData);
      if (saved.tableEdits) setEdits(saved.tableEdits);
      if (saved.tablePage !== undefined) setPage(saved.tablePage);
      if (saved.tableActiveView) setActiveTab(saved.tableActiveView);
      if (saved.tableData) setLoading(false);
    }
    setIsRestored(true);
  }, [tabId, getTabState, setPage]);

  // Save State
  useEffect(() => {
    if (!tabId || !isRestored) return;
    setTabState(tabId, {
      tableData: data,
      tableEdits: edits,
      tablePage: page,
      tableActiveView: activeTab
    });
  }, [tabId, data, edits, page, activeTab, setTabState, isRestored]);

  // Guard: Return early if schema or table is not defined
  if (!schema || !table) {
    return <div className="flex h-full items-center justify-center text-text-secondary/50 font-medium">Select a table to view data</div>;
  }

  const activeQueryIdRef = useRef<string | null>(null);

  // Cleanup pending query on unmount
  useEffect(() => {
    return () => {
      const pendingQueryId = activeQueryIdRef.current;
      if (pendingQueryId) {
        console.log(`[TableDataView] Cancelling query ${pendingQueryId} on unmount`);
        api.post('/api/queries/cancel', { query_id: pendingQueryId }).catch(err => {
          console.warn("Failed to send cancel request", err);
        });
      }
    };
  }, []);

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

  const [filter, setFilter] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [bucket, setBucket] = useState('');
  const [fields, setFields] = useState<string[]>([]);

  const fetchData = useCallback(async (customFilter?: string, customDocId?: string) => {
    if (!connectionId || !schema || !table || fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(true);
    setError(null);

    // Generate Query ID
    const queryId = crypto.randomUUID();
    activeQueryIdRef.current = queryId;

    try {
      const offset = page * pageSize;
      const f = customFilter !== undefined ? customFilter : filter;
      const d = customDocId !== undefined ? customDocId : documentId;

      let url = `/api/connections/${connectionId}/query?schema=${schema}&table=${table}&limit=${pageSize}&offset=${offset}`;
      if (f) url += `&filter=${encodeURIComponent(f)}`;
      if (d) url += `&document_id=${encodeURIComponent(d)}`;
      if (bucket) url += `&database=${encodeURIComponent(bucket)}`;
      if (fields.length > 0) url += `&fields=${encodeURIComponent(JSON.stringify(fields))}`;

      const response = await api.get(url, {
        headers: { 'X-Query-ID': queryId }
      });
      setData(response.data);
      setEdits({}); // Clear edits on page change/refresh
    } catch (err: unknown) {
      if (activeQueryIdRef.current === queryId) {
        // Only show error if THIS query failed (and wasn't cancelled locally)
        const errorMessage = (err as any).response?.data || (err as Error).message || 'Failed to fetch data';
        setError(errorMessage);
      }
    } finally {
      if (activeQueryIdRef.current === queryId) {
        activeQueryIdRef.current = null;
        setLoading(false);
        fetchingRef.current = false;
      } else {
        if (!activeQueryIdRef.current) {
          setLoading(false);
          fetchingRef.current = false;
        }
      }
    }
  }, [connectionId, schema, table, page, pageSize, filter, documentId, bucket, fields]);

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
        const rowMetadata = data.row_metadata?.[rowIndex];

        if (!pk) {
          throw new Error(`Row ${rowIndex} has no primary key. Cannot update.`);
        }

        // Use new endpoint that supports all DBs including Couchbase with CAS
        return api.patch(`/api/connections/${connectionId}/query-results`, {
          schema,
          table,
          primary_key: pk,
          updates: rowEdits,
          row_metadata: rowMetadata
        });
      });

      await Promise.all(updates);

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

  const { connections } = useConnectionStore();
  const connection = connections.find(c => c.id === connectionId);
  const isCouchbase = connection?.type === 'couchbase';

  const handleDelete = useCallback(async (rowIndex: number) => {
    if (!data) return;
    const row = data.rows[rowIndex];
    const pk = getRowPK(row);

    if (!pk) {
      showToast('Cannot delete: No primary key found', 'error');
      return;
    }

    const confirmed = await dialog.confirm({
      title: 'Delete Record',
      message: 'Are you sure you want to delete this record? This action cannot be undone.',
      confirmLabel: 'Delete',
      variant: 'destructive'
    });

    if (!confirmed) return;

    setSaving(true);
    try {
      const rowMetadata = data.row_metadata?.[rowIndex];

      await api.delete(`/api/connections/${connectionId}/query-results`, {
        data: {
          schema,
          table,
          primary_key: pk,
          row_metadata: rowMetadata
        }
      });

      showToast('Record deleted successfully', 'success');
      await fetchData();
    } catch (err: any) {
      showToast(`Failed to delete: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  }, [data, getRowPK, connectionId, schema, table, fetchData, showToast, isCouchbase, bucket, connection]);

  const handleDuplicate = useCallback(async (rowIndex: number) => {
    if (!data) return;
    const row = data.rows[rowIndex];
    const newValues: Record<number, unknown> = {};

    data.columns.forEach((_col, index) => {
      // Skip primary keys for duplication if they are auto-generated?
      // Actually, just fill the new row form with these values
      newValues[index] = row[index];
    });

    setNewRowData(newValues);
    setIsAddingRow(true);
    showToast('Row duplicated into new row form', 'info');
  }, [data, showToast]);

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

  return (
    <div className="flex flex-col pb-[20px] h-full bg-bg-0 rounded-2xl overflow-hidden shadow-sm border border-border-light">
      <div className="flex items-center justify-between border-b border-border-light bg-bg-1 p-1.5">
        <div className="flex p-0.5 bg-bg-2 rounded-xl border border-border-light">
          <button
            onClick={() => setActiveTab('data')}
            className={`px-3.5 py-1.5 text-xs font-medium flex items-center gap-2 transition-all rounded-lg ${activeTab === 'data'
              ? 'text-text-primary bg-bg-active shadow-sm ring-1 ring-border-subtle'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-2'
              }`}
          >
            <Table size={13} />
            Data
          </button>
          <button
            onClick={() => setActiveTab('structure')}
            className={`px-3.5 py-1.5 text-xs font-medium flex items-center gap-2 transition-all rounded-lg ${activeTab === 'structure'
              ? 'text-text-primary bg-bg-active shadow-sm ring-1 ring-border-subtle'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-2'
              }`}
          >
            <Database size={13} />
            Structure
          </button>
          <button
            onClick={() => setActiveTab('info')}
            className={`px-3.5 py-1.5 text-xs font-medium flex items-center gap-2 transition-all rounded-lg ${activeTab === 'info'
              ? 'text-text-primary bg-bg-active shadow-sm ring-1 ring-border-subtle'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-2'
              }`}
          >
            <Info size={13} />
            Info
          </button>
        </div>
      </div>
      <div className={`flex-1 relative flex flex-col ${activeTab === 'data' ? 'overflow-hidden' : 'overflow-auto custom-scrollbar'}`}>
        {loading && !data ? (
          <div className="flex h-full items-center justify-center text-text-secondary">Loading data...</div>
        ) : error ? (
          <div className="p-8 text-red-500">Error: {error}</div>
        ) : !data && activeTab === 'data' ? (
          <div className="flex h-full items-center justify-center text-text-secondary/50 font-medium">No data available</div>
        ) : activeTab === 'data' && data ? (
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
            foreignKeys={constraintsQuery.data?.foreign_keys || []}
            isCouchbase={isCouchbase}
            filter={filter}
            setFilter={setFilter}
            documentId={documentId}
            setDocumentId={setDocumentId}
            bucket={bucket}
            setBucket={setBucket}
            onRetrieve={() => fetchData()}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
            fields={fields}
            setFields={setFields}
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
