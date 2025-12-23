import { useState, useEffect, useRef } from 'react';
import { Save, X, Plus, Info, Trash2, Code, Edit2, Copy } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { useSelectedRow } from '../context/SelectedRowContext';
import { useTablePage } from '../context/TablePageContext';
import { useToast } from '../context/ToastContext';
import { LogViewer } from './LogViewer';
import { useColumns, useTableData } from '../hooks/useDatabase';
import { useExecuteQuery } from '../hooks/useQuery';
import { useQueryClient } from '@tanstack/react-query';
import { formatCellValue } from '../utils/cellFormatters';
import { tryGetDateFromTimestamp } from '../utils/dateUtils';
import { useDialog } from '../context/DialogContext';

type EditState = Record<number, Record<string, unknown>>;

export default function RightSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('sidebar-width');
    return saved ? parseInt(saved, 10) : 384;
  });
  const [isResizing, setIsResizing] = useState(false);
  const sidebarWidthRef = useRef(sidebarWidth);
  const { selectedRows: _selectedRows, toggleRowSelection: _toggleRowSelection, selectedRow, setSelectedRow, editingRowIndex, setEditingRowIndex } = useSelectedRow();
  const { connectionId, schema, table } = useParams();
  const { currentPage, pageSize } = useTablePage();
  const dialog = useDialog();

  const effectiveSchema = schema || selectedRow?.schema;
  const effectiveTable = table || selectedRow?.table;
  const offset = currentPage * pageSize;

  const { data: columnsInfo = [] } = useColumns(connectionId, effectiveSchema, effectiveTable);
  const { data, isLoading: loading } = useTableData(connectionId, effectiveSchema, effectiveTable, pageSize, offset);

  const executeQuery = useExecuteQuery(connectionId);
  const queryClient = useQueryClient();

  const [editingValues, setEditingValues] = useState<EditState>({});
  const [showNewRow, setShowNewRow] = useState(false);
  const [newRowValues, setNewRowValues] = useState<Record<string, unknown>>({});
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'details' | 'logs'>('details');

  // Clear editing state when data changes (e.g. pagination)
  useEffect(() => {
    setEditingValues({});
    setEditingRowIndex(null);
  }, [data]);

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
    if (!connectionId || !effectiveSchema || !effectiveTable || !data) return;

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
        const colInfo = columnsInfo.find(c => c.name === col);
        const dataType = colInfo?.data_type?.toLowerCase() || '';
        const isString = ['text', 'varchar', 'char', 'character', 'json', 'string', 'uuid'].some(t => dataType.includes(t));

        let finalVal = val;
        // Treat empty string as NULL for non-string types, but respect explicit empty string for string types
        if (val === '' && !isString) {
          finalVal = null;
        }

        const escapedValue = finalVal === null || finalVal === undefined ? 'NULL' :
          typeof finalVal === 'string' ? `'${finalVal.replace(/'/g, "''")}'` : finalVal;
        return `"${col}" = ${escapedValue}`;
      });

      const whereClauses = Object.entries(pk).map(([col, val]) => {
        const escapedVal = typeof val === 'string' ? `'${val.replace(/'/g, "''")}'` : val;
        return `"${col}" = ${escapedVal}`;
      });

      const query = `UPDATE "${effectiveSchema}"."${effectiveTable}" SET ${setClauses.join(', ')} WHERE ${whereClauses.join(' AND ')};`;
      await executeQuery.mutateAsync({ query });
      showToast('Record updated successfully', 'success');
      setEditingRowIndex(null);
      setEditingValues(prev => {
        const newValues = { ...prev };
        delete newValues[rowIndex];
        return newValues;
      });
      // Invalidate query to refresh data
      queryClient.invalidateQueries({ queryKey: ['tableData', connectionId, effectiveSchema, effectiveTable] });
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to save record';
      showToast(errorMessage, 'error');
    }
  };

  const handleDelete = async (rowIndex: number) => {
    if (!connectionId || !effectiveSchema || !effectiveTable || !data) return;

    const pk = getRowPK(rowIndex);
    if (!pk) {
      showToast('Cannot delete: No primary key found', 'error');
      return;
    }

    const confirmed = await dialog.confirm(
      'Delete Record',
      'Are you sure you want to delete this record?',
      { variant: 'danger' }
    );
    if (!confirmed) return;

    try {
      const whereClauses = Object.entries(pk).map(([col, val]) => {
        const escapedVal = typeof val === 'string' ? `'${val.replace(/'/g, "''")}'` : val;
        return `"${col}" = ${escapedVal}`;
      });

      const query = `DELETE FROM "${effectiveSchema}"."${effectiveTable}" WHERE ${whereClauses.join(' AND ')};`;
      await executeQuery.mutateAsync({ query });
      showToast('Record deleted successfully', 'success');
      queryClient.invalidateQueries({ queryKey: ['tableData', connectionId, effectiveSchema, effectiveTable] });
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to delete record';
      showToast(errorMessage, 'error');
    }
  };

  const handleCreateNew = async () => {
    if (!connectionId || !effectiveSchema || !effectiveTable) return;

    const columns = columnsInfo
      .filter(col => newRowValues[col.name] !== undefined && newRowValues[col.name] !== null && newRowValues[col.name] !== '')
      .map(col => col.name);
    const values = columns.map(col => newRowValues[col]);

    if (columns.length === 0) {
      showToast('Please fill in at least one field', 'error');
      return;
    }

    try {
      const valueStrings = values.map(val => {
        if (val === null || val === undefined || val === '') return 'NULL';
        if (typeof val === 'string') {
          return `'${val.replace(/'/g, "''")}'`;
        }
        return val;
      });

      const query = `INSERT INTO "${effectiveSchema}"."${effectiveTable}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${valueStrings.join(', ')});`;
      await executeQuery.mutateAsync({ query });
      showToast('Record created successfully', 'success');
      setShowNewRow(false);
      setNewRowValues({});
      queryClient.invalidateQueries({ queryKey: ['tableData', connectionId, effectiveSchema, effectiveTable] });
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to create record';
      showToast(errorMessage, 'error');
    }
  };

  if (!isOpen) {
    return (
      <div className="w-10 flex-shrink-0 border-l border-border-light bg-bg-1 flex flex-col items-center py-2 gap-2">
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
      className="flex-shrink-0 border-l border-border-light bg-bg-1 flex flex-col h-full transition-all duration-300 relative"
      style={{ width: `${sidebarWidth}px` }}
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-accent z-20 transition-colors"
        onMouseDown={(e) => {
          e.preventDefault();
          setIsResizing(true);
        }}
        title="Drag to resize"
      />
      <div className="flex items-center border-b border-border-light bg-bg-2">
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
                          disabled={executeQuery.isPending}
                          className="p-0.5 text-accent hover:bg-primary-transparent rounded disabled:opacity-50"
                          title="Save changes"
                        >
                          <Save size={11} />
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          disabled={executeQuery.isPending}
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
                          disabled={executeQuery.isPending}
                          className="p-0.5 text-text-secondary hover:text-error hover:bg-error-50 rounded disabled:opacity-50"
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

                <div className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto pr-1">
                  {selectedRow.columns.map((colName, colIndex) => {
                    const colInfo = columnsInfo.find(c => c.name === colName);
                    const dataType = colInfo?.data_type?.toLowerCase() || 'unknown';
                    const isEditing = editingRowIndex === selectedRow.rowIndex;
                    const rowEdits = editingValues[selectedRow.rowIndex] || {};
                    const isModified = isEditing && rowEdits[colName] !== undefined;

                    const originalValue = selectedRow.rowData[colIndex];
                    const currentValue = isModified ? rowEdits[colName] : originalValue;

                    const isNull = currentValue === null || currentValue === undefined;
                    const isPK = colInfo?.is_primary_key;
                    const isReadOnly = isEditing && isPK;

                    // Helper to copy value
                    const handleCopy = (e: React.MouseEvent) => {
                      e.stopPropagation();
                      if (currentValue !== null && currentValue !== undefined) {
                        navigator.clipboard.writeText(String(currentValue));
                        showToast('Value copied', 'success');
                      }
                    };

                    return (
                      <div key={colName} className={`group relative p-2 rounded-lg border transition-all ${isModified ? 'bg-warning-50 border-warning' : 'bg-bg-2 border-transparent hover:border-border-light'}`}>
                        {/* Field Header */}
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2 max-w-[80%]">
                            <span className="text-xs font-medium text-text-primary truncate" title={colName}>{colName}</span>
                            <div className="flex gap-1">
                              {isPK && <span className="text-[9px] font-bold bg-primary-transparent text-accent px-1.5 py-px rounded uppercase tracking-wider">PK</span>}
                              <span className="text-[9px] text-text-tertiary bg-bg-3 px-1.5 py-px rounded">{colInfo?.data_type || 'unknown'}</span>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1">
                            {/* Copy Button (View Mode) */}
                            {!isEditing && !isNull && (
                              <button
                                onClick={handleCopy}
                                className="opacity-0 group-hover:opacity-100 p-1 text-text-secondary hover:text-text-primary rounded"
                                title="Copy Value"
                              >
                                <Copy size={10} />
                              </button>
                            )}

                            {/* NULL Toggle (Edit Mode) */}
                            {isEditing && !isReadOnly && colInfo?.is_nullable && (
                              <button
                                onClick={() => handleValueChange(selectedRow.rowIndex, colName, isNull ? '' : null)}
                                className={`text-[9px] font-bold px-1.5 py-px rounded transition-colors ${isNull
                                  ? 'bg-error-50 text-error border border-error-100'
                                  : 'text-text-tertiary hover:text-text-secondary bg-bg-3'
                                  }`}
                                title={isNull ? "Set to Value" : "Set to NULL"}
                              >
                                NULL
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Field Input/Display */}
                        <div className="relative">
                          {isEditing && !isReadOnly ? (
                            isNull ? (
                              <div className="w-full px-2 py-1.5 bg-bg-2/50 border border-dashed border-border-light rounded text-xs text-text-tertiary italic">
                                NULL
                              </div>
                            ) : dataType === 'boolean' || dataType === 'bool' ? (
                              <select
                                value={String(currentValue)}
                                onChange={(e) => handleValueChange(selectedRow.rowIndex, colName, e.target.value === 'true')}
                                className="w-full bg-bg-0 border border-border-light rounded px-2 py-1.5 text-xs text-text-primary focus:border-accent focus:outline-none"
                              >
                                <option value="true">TRUE</option>
                                <option value="false">FALSE</option>
                              </select>
                            ) : ['integer', 'numeric', 'real', 'double', 'float', 'decimal', 'int', 'bigint', 'smallint'].includes(dataType) ? (
                              <input
                                type="number"
                                value={String(currentValue)}
                                onChange={(e) => handleValueChange(selectedRow.rowIndex, colName, e.target.value)}
                                className="w-full bg-bg-0 border border-border-light rounded px-2 py-1.5 text-xs text-text-primary focus:border-accent focus:outline-none font-mono"
                                placeholder="Enter number..."
                              />
                            ) : (dataType.includes('text') || dataType.includes('char') || dataType.includes('json')) ? (
                              <textarea
                                rows={String(currentValue).length > 50 || String(currentValue).includes('\n') ? 5 : 1}
                                value={formatCellValue(currentValue)}
                                onChange={(e) => handleValueChange(selectedRow.rowIndex, colName, e.target.value)}
                                className="w-full bg-bg-0 border border-border-light rounded px-2 py-1.5 text-xs text-text-primary focus:border-accent focus:outline-none resize-vertical font-mono leading-relaxed"
                                placeholder="Enter text..."
                              />
                            ) : (
                              <input
                                type="text"
                                value={formatCellValue(currentValue)}
                                onChange={(e) => handleValueChange(selectedRow.rowIndex, colName, e.target.value)}
                                className="w-full bg-bg-0 border border-border rounded px-2 py-1.5 text-xs text-text-primary focus:border-accent focus:outline-none"
                              />
                            )
                          ) : (
                            <div
                              className={`text-xs px-2 py-1.5 rounded border border-transparent font-mono break-all whitespace-pre-wrap ${isNull ? 'text-text-tertiary italic bg-bg-2' : 'text-text-secondary bg-bg-2'}`}
                              title={tryGetDateFromTimestamp(currentValue) ? `Possible Date: ${tryGetDateFromTimestamp(currentValue)}` : ''}
                            >
                              {isNull ? 'NULL' : formatCellValue(currentValue)}
                            </div>
                          )}
                        </div>
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
                <div className="mb-2 p-1.5 bg-bg-2 rounded border border-border-light max-h-[300px] overflow-y-auto">
                  <div className="text-[10px] font-medium text-accent mb-1.5 sticky top-0 bg-bg-2 pb-1">New Record</div>
                  <div className="space-y-1.5">
                    {columnsInfo.map((col) => (
                      <div key={col.name} className="space-y-0.5">
                        <label className="text-[10px] text-text-secondary flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            {col.name}
                            {col.is_primary_key && <span className="text-[8px] bg-primary-transparent text-accent px-1 rounded">PK</span>}
                          </span>
                          <span className="text-[9px] text-text-tertiary">{col.data_type}</span>
                        </label>
                        <input
                          type="text"
                          value={newRowValues[col.name] === null || newRowValues[col.name] === undefined ? '' : String(newRowValues[col.name])}
                          onChange={(e) => handleNewRowValueChange(col.name, e.target.value === '' ? null : e.target.value)}
                          placeholder={col.is_nullable ? 'NULL' : col.default_value || 'Required'}
                          disabled={col.is_primary_key && col.default_value !== null}
                          className="w-full bg-bg-0 border border-border-light rounded px-1.5 py-0.5 text-[10px] text-text-primary focus:border-accent focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </div>
                    ))}
                    <div className="flex gap-1 pt-1">
                      <button
                        onClick={handleCreateNew}
                        disabled={executeQuery.isPending}
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-accent hover:bg-accent/90 text-white rounded text-[10px] font-medium disabled:opacity-50"
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

              <div className="text-center text-text-secondary text-[10px] mt-4 p-2 bg-bg-2 rounded">
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
      )
      }
    </div >
  );
}
