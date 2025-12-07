import { useState, useEffect } from 'react';
import { Info, X, Save, Trash2, Plus } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { useSelectedRow } from '../context/SelectedRowContext';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

interface TableColumn {
  name: string;
  data_type: string;
  is_nullable: boolean;
  default_value: string | null;
  is_primary_key: boolean;
}

export default function RightSidebar() {
  const [isOpen, setIsOpen] = useState(true);
  const { selectedRow, setSelectedRow } = useSelectedRow();
  const { connectionId, schema, table } = useParams();
  const [columnsInfo, setColumnsInfo] = useState<TableColumn[]>([]);
  const [editingValues, setEditingValues] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const isNewRecord = selectedRow?.rowIndex === -1;

  useEffect(() => {
    if (connectionId && schema && table) {
      fetchColumns();
    } else {
      setColumnsInfo([]);
    }
  }, [connectionId, schema, table]);

  useEffect(() => {
    if (selectedRow) {
      const initialValues: Record<string, unknown> = {};
      selectedRow.columns.forEach((col, index) => {
        initialValues[col] = selectedRow.rowData[index];
      });
      setEditingValues(initialValues);
    } else {
      setEditingValues({});
    }
  }, [selectedRow]);

  const fetchColumns = async () => {
    if (!connectionId || !schema || !table) return;
    try {
      setLoading(true);
      const response = await api.get(
        `/api/connections/${connectionId}/columns?schema=${schema}&table=${table}`
      );
      setColumnsInfo(response.data);
    } catch (err) {
      console.error('Failed to fetch columns:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleValueChange = (columnName: string, value: unknown) => {
    setEditingValues(prev => ({
      ...prev,
      [columnName]: value,
    }));
  };

  const getRowPK = () => {
    if (!selectedRow || isNewRecord) return null;
    const pkIndices = columnsInfo
      .map((col, idx) => {
        const colIndex = selectedRow.columns.findIndex(c => c === col.name);
        return col.is_primary_key && colIndex !== -1 ? colIndex : -1;
      })
      .filter(idx => idx !== -1);

    if (pkIndices.length === 0) return null;

    const pk: Record<string, any> = {};
    pkIndices.forEach(idx => {
      pk[selectedRow.columns[idx]] = selectedRow.rowData[idx];
    });
    return pk;
  };

  const handleSave = async () => {
    if (!connectionId || !schema || !table || !selectedRow) return;

    setSaving(true);
    try {
      if (isNewRecord) {
        const columns = columnsInfo
          .filter(col => editingValues[col.name] !== undefined && editingValues[col.name] !== null && editingValues[col.name] !== '')
          .map(col => col.name);
        const values = columns.map(col => editingValues[col]);

        if (columns.length === 0) {
          showToast('Please fill in at least one field', 'error');
          return;
        }

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
        setSelectedRow(null);
        window.dispatchEvent(new Event('refresh-table-data'));
      } else {
        const pk = getRowPK();
        if (!pk) {
          showToast('Cannot update: No primary key found', 'error');
          return;
        }

        const changes = Object.entries(editingValues).filter(([col, val]) => {
          const colIndex = selectedRow.columns.findIndex(c => c === col);
          return colIndex !== -1 && val !== selectedRow.rowData[colIndex];
        });

        if (changes.length === 0) {
          showToast('No changes to save', 'info');
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
        window.dispatchEvent(new Event('refresh-table-data'));
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to save record';
      showToast(errorMessage, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!connectionId || !schema || !table || !selectedRow || isNewRecord) return;

    const pk = getRowPK();
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
      setSelectedRow(null);
      window.dispatchEvent(new Event('refresh-table-data'));
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to delete record';
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
    <div className="w-96 border-l border-border bg-bg-1 flex flex-col h-full transition-all duration-300">
      <div className="flex items-center border-b border-border bg-bg-2/50">
        <div className="flex-1 px-4 py-2 text-sm font-medium flex items-center justify-center gap-2 border-b-2 border-accent text-accent bg-bg-1">
          <Info size={14} />
          {isNewRecord ? 'New Record' : 'Details'}
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

      <div className="flex-1 overflow-y-auto p-4">
        {!selectedRow ? (
          <div className="text-center text-text-secondary text-sm mt-10">
            <Info size={32} className="mx-auto mb-2 opacity-50" />
            <p>Select a row to view details</p>
            <p className="text-xs mt-2 opacity-75">or click "Add Record" to create a new entry</p>
          </div>
        ) : loading ? (
          <div className="text-center text-text-secondary text-sm mt-10">Loading...</div>
        ) : (
          <div className="space-y-4">
            {columnsInfo.map((col, index) => {
              const colName = col.name;
              const value = editingValues[colName];
              const isPK = col.is_primary_key;
              const isEditable = !isPK || isNewRecord;

              return (
                <div key={colName} className="space-y-1">
                  <label className="text-xs font-medium text-text-secondary flex items-center gap-2">
                    {colName}
                    {isPK && (
                      <span className="text-[10px] bg-accent/20 text-accent px-1.5 py-0.5 rounded">PK</span>
                    )}
                    {!col.is_nullable && (
                      <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded">Required</span>
                    )}
                  </label>
                  <div className="text-xs text-text-secondary/70 mb-1">
                    {col.data_type}
                  </div>
                  {isEditable ? (
                    <input
                      type="text"
                      value={value === null || value === undefined ? '' : String(value)}
                      onChange={(e) => {
                        const newValue = e.target.value === '' ? null : e.target.value;
                        handleValueChange(colName, newValue);
                      }}
                      placeholder={col.default_value ? `Default: ${col.default_value}` : col.is_nullable ? 'NULL' : 'Required'}
                      className="w-full bg-bg-0 border border-border rounded px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
                    />
                  ) : (
                    <div className="w-full bg-bg-2 border border-border rounded px-3 py-2 text-sm text-text-secondary">
                      {value === null || value === undefined ? 'NULL' : String(value)}
                    </div>
                  )}
                </div>
              );
            })}

            <div className="flex gap-2 pt-4 border-t border-border">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-accent hover:bg-blue-600 text-white rounded text-sm font-medium disabled:opacity-50"
              >
                <Save size={14} />
                {saving ? 'Saving...' : isNewRecord ? 'Create' : 'Save'}
              </button>
              {!isNewRecord && (
                <button
                  onClick={handleDelete}
                  disabled={saving}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-sm font-medium disabled:opacity-50"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
