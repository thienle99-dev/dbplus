import { useMemo, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import api from '../services/api';
import Select from './ui/Select';
import { useSchemas } from '../hooks/useDatabase';
import { useConnectionStore } from '../store/connectionStore';

interface Column {
  name: string;
  type: string;
}

interface FilterRule {
  id: string;
  column: string;
  operator: string;
  value: string;
  value2?: string; // For BETWEEN operator
}

interface SortRule {
  id: string;
  column: string;
  direction: 'ASC' | 'DESC';
}

interface VisualQueryBuilderProps {
  onSqlChange: (sql: string) => void;
  initialState?: {
    schema?: string;
    table: string;
    columns: string[];
    filters: FilterRule[];
    sorts: SortRule[];
    limit: number;
  };
}

function quoteIdent(s: string, isCouchbase: boolean = false) {
  if (isCouchbase) {
    return `\`${s.replace(/`/g, '``')}\``;
  }
  return `"${s.replace(/"/g, '""')}"`;
}

function quoteSqlString(s: string) {
  return `'${s.replace(/'/g, "''")}'`;
}

export default function VisualQueryBuilder({ onSqlChange, initialState }: VisualQueryBuilderProps) {
  const { connectionId } = useParams();
  const schemasQuery = useSchemas(connectionId);
  const schemas = schemasQuery.data || [];

  const { connections } = useConnectionStore();
  const connection = useMemo(() => connections.find((c) => c.id === connectionId), [connections, connectionId]);
  const isCouchbase = connection?.type === 'couchbase';

  const schemaTerm = isCouchbase ? 'Scope' : 'Schema';
  const tableTerm = isCouchbase ? 'Collection' : 'Table';

  const [selectedSchema, setSelectedSchema] = useState<string>('');
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [columns, setColumns] = useState<Column[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [filters, setFilters] = useState<FilterRule[]>([]);
  const [sorts, setSorts] = useState<SortRule[]>([]);
  const [limit, setLimit] = useState<string>('100');

  // Default schema
  useEffect(() => {
    if (selectedSchema) return;
    if (initialState?.schema) {
      setSelectedSchema(initialState.schema);
      return;
    }
    if (schemas.length > 0) {
      // Prefer common defaults
      if (schemas.includes('public')) setSelectedSchema('public');
      else if (schemas.includes('main')) setSelectedSchema('main');
      else setSelectedSchema(schemas[0]);
    }
  }, [schemas, selectedSchema, initialState?.schema]);

  // Fetch tables when schema changes
  useEffect(() => {
    if (!connectionId || !selectedSchema) {
      setTables([]);
      return;
    }
    api.get(`/api/connections/${connectionId}/tables`, { params: { schema: selectedSchema } })
      .then(res => {
        const items: any[] = Array.isArray(res.data) ? res.data : [];
        const names = items.map((t) => (typeof t === 'string' ? t : t?.name)).filter(Boolean);
        setTables(names);
      })
      .catch(err => {
        console.error(err);
        setTables([]);
      });
  }, [connectionId, selectedSchema]);

  // Fetch columns when table changes
  useEffect(() => {
    if (connectionId && selectedSchema && selectedTable) {
      api.get(`/api/connections/${connectionId}/columns`, { params: { schema: selectedSchema, table: selectedTable } })
        .then(res => {
          const items: any[] = Array.isArray(res.data) ? res.data : [];
          setColumns(items.map((c) => ({ name: c?.name, type: c?.data_type || c?.type || '' })).filter((c) => !!c.name));
        })
        .catch(err => {
          console.error(err);
          setColumns([]);
        });
    } else {
      setColumns([]);
    }
  }, [connectionId, selectedSchema, selectedTable]);

  // Load initial state
  useEffect(() => {
    if (initialState) {
      const rawTable = initialState.table || '';
      if (initialState.schema) {
        setSelectedSchema(initialState.schema);
        setSelectedTable(rawTable);
      } else if (rawTable.includes('.')) {
        const [s, t] = rawTable.split('.', 2);
        setSelectedSchema(s);
        setSelectedTable(t);
      } else {
        setSelectedTable(rawTable);
      }
      setSelectedColumns(initialState.columns || []);
      setFilters(initialState.filters || []);
      setSorts(initialState.sorts || []);
      setLimit(String(initialState.limit || '100'));
    }
  }, [initialState]);

  const schemaOptions = useMemo(
    () => [{ value: '', label: `Select ${schemaTerm.toLowerCase()}...` }, ...schemas.map((s) => ({ value: s, label: s }))],
    [schemas, schemaTerm],
  );

  const tableOptions = useMemo(
    () => [{ value: '', label: `Select a ${tableTerm.toLowerCase()}...` }, ...tables.map((t) => ({ value: t, label: t }))],
    [tables, tableTerm],
  );

  // Generate SQL whenever state changes
  useEffect(() => {
    if (!selectedSchema || !selectedTable) {
      onSqlChange('');
      return;
    }

    const cols =
      selectedColumns.length > 0 ? selectedColumns.map((c) => quoteIdent(c, isCouchbase)).join(', ') : '*';
    const from =
      selectedSchema === 'main'
        ? `${quoteIdent(selectedTable, isCouchbase)}`
        : `${quoteIdent(selectedSchema, isCouchbase)}.${quoteIdent(selectedTable, isCouchbase)}`;
    let sql = `SELECT ${cols} FROM ${from}`;

    if (filters.length > 0) {
      const whereClause = filters.map(f => {
        const asNum = Number(f.value);
        const val = !Number.isNaN(asNum) && f.value.trim() !== '' ? String(asNum) : quoteSqlString(f.value);
        return `${quoteIdent(f.column, isCouchbase)} ${f.operator} ${val}`;
      }).join(' AND ');
      sql += ` WHERE ${whereClause}`;
    }

    if (sorts.length > 0) {
      const orderBy = sorts.map(s => `${quoteIdent(s.column, isCouchbase)} ${s.direction}`).join(', ');
      sql += ` ORDER BY ${orderBy}`;
    }

    if (limit) {
      sql += ` LIMIT ${limit}`;
    }

    onSqlChange(sql);
  }, [selectedSchema, selectedTable, selectedColumns, filters, sorts, limit, onSqlChange]);

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
      {/* Schema Selection */}
      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1">{schemaTerm}</label>
        <Select
          value={selectedSchema}
          onChange={(val) => {
            setSelectedSchema(val);
            setSelectedTable('');
            setSelectedColumns([]);
            setFilters([]);
            setSorts([]);
          }}
          options={schemaOptions}
          searchable
        />
      </div>

      {/* Table Selection */}
      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1">{tableTerm}</label>
        <Select
          value={selectedTable}
          onChange={(val) => {
            setSelectedTable(val);
            setSelectedColumns([]);
            setFilters([]);
            setSorts([]);
          }}
          options={tableOptions}
          searchable
        />
      </div>

      {selectedSchema && selectedTable && (
        <>
          {/* Columns */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">{isCouchbase ? 'Fields' : 'Columns'}</label>
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
                  <Select
                    value={filter.column}
                    onChange={(val) => updateFilter(filter.id, 'column', val)}
                    options={columns.map(col => ({ value: col.name, label: col.name }))}
                    size="sm"
                    className="flex-1"
                  />
                  <Select
                    value={filter.operator}
                    onChange={(val) => updateFilter(filter.id, 'operator', val)}
                    options={[
                      { value: '=', label: '=' },
                      { value: '>', label: '>' },
                      { value: '<', label: '<' },
                      { value: '>=', label: '>=' },
                      { value: '<=', label: '<=' },
                      { value: '!=', label: '!=' },
                      { value: 'LIKE', label: 'LIKE' },
                      { value: 'ILIKE', label: 'ILIKE' },
                    ]}
                    size="sm"
                    className="w-24"
                  />
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
                  <Select
                    value={sort.column}
                    onChange={(val) => updateSort(sort.id, 'column', val)}
                    options={columns.map(col => ({ value: col.name, label: col.name }))}
                    size="sm"
                    className="flex-1"
                  />
                  <Select
                    value={sort.direction}
                    onChange={(val) => updateSort(sort.id, 'direction', val as 'ASC' | 'DESC')}
                    options={[
                      { value: 'ASC', label: 'ASC ↑' },
                      { value: 'DESC', label: 'DESC ↓' },
                    ]}
                    size="sm"
                    className="w-28"
                  />
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
