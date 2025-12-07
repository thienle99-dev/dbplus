import { useState, useEffect, useRef } from 'react';
import { Info, X, Save, Trash2, Plus, Edit2 } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { useSelectedRow } from '../context/SelectedRowContext';
import { useTablePage } from '../context/TablePageContext';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

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

export default function RightSidebar() {
  const [isOpen, setIsOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('sidebar-width');
    return saved ? parseInt(saved, 10) : 384;
  });
  const [isResizing, setIsResizing] = useState(false);
  const sidebarWidthRef = useRef(sidebarWidth);
  const { selectedRows, toggleRowSelection, selectedRow, setSelectedRow, editingRowIndex, setEditingRowIndex } = useSelectedRow();
  const { connectionId, schema, table } = useParams();
  const { currentPage, pageSize } = useTablePage();
  const [columnsInfo, setColumnsInfo] = useState<TableColumn[]>([]);
  const [data, setData] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingValues, setEditingValues] = useState<Record<number, Record<string, unknown>>>({});
  const [newRowValues, setNewRowValues] = useState<Record<string, unknown>>({});
  const [showNewRow, setShowNewRow] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (connectionId && schema && table) {
      fetchColumns();
      fetchData();
    } else {
      setColumnsInfo([]);
      setData(null);
    }
  }, [connectionId, schema, table, currentPage]);

  useEffect(() => {
    const handleRefresh = () => {
      fetchData();
    };
    window.addEventListener('refresh-table-data', handleRefresh);
    return () => window.removeEventListener('refresh-table-data', handleRefresh);
  }, [connectionId, schema, table, currentPage]);

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

  const fetchColumns = async () => {
    if (!connectionId || !schema || !table) return;
    try {
      const response = await api.get(
        `/api/connections/${connectionId}/columns?schema=${schema}&table=${table}`
      );
      setColumnsInfo(response.data);
    } catch (err) {
      console.error('Failed to fetch columns:', err);
    }
  };

  const fetchData = async () => {
    if (!connectionId || !schema || !table) return;
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
    }
  };

  const getDisplayColumns = () => {
    if (!columnsInfo.length || !data) return [];
    const pkColumns = columnsInfo.filter(col => col.is_primary_key).map(col => col.name);
    const otherColumns = columnsInfo.filter(col => !col.is_primary_key).slice(0, 3).map(col => col.name);
    return [...pkColumns, ...otherColumns].filter(col => data.columns.includes(col));
  };

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

  const handleRowClick = (rowIndex: number) => {
    if (!data) return;
    setSelectedRow({
      rowIndex,
      rowData: data.rows[rowIndex],
      columns: data.columns,
    });
  };

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

  const displayColumns = getDisplayColumns();
  const isRowSelected = (rowIndex: number) => selectedRow?.rowIndex === rowIndex;
  const isRowEditing = (rowIndex: number) => editingRowIndex === rowIndex;

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
        <div className="flex-1 px-4 py-2 text-sm font-medium flex items-center justify-center gap-2 border-b-2 border-accent text-accent bg-bg-1">
          <Info size={14} />
          Details
        </div>
        <button
          onClick={() => {
            setIsOpen(false);
            setSelectedRow(null);
          }}
          className="p-2 ml-1 text-text-secondary hover:text-text-primary hover:bg-bg-2"
        >
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {!connectionId || !schema || !table ? (
          <div className="text-center text-text-secondary text-sm mt-10 p-4">
            <Info size={32} className="mx-auto mb-2 opacity-50" />
            <p>Select a table to view rows</p>
          </div>
        ) : loading ? (
          <div className="text-center text-text-secondary text-sm mt-10 p-4">Loading...</div>
        ) : !data || !data.rows.length ? (
          <div className="text-center text-text-secondary text-sm mt-10 p-4">
            <Info size={32} className="mx-auto mb-2 opacity-50" />
            <p>No rows found</p>
          </div>
        ) : (
          <div className="p-2">
            <div className="mb-2 flex items-center justify-between">
              <button
                onClick={() => {
                  setShowNewRow(!showNewRow);
                  if (!showNewRow) {
                    setNewRowValues({});
                  }
                }}
                className="p-1.5 text-text-secondary hover:text-accent hover:bg-bg-2 rounded transition-colors"
                title="Add New Row"
              >
                <Plus size={16} />
              </button>
              <div className="text-xs text-text-secondary">
                {data.rows.length} row{data.rows.length !== 1 ? 's' : ''}
              </div>
            </div>

            {showNewRow && (
              <div className="mb-2 p-2 bg-bg-2 rounded border border-accent/30">
                <div className="text-xs font-medium text-accent mb-2">New Record</div>
                <div className="space-y-2">
                  {columnsInfo.slice(0, 4).map((col) => (
                    <div key={col.name} className="space-y-1">
                      <label className="text-xs text-text-secondary">{col.name}</label>
                      <input
                        type="text"
                        value={newRowValues[col.name] === null || newRowValues[col.name] === undefined ? '' : String(newRowValues[col.name])}
                        onChange={(e) => handleNewRowValueChange(col.name, e.target.value === '' ? null : e.target.value)}
                        placeholder={col.is_nullable ? 'NULL' : 'Required'}
                        className="w-full bg-bg-0 border border-border rounded px-2 py-1 text-xs text-text-primary focus:border-accent focus:outline-none"
                      />
                    </div>
                  ))}
                  <div className="flex gap-1 pt-1">
                    <button
                      onClick={handleCreateNew}
                      disabled={saving}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-accent hover:bg-blue-600 text-white rounded text-xs font-medium disabled:opacity-50"
                    >
                      <Save size={12} />
                      Create
                    </button>
                    <button
                      onClick={() => {
                        setShowNewRow(false);
                        setNewRowValues({});
                      }}
                      className="px-2 py-1 bg-bg-3 hover:bg-bg-2 text-text-secondary rounded text-xs"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead className="bg-bg-2 sticky top-0">
                  <tr>
                    <th className="border-b border-border px-1 py-1 text-left">
                      <input
                        type="checkbox"
                        className="cursor-pointer"
                        onChange={(e) => {
                          if (e.target.checked) {
                            data.rows.forEach((_, idx) => toggleRowSelection(idx));
                          } else {
                            data.rows.forEach((_, idx) => {
                              if (selectedRows.has(idx)) toggleRowSelection(idx);
                            });
                          }
                        }}
                      />
                    </th>
                    {displayColumns.map((col) => (
                      <th key={col} className="border-b border-border px-2 py-1 text-left text-text-secondary font-medium truncate max-w-[100px]">
                        {col}
                      </th>
                    ))}
                    <th className="border-b border-border px-1 py-1 text-right text-text-secondary">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row, rowIndex) => {
                    const isSelected = isRowSelected(rowIndex);
                    const isEditing = isRowEditing(rowIndex);
                    const rowEdits = editingValues[rowIndex] || {};

                    return (
                      <tr
                        key={rowIndex}
                        className={`hover:bg-bg-2/50 cursor-pointer ${isSelected ? 'bg-accent/10' : ''} ${isEditing ? 'bg-accent/5' : ''}`}
                        onClick={() => handleRowClick(rowIndex)}
                      >
                        <td className="border-b border-border px-1 py-1" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedRows.has(rowIndex)}
                            onChange={(e) => {
                              e.stopPropagation();
                              toggleRowSelection(rowIndex);
                            }}
                            className="cursor-pointer"
                          />
                        </td>
                        {displayColumns.map((col) => {
                          const colIndex = data.columns.findIndex(c => c === col);
                          const colInfo = columnsInfo.find(c => c.name === col);
                          const isPK = colInfo?.is_primary_key || false;
                          const value = isEditing && rowEdits[col] !== undefined ? rowEdits[col] : (colIndex !== -1 ? row[colIndex] : null);

                          return (
                            <td key={col} className="border-b border-border px-2 py-1 text-text-primary truncate max-w-[100px]">
                              {isEditing && !isPK ? (
                                <input
                                  type="text"
                                  value={value === null || value === undefined ? '' : String(value)}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    handleValueChange(rowIndex, col, e.target.value === '' ? null : e.target.value);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-full bg-bg-0 border border-accent rounded px-1 py-0.5 text-xs text-text-primary focus:outline-none"
                                />
                              ) : (
                                <span className="truncate block" title={value === null || value === undefined ? 'NULL' : String(value)}>
                                  {value === null || value === undefined ? (
                                    <span className="text-text-secondary italic">NULL</span>
                                  ) : (
                                    String(value)
                                  )}
                                </span>
                              )}
                            </td>
                          );
                        })}
                        <td className="border-b border-border px-1 py-1" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => handleSave(rowIndex)}
                                  disabled={saving}
                                  className="p-1 text-accent hover:bg-accent/20 rounded disabled:opacity-50"
                                  title="Save"
                                >
                                  <Save size={12} />
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  disabled={saving}
                                  className="p-1 text-text-secondary hover:bg-bg-2 rounded disabled:opacity-50"
                                  title="Cancel"
                                >
                                  <X size={12} />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleEdit(rowIndex)}
                                  className="p-1 text-text-secondary hover:text-accent hover:bg-bg-2 rounded"
                                  title="Edit"
                                >
                                  <Edit2 size={12} />
                                </button>
                                <button
                                  onClick={() => handleDelete(rowIndex)}
                                  disabled={saving}
                                  className="p-1 text-text-secondary hover:text-red-400 hover:bg-red-500/20 rounded disabled:opacity-50"
                                  title="Delete"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
