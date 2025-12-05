import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import api from '../services/api';

interface Column {
  name: string;
  type: string;
}

interface FilterRule {
  id: string;
  column: string;
  operator: string;
  value: string;
}

interface SortRule {
  id: string;
  column: string;
  direction: 'ASC' | 'DESC';
}

interface VisualQueryBuilderProps {
  onSqlChange: (sql: string) => void;
  initialState?: {
    table: string;
    columns: string[];
    filters: FilterRule[];
    sorts: SortRule[];
    limit: number;
  };
}

export default function VisualQueryBuilder({ onSqlChange, initialState }: VisualQueryBuilderProps) {
  const { connectionId } = useParams();
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [columns, setColumns] = useState<Column[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [filters, setFilters] = useState<FilterRule[]>([]);
  const [sorts, setSorts] = useState<SortRule[]>([]);
  const [limit, setLimit] = useState<string>('100');

  // Fetch tables on mount
  useEffect(() => {
    if (connectionId) {
      api.get(`/api/connections/${connectionId}/tables`)
        .then(res => setTables(res.data.map((t: { name: string }) => t.name)))
        .catch(err => console.error(err));
    }
  }, [connectionId]);

  // Fetch columns when table changes
  useEffect(() => {
    if (connectionId && selectedTable) {
      api.get(`/api/connections/${connectionId}/columns?table=${selectedTable}`)
        .then(res => setColumns(res.data))
        .catch(err => console.error(err));
    } else {
      setColumns([]);
    }
  }, [connectionId, selectedTable]);

  // Load initial state
  useEffect(() => {
    if (initialState) {
      setSelectedTable(initialState.table || '');
      setSelectedColumns(initialState.columns || []);
      setFilters(initialState.filters || []);
      setSorts(initialState.sorts || []);
      setLimit(String(initialState.limit || '100'));
    }
  }, [initialState]);

  // Generate SQL whenever state changes
  useEffect(() => {
    if (!selectedTable) {
      onSqlChange('');
      return;
    }

    const cols = selectedColumns.length > 0 ? selectedColumns.join(', ') : '*';
    let sql = `SELECT ${cols} FROM ${selectedTable}`;

    if (filters.length > 0) {
      const whereClause = filters.map(f => {
        const val = isNaN(Number(f.value)) ? `'${f.value}'` : f.value;
        return `${f.column} ${f.operator} ${val}`;
      }).join(' AND ');
      sql += ` WHERE ${whereClause}`;
    }

    if (sorts.length > 0) {
      const orderBy = sorts.map(s => `${s.column} ${s.direction}`).join(', ');
      sql += ` ORDER BY ${orderBy}`;
    }

    if (limit) {
      sql += ` LIMIT ${limit}`;
    }

    onSqlChange(sql);
  }, [selectedTable, selectedColumns, filters, sorts, limit]);

  const addFilter = () => {
    setFilters([...filters, { id: Math.random().toString(), column: columns[0]?.name || '', operator: '=', value: '' }]);
  };

  const removeFilter = (id: string) => {
    setFilters(filters.filter(f => f.id !== id));
  };

  const updateFilter = (id: string, field: keyof FilterRule, value: string) => {
    setFilters(filters.map(f => f.id === id ? { ...f, [field]: value } : f));
  };

  const addSort = () => {
    setSorts([...sorts, { id: Math.random().toString(), column: columns[0]?.name || '', direction: 'ASC' }]);
  };

  const removeSort = (id: string) => {
    setSorts(sorts.filter(s => s.id !== id));
  };

  const updateSort = (id: string, field: keyof SortRule, value: string) => {
    setSorts(sorts.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const toggleColumn = (colName: string) => {
    if (selectedColumns.includes(colName)) {
      setSelectedColumns(selectedColumns.filter(c => c !== colName));
    } else {
      setSelectedColumns([...selectedColumns, colName]);
    }
  };

  return (
    <div className="flex flex-col h-full bg-bg-1 p-4 gap-4 overflow-y-auto">
      {/* Table Selection */}
      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1">Table</label>
        <select
          value={selectedTable}
          onChange={(e) => {
            setSelectedTable(e.target.value);
            setSelectedColumns([]);
            setFilters([]);
            setSorts([]);
          }}
          className="w-full bg-bg-2 border border-border rounded px-3 py-2 text-sm text-text-primary focus:border-accent outline-none"
        >
          <option value="">Select a table...</option>
          {tables.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {selectedTable && (
        <>
          {/* Columns */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Columns</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedColumns([])}
                className={`px-2 py-1 text-xs rounded border ${selectedColumns.length === 0 ? 'bg-accent text-white border-accent' : 'bg-bg-2 text-text-primary border-border'}`}
              >
                All (*)
              </button>
              {columns.map(col => (
                <button
                  key={col.name}
                  onClick={() => toggleColumn(col.name)}
                  className={`px-2 py-1 text-xs rounded border ${selectedColumns.includes(col.name) ? 'bg-accent text-white border-accent' : 'bg-bg-2 text-text-primary border-border'}`}
                >
                  {col.name}
                </button>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-medium text-text-secondary">Filters</label>
              <button onClick={addFilter} className="text-xs text-accent hover:underline flex items-center gap-1">
                <Plus size={12} /> Add Filter
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {filters.map(filter => (
                <div key={filter.id} className="flex gap-2 items-center">
                  <select
                    value={filter.column}
                    onChange={(e) => updateFilter(filter.id, 'column', e.target.value)}
                    className="bg-bg-2 border border-border rounded px-2 py-1 text-sm text-text-primary outline-none"
                  >
                    {columns.map(col => <option key={col.name} value={col.name}>{col.name}</option>)}
                  </select>
                  <select
                    value={filter.operator}
                    onChange={(e) => updateFilter(filter.id, 'operator', e.target.value)}
                    className="bg-bg-2 border border-border rounded px-2 py-1 text-sm text-text-primary outline-none w-20"
                  >
                    <option value="=">=</option>
                    <option value=">">&gt;</option>
                    <option value="<">&lt;</option>
                    <option value=">=">&gt;=</option>
                    <option value="<=">&lt;=</option>
                    <option value="!=">!=</option>
                    <option value="LIKE">LIKE</option>
                    <option value="ILIKE">ILIKE</option>
                  </select>
                  <input
                    type="text"
                    value={filter.value}
                    onChange={(e) => updateFilter(filter.id, 'value', e.target.value)}
                    placeholder="Value"
                    className="flex-1 bg-bg-2 border border-border rounded px-2 py-1 text-sm text-text-primary outline-none"
                  />
                  <button onClick={() => removeFilter(filter.id)} className="text-text-secondary hover:text-error">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Sorting */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-medium text-text-secondary">Sorting</label>
              <button onClick={addSort} className="text-xs text-accent hover:underline flex items-center gap-1">
                <Plus size={12} /> Add Sort
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {sorts.map(sort => (
                <div key={sort.id} className="flex gap-2 items-center">
                  <select
                    value={sort.column}
                    onChange={(e) => updateSort(sort.id, 'column', e.target.value)}
                    className="bg-bg-2 border border-border rounded px-2 py-1 text-sm text-text-primary outline-none"
                  >
                    {columns.map(col => <option key={col.name} value={col.name}>{col.name}</option>)}
                  </select>
                  <select
                    value={sort.direction}
                    onChange={(e) => updateSort(sort.id, 'direction', e.target.value as 'ASC' | 'DESC')}
                    className="bg-bg-2 border border-border rounded px-2 py-1 text-sm text-text-primary outline-none w-24"
                  >
                    <option value="ASC">ASC</option>
                    <option value="DESC">DESC</option>
                  </select>
                  <button onClick={() => removeSort(sort.id)} className="text-text-secondary hover:text-error">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Limit */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Limit</label>
            <input
              type="number"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              className="w-24 bg-bg-2 border border-border rounded px-2 py-1 text-sm text-text-primary outline-none"
            />
          </div>
        </>
      )}
    </div>
  );
}
