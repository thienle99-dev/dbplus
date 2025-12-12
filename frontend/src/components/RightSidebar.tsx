import { useState, useEffect, useRef, useCallback } from 'react';
import { Save, X, Plus, Info, Trash2, Code, Edit2 } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { useSelectedRow } from '../context/SelectedRowContext';
import { useTablePage } from '../context/TablePageContext';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { LogViewer } from './LogViewer';
import { TableColumn, QueryResult } from '../types';

type EditState = Record<number, Record<string, unknown>>;

export default function RightSidebar() {
  const [isOpen, setIsOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('sidebar-width');
    return saved ? parseInt(saved, 10) : 384;
  });
  const [isResizing, setIsResizing] = useState(false);
  const sidebarWidthRef = useRef(sidebarWidth);
  const { selectedRows: _selectedRows, toggleRowSelection: _toggleRowSelection, selectedRow, setSelectedRow, editingRowIndex, setEditingRowIndex } = useSelectedRow();
  const { connectionId, schema, table } = useParams();
  const { currentPage, pageSize } = useTablePage();
  const [columnsInfo, setColumnsInfo] = useState<TableColumn[]>([]);
  const [data, setData] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingValues, setEditingValues] = useState<EditState>({});
  const [saving, setSaving] = useState(false);
  const [showNewRow, setShowNewRow] = useState(false);
  const [newRowValues, setNewRowValues] = useState<Record<string, unknown>>({});
  const { showToast } = useToast();
  const fetchingRef = useRef(false);
  const fetchingColumnsRef = useRef(false);
  const columnsCacheKeyRef = useRef<string>('');
  const [activeTab, setActiveTab] = useState<'details' | 'logs'>('details');

  const fetchColumns = useCallback(async () => {
    const effectiveSchema = schema || selectedRow?.schema;
    const effectiveTable = table || selectedRow?.table;

    if (!connectionId || !effectiveSchema || !effectiveTable || fetchingColumnsRef.current) return;
    const cacheKey = `${connectionId}-${effectiveSchema}-${effectiveTable}`;
    if (columnsCacheKeyRef.current === cacheKey) {
      return;
    }
    fetchingColumnsRef.current = true;
    columnsCacheKeyRef.current = cacheKey;
    try {
      const response = await api.get(
        `/api/connections/${connectionId}/columns?schema=${effectiveSchema}&table=${effectiveTable}`
      );
      setColumnsInfo(response.data);
    } catch (err) {
      console.error('Failed to fetch columns:', err);
      columnsCacheKeyRef.current = '';
    } finally {
      fetchingColumnsRef.current = false;
    }
  }, [connectionId, schema, table, selectedRow?.schema, selectedRow?.table]);

  const fetchData = useCallback(async () => {
    if (!connectionId || !schema || !table || fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      setLoading(true);
      const offset = currentPage * pageSize;
      const response = await api.get(
        `/api/connections/${connectionId}/query?schema=${schema}&table=${table}&limit=${pageSize}&offset=${offset}`
      );
      setData(response.data);
      setEditingValues({});
      setEditingRowIndex(null);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [connectionId, schema, table, currentPage, pageSize]);

  useEffect(() => {
    const cacheKey = `${connectionId}-${schema}-${table}`;
    if (columnsCacheKeyRef.current !== cacheKey) {
      columnsCacheKeyRef.current = '';
      setColumnsInfo([]);
    }
  }, [connectionId, schema, table]);

  useEffect(() => {
    // Get schema and table from URL params or selectedRow
    const effectiveSchema = schema || selectedRow?.schema;
    const effectiveTable = table || selectedRow?.table;

    if (connectionId && effectiveSchema && effectiveTable) {
      fetchColumns();
      fetchData();
    } else {
      setColumnsInfo([]);
      setData(null);
      columnsCacheKeyRef.current = '';
    }
  }, [connectionId, schema, table, selectedRow?.schema, selectedRow?.table, currentPage, pageSize]);

  useEffect(() => {
    const handleRefresh = () => {
      if (connectionId && schema && table) {
        fetchData();
      }
    };
    window.addEventListener('refresh-table-data', handleRefresh);
    return () => window.removeEventListener('refresh-table-data', handleRefresh);
  }, [connectionId, schema, table, currentPage, pageSize]);

  useEffect(() => {
    sidebarWidthRef.current = sidebarWidth;
  }, [sidebarWidth]);

  useEffect(() => {
    if (isResizing) {
      const handleMouseMove = (e: MouseEvent) => {
        const newWidth = window.innerWidth - e.clientX;
        const constrainedWidth = Math.max(250, Math.min(1000, newWidth));
        setSidebarWidth(constrainedWidth);
      };

      const handleMouseUp = () => {
        setIsResizing(false);
        localStorage.setItem('sidebar-width', sidebarWidthRef.current.toString());
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        localStorage.setItem('sidebar-width', sidebarWidthRef.current.toString());
      };
    }
  }, [isResizing]);

  /*
  const _getDisplayColumns = () => {
    if (!columnsInfo.length || !data) return [];
    // Show all columns for detailed view
    return data.columns;
  };
  */

  const getRowPK = (rowIndex: number) => {
    if (!data || rowIndex < 0 || rowIndex >= data.rows.length) return null;
    const row = data.rows[rowIndex];
    const pkIndices = columnsInfo
      .map((col) => {
        const colIndex = data.columns.findIndex(c => c === col.name);
        return col.is_primary_key && colIndex !== -1 ? colIndex : -1;
      })
      .filter(idx => idx !== -1);

    if (pkIndices.length === 0) return null;

    const pk: Record<string, any> = {};
    pkIndices.forEach(idx => {
      pk[data.columns[idx]] = row[idx];
    });
    return pk;
  };

  /*
  const _handleRowClick = (_rowIndex: number) => {
    if (!data) return;
    setSelectedRow({
      rowIndex: _rowIndex,
      rowData: data.rows[_rowIndex],
      columns: data.columns,
    });
  };
  */

  const handleEdit = (rowIndex: number) => {
    if (!data) return;
    setEditingRowIndex(rowIndex);
    const row = data.rows[rowIndex];
    const values: Record<string, unknown> = {};
    data.columns.forEach((col, index) => {
      values[col] = row[index];
    });
    setEditingValues(prev => ({ ...prev, [rowIndex]: values }));
  };

  const handleCancelEdit = () => {
    setEditingRowIndex(null);
    setEditingValues(prev => {
      const newValues = { ...prev };
      delete newValues[editingRowIndex!];
      return newValues;
    });
  };

  const handleValueChange = (rowIndex: number, columnName: string, value: unknown) => {
    setEditingValues(prev => ({
      ...prev,
      [rowIndex]: {
        ...prev[rowIndex],
        [columnName]: value,
      },
    }));
  };

  const handleNewRowValueChange = (columnName: string, value: unknown) => {
    setNewRowValues(prev => ({
      ...prev,
      [columnName]: value,
    }));
  };

  const handleSave = async (rowIndex: number) => {
    if (!connectionId || !schema || !table || !data) return;

    setSaving(true);
    try {
      const pk = getRowPK(rowIndex);
      if (!pk) {
        showToast('Cannot update: No primary key found', 'error');
        return;
      }

      const rowEdits = editingValues[rowIndex];
      if (!rowEdits) return;

      const originalRow = data.rows[rowIndex];
      const changes = Object.entries(rowEdits).filter(([col, val]) => {
        const colIndex = data.columns.findIndex(c => c === col);
        return colIndex !== -1 && val !== originalRow[colIndex];
      });

      if (changes.length === 0) {
        showToast('No changes to save', 'info');
        setEditingRowIndex(null);
        return;
      }

      const setClauses = changes.map(([col, val]) => {
        const escapedValue = val === null || val === '' ? 'NULL' :
          typeof val === 'string' ? `'${val.replace(/'/g, "''")}'` : val;
        return `"${col}" = ${escapedValue}`;
      });

      const whereClauses = Object.entries(pk).map(([col, val]) => {
        const escapedVal = typeof val === 'string' ? `'${val.replace(/'/g, "''")}'` : val;
        return `"${col}" = ${escapedVal}`;
      });

      const query = `UPDATE "${schema}"."${table}" SET ${setClauses.join(', ')} WHERE ${whereClauses.join(' AND ')};`;
      await api.post(`/api/connections/${connectionId}/execute`, { query });
      showToast('Record updated successfully', 'success');
      setEditingRowIndex(null);
      setEditingValues(prev => {
        const newValues = { ...prev };
        delete newValues[rowIndex];
        return newValues;
      });
      window.dispatchEvent(new Event('refresh-table-data'));
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to save record';
      showToast(errorMessage, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (rowIndex: number) => {
    if (!connectionId || !schema || !table || !data) return;

    const pk = getRowPK(rowIndex);
    if (!pk) {
      showToast('Cannot delete: No primary key found', 'error');
      return;
    }

    if (!confirm('Are you sure you want to delete this record?')) return;

    setSaving(true);
    try {
      const whereClauses = Object.entries(pk).map(([col, val]) => {
        const escapedVal = typeof val === 'string' ? `'${val.replace(/'/g, "''")}'` : val;
        return `"${col}" = ${escapedVal}`;
      });

      const query = `DELETE FROM "${schema}"."${table}" WHERE ${whereClauses.join(' AND ')};`;
      await api.post(`/api/connections/${connectionId}/execute`, { query });
      showToast('Record deleted successfully', 'success');
      window.dispatchEvent(new Event('refresh-table-data'));
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to delete record';
      showToast(errorMessage, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateNew = async () => {
    if (!connectionId || !schema || !table) return;

    const columns = columnsInfo
      .filter(col => newRowValues[col.name] !== undefined && newRowValues[col.name] !== null && newRowValues[col.name] !== '')
      .map(col => col.name);
    const values = columns.map(col => newRowValues[col]);

    if (columns.length === 0) {
      showToast('Please fill in at least one field', 'error');
      return;
    }

    setSaving(true);
    try {
      const valueStrings = values.map(val => {
        if (val === null || val === undefined || val === '') return 'NULL';
        if (typeof val === 'string') {
          return `'${val.replace(/'/g, "''")}'`;
        }
        return val;
      });

      const query = `INSERT INTO "${schema}"."${table}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${valueStrings.join(', ')});`;
      await api.post(`/api/connections/${connectionId}/execute`, { query });
      showToast('Record created successfully', 'success');
      setShowNewRow(false);
      setNewRowValues({});
      window.dispatchEvent(new Event('refresh-table-data'));
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to create record';
      showToast(errorMessage, 'error');
    } finally {
      setSaving(false);
    }
  };



  if (!isOpen) {
    return (
      <div className="w-10 border-l border-border bg-bg-1 flex flex-col items-center py-2 gap-2">
        <button
          onClick={() => setIsOpen(true)}
          className="p-2 text-text-secondary hover:text-text-primary hover:bg-bg-2 rounded"
          title="Open Sidebar"
        >
          <Info size={18} />
        </button>
      </div>
    );
  }

  return (
    <div
      className="border-l border-border bg-bg-1 flex flex-col h-full transition-all duration-300 relative"
      style={{ width: `${sidebarWidth}px` }}
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-accent/50 z-20 transition-colors"
        onMouseDown={(e) => {
          e.preventDefault();
          setIsResizing(true);
        }}
        title="Drag to resize"
      />
      <div className="flex items-center border-b border-border bg-bg-2/50">
        <button
          onClick={() => setActiveTab('details')}
          className={`flex-1 px-2 py-1.5 text-xs font-medium flex items-center justify-center gap-1.5 border-b-2 transition-colors ${activeTab === 'details'
            ? 'border-accent text-accent bg-bg-1'
            : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-bg-2'
            }`}
        >
          <Info size={12} />
          Details
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`flex-1 px-2 py-1.5 text-xs font-medium flex items-center justify-center gap-1.5 border-b-2 transition-colors ${activeTab === 'logs'
            ? 'border-accent text-accent bg-bg-1'
            : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-bg-2'
            }`}
        >
          <Code size={12} />
          Logs
        </button>
        <button
          onClick={() => {
            setIsOpen(false);
            setSelectedRow(null);
          }}
          className="p-1 ml-1 text-text-secondary hover:text-text-primary hover:bg-bg-2"
          title="Close sidebar"
        >
          <X size={12} />
        </button>
      </div>

      {activeTab === 'details' ? (
        <div className="flex-1 overflow-y-auto">
          {!selectedRow && (!connectionId || !schema || !table) ? (
            <div className="text-center text-text-secondary text-xs mt-8 p-2">
              <Info size={24} className="mx-auto mb-1.5 opacity-50" />
              <p>Select a table to view rows</p>
            </div>
          ) : loading ? (
            <div className="text-center text-text-secondary text-xs mt-8 p-2">Loading...</div>
          ) : selectedRow ? (
            <div className="p-1.5">
              {/* Show selected row details */}
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[10px] font-medium text-accent">Row Details</div>
                  <div className="flex gap-0.5">
                    {editingRowIndex === selectedRow.rowIndex ? (
                      <>
                        <button
                          onClick={() => handleSave(selectedRow.rowIndex)}
                          disabled={saving}
                          className="p-0.5 text-accent hover:bg-accent/20 rounded disabled:opacity-50"
                          title="Save changes"
                        >
                          <Save size={11} />
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          disabled={saving}
                          className="p-0.5 text-text-secondary hover:bg-bg-2 rounded disabled:opacity-50"
                          title="Cancel editing"
                        >
                          <X size={11} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleEdit(selectedRow.rowIndex)}
                          className="p-0.5 text-text-secondary hover:text-accent hover:bg-bg-2 rounded"
                          title="Edit row"
                        >
                          <Edit2 size={11} />
                        </button>
                        <button
                          onClick={() => handleDelete(selectedRow.rowIndex)}
                          disabled={saving}
                          className="p-0.5 text-text-secondary hover:text-red-400 hover:bg-red-500/20 rounded disabled:opacity-50"
                          title="Delete row"
                        >
                          <Trash2 size={11} />
                        </button>
                        <button
                          onClick={() => setSelectedRow(null)}
                          className="p-0.5 text-text-secondary hover:bg-bg-2 rounded"
                          title="Close details"
                        >
                          <X size={11} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5 max-h-[calc(100vh-200px)] overflow-y-auto">
                  {selectedRow.columns.map((colName, colIndex) => {
                    const colInfo = columnsInfo.find(c => c.name === colName);
                    const isEditing = editingRowIndex === selectedRow.rowIndex;
                    const rowEdits = editingValues[selectedRow.rowIndex] || {};
                    const value = isEditing && rowEdits[colName] !== undefined
                      ? rowEdits[colName]
                      : selectedRow.rowData[colIndex];

                    return (
                      <div key={colName} className="space-y-0.5 pb-1.5 border-b border-border/30 last:border-0">
                        <label className="text-[10px] text-text-secondary flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            {colName}
                            {colInfo?.is_primary_key && <span className="text-[8px] bg-accent/20 text-accent px-1 rounded">PK</span>}
                          </span>
                          <span className="text-[9px] text-text-secondary/60">{colInfo?.data_type || 'unknown'}</span>
                        </label>
                        {isEditing && !colInfo?.is_primary_key ? (
                          <input
                            type="text"
                            value={value === null || value === undefined ? '' : String(value)}
                            onChange={(e) => handleValueChange(selectedRow.rowIndex, colName, e.target.value === '' ? null : e.target.value)}
                            className="w-full bg-bg-0 border border-accent rounded px-1.5 py-0.5 text-[10px] text-text-primary focus:outline-none"
                          />
                        ) : (
                          <div className="text-[10px] text-text-primary bg-bg-2 px-1.5 py-1 rounded break-all">
                            {value === null || value === undefined ? (
                              <span className="text-text-secondary italic">NULL</span>
                            ) : (
                              String(value)
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : !data || !data.rows.length ? (
            <div className="text-center text-text-secondary text-xs mt-8 p-2">
              <Info size={24} className="mx-auto mb-1.5 opacity-50" />
              <p>No rows found</p>
            </div>
          ) : (
            <div className="p-1.5">
              {/* Show mini table when no row is selected */}
              <div className="mb-1.5 flex items-center justify-between">
                <button
                  onClick={() => {
                    setShowNewRow(!showNewRow);
                    if (!showNewRow) {
                      setNewRowValues({});
                    }
                  }}
                  className="p-1 text-text-secondary hover:text-accent hover:bg-bg-2 rounded transition-colors"
                  title="Add new row"
                >
                  <Plus size={14} />
                </button>
                <div className="text-[10px] text-text-secondary">
                  {data?.rows.length || 0} row{(data?.rows.length || 0) !== 1 ? 's' : ''}
                </div>
              </div>

              {showNewRow && (
                <div className="mb-2 p-1.5 bg-bg-2 rounded border border-accent/30 max-h-[300px] overflow-y-auto">
                  <div className="text-[10px] font-medium text-accent mb-1.5 sticky top-0 bg-bg-2 pb-1">New Record</div>
                  <div className="space-y-1.5">
                    {columnsInfo.map((col) => (
                      <div key={col.name} className="space-y-0.5">
                        <label className="text-[10px] text-text-secondary flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            {col.name}
                            {col.is_primary_key && <span className="text-[8px] bg-accent/20 text-accent px-1 rounded">PK</span>}
                          </span>
                          <span className="text-[9px] text-text-secondary/60">{col.data_type}</span>
                        </label>
                        <input
                          type="text"
                          value={newRowValues[col.name] === null || newRowValues[col.name] === undefined ? '' : String(newRowValues[col.name])}
                          onChange={(e) => handleNewRowValueChange(col.name, e.target.value === '' ? null : e.target.value)}
                          placeholder={col.is_nullable ? 'NULL' : col.default_value || 'Required'}
                          disabled={col.is_primary_key && col.default_value !== null}
                          className="w-full bg-bg-0 border border-border rounded px-1.5 py-0.5 text-[10px] text-text-primary focus:border-accent focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </div>
                    ))}
                    <div className="flex gap-1 pt-1">
                      <button
                        onClick={handleCreateNew}
                        disabled={saving}
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-accent hover:bg-blue-600 text-white rounded text-[10px] font-medium disabled:opacity-50"
                      >
                        <Save size={11} />
                        Create
                      </button>
                      <button
                        onClick={() => {
                          setShowNewRow(false);
                          setNewRowValues({});
                        }}
                        className="px-2 py-1 bg-bg-3 hover:bg-bg-2 text-text-secondary rounded text-[10px]"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="text-center text-text-secondary text-[10px] mt-4 p-2 bg-bg-2/30 rounded">
                <Info size={16} className="mx-auto mb-1 opacity-50" />
                <p>Click a row in the table to view details</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-hidden">
          <LogViewer />
        </div>
      )}
    </div>
  );
}
