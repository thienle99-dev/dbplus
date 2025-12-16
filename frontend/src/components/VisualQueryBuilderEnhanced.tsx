import { useMemo, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Trash2, HelpCircle, Database, Table, Columns, Filter, ArrowUpDown, Settings, Link2, Group, Calculator, Copy, Check } from 'lucide-react';
import api from '../services/api';
import Select from './ui/Select';
import Checkbox from './ui/Checkbox';
import { useSchemas } from '../hooks/useDatabase';
import { translations, Language } from '../i18n/queryBuilder';

interface Column {
    name: string;
    type: string;
}

interface FilterRule {
    id: string;
    column: string;
    operator: string;
    value: string;
    value2?: string;
    logic?: 'AND' | 'OR';
}

interface SortRule {
    id: string;
    column: string;
    direction: 'ASC' | 'DESC';
}

interface JoinRule {
    id: string;
    type: 'INNER JOIN' | 'LEFT JOIN' | 'RIGHT JOIN' | 'FULL JOIN';
    table: string;
    schema?: string;
    onColumn: string;
    targetColumn: string;
}

interface AggregateColumn {
    id: string;
    function: 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX' | 'COUNT_DISTINCT';
    column: string;
    alias: string;
}

interface VisualQueryBuilderProps {
    onSqlChange: (sql: string) => void;
    language: Language;
    initialState?: {
        schema?: string;
        table: string;
        columns: string[];
        filters: FilterRule[];
        sorts: SortRule[];
        limit: number;
    };
}

function quoteIdent(s: string) {
    return `"${s.replace(/"/g, '""')}"`;
}

function quoteSqlString(s: string) {
    return `'${s.replace(/'/g, "''")}'`;
}

// Section Card Component
function SectionCard({
    title,
    icon: Icon,
    tooltip,
    children,
    action
}: {
    title: string;
    icon: any;
    tooltip?: string;
    children: React.ReactNode;
    action?: React.ReactNode;
}) {
    return (
        <div className="bg-bg-1 rounded-lg border border-border shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-2/50">
                <div className="flex items-center gap-2">
                    <Icon size={16} className="text-accent" />
                    <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
                    {tooltip && (
                        <span title={tooltip} className="text-text-secondary cursor-help">
                            <HelpCircle size={14} />
                        </span>
                    )}
                </div>
                {action}
            </div>
            <div className="p-4">
                {children}
            </div>
        </div>
    );
}

export default function VisualQueryBuilderEnhanced({ onSqlChange, language, initialState }: VisualQueryBuilderProps) {
    const { connectionId } = useParams();
    const schemasQuery = useSchemas(connectionId);
    const schemas = schemasQuery.data || [];
    const t = translations[language];


    const [selectedSchema, setSelectedSchema] = useState<string>('');
    const [tables, setTables] = useState<string[]>([]);
    const [selectedTable, setSelectedTable] = useState<string>('');
    const [generatedSql, setGeneratedSql] = useState<string>('');
    const [copied, setCopied] = useState(false); // Add copied state // Add state for SQL preview
    const [columns, setColumns] = useState<Column[]>([]);
    const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
    const [filters, setFilters] = useState<FilterRule[]>([]);
    const [sorts, setSorts] = useState<SortRule[]>([]);
    const [limit, setLimit] = useState<string>('100');
    const [offset, setOffset] = useState<string>('0');
    const [distinct, setDistinct] = useState<boolean>(false);
    const [groupByColumns, setGroupByColumns] = useState<string[]>([]);
    const [havingFilters, setHavingFilters] = useState<FilterRule[]>([]);
    const [aggregates, setAggregates] = useState<AggregateColumn[]>([]);
    const [joins, setJoins] = useState<JoinRule[]>([]);
    const [joinTables, setJoinTables] = useState<Record<string, Column[]>>({});

    // Default schema
    useEffect(() => {
        if (selectedSchema) return;
        if (initialState?.schema) {
            setSelectedSchema(initialState.schema);
            return;
        }
        if (schemas.length > 0) {
            if (schemas.includes('public')) setSelectedSchema('public');
            else if (schemas.includes('main')) setSelectedSchema('main');
            else setSelectedSchema(schemas[0]);
        }
    }, [schemas, selectedSchema, initialState?.schema]);

    // Fetch tables
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

    // Fetch columns
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

    const fetchJoinTableColumns = async (table: string) => {
        if (!connectionId || !selectedSchema || joinTables[table]) return;
        try {
            const res = await api.get(`/api/connections/${connectionId}/columns`, {
                params: { schema: selectedSchema, table }
            });
            const items: any[] = Array.isArray(res.data) ? res.data : [];
            const cols = items.map((c) => ({ name: c?.name, type: c?.data_type || c?.type || '' })).filter((c) => !!c.name);
            setJoinTables(prev => ({ ...prev, [table]: cols }));
        } catch (err) {
            console.error(err);
        }
    };

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
        () => [{ value: '', label: t.actions.selectSchema }, ...schemas.map((s) => ({ value: s, label: s }))],
        [schemas, t.actions.selectSchema],
    );

    const tableOptions = useMemo(
        () => [{ value: '', label: t.actions.selectTable }, ...tables.map((t) => ({ value: t, label: t }))],
        [tables, t.actions.selectTable],
    );

    // Generate SQL
    useEffect(() => {
        if (!selectedSchema || !selectedTable) {
            onSqlChange('');
            return;
        }

        let selectClause = distinct ? 'SELECT DISTINCT ' : 'SELECT ';
        const selectItems: string[] = [];

        aggregates.forEach(agg => {
            if (agg.function === 'COUNT_DISTINCT') {
                selectItems.push(`COUNT(DISTINCT ${quoteIdent(agg.column)}) AS ${quoteIdent(agg.alias)}`);
            } else {
                selectItems.push(`${agg.function}(${quoteIdent(agg.column)}) AS ${quoteIdent(agg.alias)}`);
            }
        });

        if (selectedColumns.length > 0) {
            selectedColumns.forEach(c => selectItems.push(quoteIdent(c)));
        } else if (aggregates.length === 0) {
            selectItems.push('*');
        }

        if (groupByColumns.length > 0 && aggregates.length === 0) {
            groupByColumns.forEach(c => {
                if (!selectItems.includes(quoteIdent(c))) {
                    selectItems.push(quoteIdent(c));
                }
            });
        }

        selectClause += selectItems.join(', ');

        const from =
            selectedSchema === 'main'
                ? `${quoteIdent(selectedTable)}`
                : `${quoteIdent(selectedSchema)}.${quoteIdent(selectedTable)}`;
        let sql = `${selectClause} FROM ${from}`;

        if (joins.length > 0) {
            joins.forEach(join => {
                const joinTable = join.schema && join.schema !== 'main'
                    ? `${quoteIdent(join.schema)}.${quoteIdent(join.table)}`
                    : quoteIdent(join.table);
                sql += ` ${join.type} ${joinTable} ON ${quoteIdent(join.onColumn)} = ${quoteIdent(join.targetColumn)}`;
            });
        }

        if (filters.length > 0) {
            let whereClause = '';
            filters.forEach((f, index) => {
                const logic = index > 0 ? ` ${f.logic || 'AND'} ` : '';
                let condition = '';

                if (f.operator === 'IS NULL' || f.operator === 'IS NOT NULL') {
                    condition = `${quoteIdent(f.column)} ${f.operator}`;
                } else if (f.operator === 'IN' || f.operator === 'NOT IN') {
                    const values = f.value.split(',').map(v => quoteSqlString(v.trim())).join(', ');
                    condition = `${quoteIdent(f.column)} ${f.operator} (${values})`;
                } else if (f.operator === 'BETWEEN') {
                    condition = `${quoteIdent(f.column)} BETWEEN ${quoteSqlString(f.value)} AND ${quoteSqlString(f.value2 || '')}`;
                } else {
                    const asNum = Number(f.value);
                    const val = !Number.isNaN(asNum) && f.value.trim() !== '' ? String(asNum) : quoteSqlString(f.value);
                    condition = `${quoteIdent(f.column)} ${f.operator} ${val}`;
                }

                whereClause += logic + condition;
            });
            sql += ` WHERE ${whereClause}`;
        }

        if (groupByColumns.length > 0) {
            const groupBy = groupByColumns.map(c => quoteIdent(c)).join(', ');
            sql += ` GROUP BY ${groupBy}`;
        }

        if (havingFilters.length > 0) {
            const havingClause = havingFilters.map(f => {
                const asNum = Number(f.value);
                const val = !Number.isNaN(asNum) && f.value.trim() !== '' ? String(asNum) : quoteSqlString(f.value);
                return `${quoteIdent(f.column)} ${f.operator} ${val}`;
            }).join(' AND ');
            sql += ` HAVING ${havingClause}`;
        }

        if (sorts.length > 0) {
            const orderBy = sorts.map(s => `${quoteIdent(s.column)} ${s.direction}`).join(', ');
            sql += ` ORDER BY ${orderBy}`;
        }

        if (limit) {
            sql += ` LIMIT ${limit}`;
        }
        if (offset && offset !== '0') {
            sql += ` OFFSET ${offset}`;
        }

        onSqlChange(sql);
        setGeneratedSql(sql);
    }, [selectedSchema, selectedTable, selectedColumns, filters, sorts, limit, offset, distinct, groupByColumns, havingFilters, aggregates, joins, onSqlChange]);

    // Helper functions
    const addFilter = () => {
        setFilters([...filters, {
            id: Math.random().toString(),
            column: columns[0]?.name || '',
            operator: '=',
            value: '',
            logic: filters.length > 0 ? 'AND' : undefined
        }]);
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

    const addAggregate = () => {
        const newAgg: AggregateColumn = {
            id: Math.random().toString(),
            function: 'COUNT',
            column: columns[0]?.name || '',
            alias: `count_${columns[0]?.name || 'result'}`,
        };
        setAggregates([...aggregates, newAgg]);
    };

    const removeAggregate = (id: string) => {
        setAggregates(aggregates.filter(a => a.id !== id));
    };

    const updateAggregate = (id: string, field: keyof AggregateColumn, value: string) => {
        setAggregates(aggregates.map(a => a.id === id ? { ...a, [field]: value } : a));
    };

    const addJoin = () => {
        const newJoin: JoinRule = {
            id: Math.random().toString(),
            type: 'INNER JOIN',
            table: tables[0] || '',
            schema: selectedSchema,
            onColumn: columns[0]?.name || '',
            targetColumn: '',
        };
        setJoins([...joins, newJoin]);
        if (newJoin.table) fetchJoinTableColumns(newJoin.table);
    };

    const removeJoin = (id: string) => {
        setJoins(joins.filter(j => j.id !== id));
    };

    const updateJoin = (id: string, field: keyof JoinRule, value: string) => {
        setJoins(joins.map(j => {
            if (j.id === id) {
                const updated = { ...j, [field]: value };
                if (field === 'table' && value) {
                    fetchJoinTableColumns(value);
                }
                return updated;
            }
            return j;
        }));
    };

    const addHavingFilter = () => {
        setHavingFilters([...havingFilters, { id: Math.random().toString(), column: aggregates[0]?.alias || '', operator: '>', value: '' }]);
    };

    const removeHavingFilter = (id: string) => {
        setHavingFilters(havingFilters.filter(f => f.id !== id));
    };

    const updateHavingFilter = (id: string, field: keyof FilterRule, value: string) => {
        setHavingFilters(havingFilters.map(f => f.id === id ? { ...f, [field]: value } : f));
    };

    const toggleGroupBy = (colName: string) => {
        if (groupByColumns.includes(colName)) {
            setGroupByColumns(groupByColumns.filter(c => c !== colName));
        } else {
            setGroupByColumns([...groupByColumns, colName]);
        }
    };

    const operatorOptions = [
        { value: '=', label: `= (${t.operators.equals})` },
        { value: '>', label: `> (${t.operators.greater})` },
        { value: '<', label: `< (${t.operators.less})` },
        { value: '>=', label: `>= (${t.operators.greaterOrEqual})` },
        { value: '<=', label: `<= (${t.operators.lessOrEqual})` },
        { value: '!=', label: `!= (${t.operators.notEqual})` },
        { value: 'LIKE', label: `LIKE (${t.operators.like})` },
        { value: 'ILIKE', label: `ILIKE (${t.operators.ilike})` },
        { value: 'IN', label: `IN (${t.operators.in})` },
        { value: 'NOT IN', label: `NOT IN (${t.operators.notIn})` },
        { value: 'IS NULL', label: t.operators.isNull },
        { value: 'IS NOT NULL', label: t.operators.isNotNull },
        { value: 'BETWEEN', label: `BETWEEN (${t.operators.between})` },
    ];

    const handleCopySql = () => {
        if (!generatedSql) return;
        navigator.clipboard.writeText(generatedSql);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="flex flex-col h-full bg-bg-0">
            <div className="flex-none p-6 border-b border-border bg-bg-0 z-10 shadow-sm">
                <div className="max-w-7xl mx-auto space-y-4">
                    {/* Header Section */}
                    <div className="grid grid-cols-2 gap-4">
                        <SectionCard title={t.sections.schema} icon={Database}>
                            <Select
                                value={selectedSchema}
                                onChange={(val) => {
                                    setSelectedSchema(val);
                                    setSelectedTable('');
                                    setSelectedColumns([]);
                                    setFilters([]);
                                    setSorts([]);
                                    setJoins([]);
                                    setAggregates([]);
                                    setGroupByColumns([]);
                                    setHavingFilters([]);
                                }}
                                options={schemaOptions}
                                searchable
                            />
                        </SectionCard>

                        <SectionCard title={t.sections.table} icon={Table}>
                            <Select
                                value={selectedTable}
                                onChange={(val) => {
                                    setSelectedTable(val);
                                    setSelectedColumns([]);
                                    setFilters([]);
                                    setSorts([]);
                                    setJoins([]);
                                    setAggregates([]);
                                    setGroupByColumns([]);
                                    setHavingFilters([]);
                                    setLimit('100');
                                    setOffset('0');
                                }}
                                options={tableOptions}
                                searchable
                            />
                        </SectionCard>
                    </div>

                    {selectedSchema && selectedTable && (
                        /* SQL Preview */
                        <div className="p-4 bg-bg-1 rounded-lg border border-border">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                                    <code className="px-1.5 py-0.5 rounded bg-accent/10 text-accent text-xs">SQL</code>
                                    Preview
                                </h3>
                                <button
                                    onClick={handleCopySql}
                                    disabled={!generatedSql}
                                    className="text-xs flex items-center gap-1.5 px-2 py-1 rounded hover:bg-bg-2 text-text-secondary hover:text-text-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                                    {copied ? 'Copied!' : 'Copy'}
                                </button>
                            </div>
                            <div className="p-3 bg-bg-0 rounded-md border border-border/50 font-mono text-sm text-text-secondary overflow-x-auto whitespace-pre-wrap max-h-32 overflow-y-auto">
                                {generatedSql || <span className="text-text-secondary/50 italic">SQL will appear here...</span>}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-7xl mx-auto space-y-6">
                    {selectedSchema && selectedTable && (
                        <>
                            {/* Options Row */}
                            <Checkbox
                                checked={distinct}
                                onChange={setDistinct}
                                label={t.actions.removeDuplicates}
                                description={t.tooltips.distinct}
                                className="p-4 bg-bg-1 rounded-lg border border-border"
                            />

                            {/* Columns Selection */}
                            <SectionCard title={t.sections.selectColumns} icon={Columns}>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={() => setSelectedColumns([])}
                                        className={`px-3 py-1.5 text-sm rounded-md border transition-all ${selectedColumns.length === 0
                                            ? 'bg-accent text-white border-accent shadow-sm'
                                            : 'bg-bg-2 text-text-primary border-border hover:border-accent/50'
                                            }`}
                                    >
                                        {t.actions.allColumns}
                                    </button>
                                    {columns.map(col => (
                                        <button
                                            key={col.name}
                                            onClick={() => toggleColumn(col.name)}
                                            className={`px-3 py-1.5 text-sm rounded-md border transition-all ${selectedColumns.includes(col.name)
                                                ? 'bg-accent text-white border-accent shadow-sm'
                                                : 'bg-bg-2 text-text-primary border-border hover:border-accent/50'
                                                }`}
                                        >
                                            {col.name}
                                            <span className="ml-1 text-xs opacity-70">({col.type})</span>
                                        </button>
                                    ))}
                                </div>
                            </SectionCard>

                            {/* Aggregates */}
                            <SectionCard
                                title={t.sections.calculateValues}
                                icon={Calculator}
                                tooltip={t.tooltips.aggregate}
                                action={
                                    <button
                                        onClick={addAggregate}
                                        className="text-xs text-accent hover:text-accent/80 flex items-center gap-1 font-medium transition-colors"
                                    >
                                        <Plus size={14} /> {t.actions.add}
                                    </button>
                                }
                            >
                                {aggregates.length === 0 ? (
                                    <p className="text-sm text-text-secondary italic">{t.emptyStates.noCalculations}</p>
                                ) : (
                                    <div className="space-y-3">
                                        {aggregates.map(agg => (
                                            <div key={agg.id} className="flex gap-2 items-center p-3 bg-bg-0 rounded-md border border-border">
                                                <Select
                                                    value={agg.function}
                                                    onChange={(val) => updateAggregate(agg.id, 'function', val)}
                                                    options={[
                                                        { value: 'COUNT', label: t.aggregates.count },
                                                        { value: 'COUNT_DISTINCT', label: t.aggregates.countDistinct },
                                                        { value: 'SUM', label: t.aggregates.sum },
                                                        { value: 'AVG', label: t.aggregates.avg },
                                                        { value: 'MIN', label: t.aggregates.min },
                                                        { value: 'MAX', label: t.aggregates.max },
                                                    ]}
                                                    size="sm"
                                                    className="w-40"
                                                />
                                                <Select
                                                    value={agg.column}
                                                    onChange={(val) => updateAggregate(agg.id, 'column', val)}
                                                    options={columns.map(col => ({ value: col.name, label: col.name }))}
                                                    size="sm"
                                                    className="flex-1"
                                                />
                                                <input
                                                    type="text"
                                                    value={agg.alias}
                                                    onChange={(e) => updateAggregate(agg.id, 'alias', e.target.value)}
                                                    placeholder={t.labels.resultName}
                                                    className="flex-1 bg-bg-2 border border-border rounded-md px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent transition-colors"
                                                />
                                                <button
                                                    onClick={() => removeAggregate(agg.id)}
                                                    className="p-1.5 text-text-secondary hover:text-error hover:bg-error/10 rounded transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </SectionCard>

                            {/* JOINs */}
                            <SectionCard
                                title={t.sections.joinTables}
                                icon={Link2}
                                tooltip={t.tooltips.join}
                                action={
                                    <button
                                        onClick={addJoin}
                                        className="text-xs text-accent hover:text-accent/80 flex items-center gap-1 font-medium transition-colors"
                                    >
                                        <Plus size={14} /> {t.actions.add}
                                    </button>
                                }
                            >
                                {joins.length === 0 ? (
                                    <p className="text-sm text-text-secondary italic">{t.emptyStates.noJoins}</p>
                                ) : (
                                    <div className="space-y-3">
                                        {joins.map(join => (
                                            <div key={join.id} className="p-3 bg-bg-0 rounded-md border border-border space-y-2">
                                                <div className="flex gap-2 items-center">
                                                    <Select
                                                        value={join.type}
                                                        onChange={(val) => updateJoin(join.id, 'type', val)}
                                                        options={[
                                                            { value: 'INNER JOIN', label: t.joins.inner },
                                                            { value: 'LEFT JOIN', label: t.joins.left },
                                                            { value: 'RIGHT JOIN', label: t.joins.right },
                                                            { value: 'FULL JOIN', label: t.joins.full },
                                                        ]}
                                                        size="sm"
                                                        className="w-32"
                                                    />
                                                    <Select
                                                        value={join.table}
                                                        onChange={(val) => updateJoin(join.id, 'table', val)}
                                                        options={tables.map(t => ({ value: t, label: t }))}
                                                        size="sm"
                                                        className="flex-1"
                                                    />
                                                    <button
                                                        onClick={() => removeJoin(join.id)}
                                                        className="p-1.5 text-text-secondary hover:text-error hover:bg-error/10 rounded transition-colors"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                                <div className="flex gap-2 items-center text-xs text-text-secondary pl-2">
                                                    <span className="font-medium">ON</span>
                                                    <Select
                                                        value={join.onColumn}
                                                        onChange={(val) => updateJoin(join.id, 'onColumn', val)}
                                                        options={columns.map(col => ({ value: col.name, label: col.name }))}
                                                        size="sm"
                                                        className="flex-1"
                                                    />
                                                    <span className="font-medium">=</span>
                                                    <Select
                                                        value={join.targetColumn}
                                                        onChange={(val) => updateJoin(join.id, 'targetColumn', val)}
                                                        options={(joinTables[join.table] || []).map(col => ({ value: col.name, label: col.name }))}
                                                        size="sm"
                                                        className="flex-1"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </SectionCard>

                            {/* Filters */}
                            <SectionCard
                                title={t.sections.filterRows}
                                icon={Filter}
                                action={
                                    <button
                                        onClick={addFilter}
                                        className="text-xs text-accent hover:text-accent/80 flex items-center gap-1 font-medium transition-colors"
                                    >
                                        <Plus size={14} /> {t.actions.add}
                                    </button>
                                }
                            >
                                {filters.length === 0 ? (
                                    <p className="text-sm text-text-secondary italic">{t.emptyStates.noFilters}</p>
                                ) : (
                                    <div className="space-y-2">
                                        {filters.map((filter, index) => (
                                            <div key={filter.id} className="flex gap-2 items-center">
                                                {index > 0 && (
                                                    <Select
                                                        value={filter.logic || 'AND'}
                                                        onChange={(val) => updateFilter(filter.id, 'logic', val as 'AND' | 'OR')}
                                                        options={[
                                                            { value: 'AND', label: t.logic.and },
                                                            { value: 'OR', label: t.logic.or },
                                                        ]}
                                                        size="sm"
                                                        className="w-24"
                                                    />
                                                )}
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
                                                    options={operatorOptions}
                                                    size="sm"
                                                    className="w-48"
                                                />
                                                {filter.operator !== 'IS NULL' && filter.operator !== 'IS NOT NULL' && (
                                                    <>
                                                        <input
                                                            type="text"
                                                            value={filter.value}
                                                            onChange={(e) => updateFilter(filter.id, 'value', e.target.value)}
                                                            placeholder={filter.operator === 'IN' || filter.operator === 'NOT IN' ? 'val1, val2, ...' : t.labels.value}
                                                            className="flex-1 bg-bg-2 border border-border rounded-md px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent transition-colors"
                                                        />
                                                        {filter.operator === 'BETWEEN' && (
                                                            <>
                                                                <span className="text-xs text-text-secondary font-medium">AND</span>
                                                                <input
                                                                    type="text"
                                                                    value={filter.value2 || ''}
                                                                    onChange={(e) => updateFilter(filter.id, 'value2', e.target.value)}
                                                                    placeholder={t.labels.value2}
                                                                    className="flex-1 bg-bg-2 border border-border rounded-md px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent transition-colors"
                                                                />
                                                            </>
                                                        )}
                                                    </>
                                                )}
                                                <button
                                                    onClick={() => removeFilter(filter.id)}
                                                    className="p-1.5 text-text-secondary hover:text-error hover:bg-error/10 rounded transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </SectionCard>

                            {/* GROUP BY */}
                            <SectionCard
                                title={t.sections.groupRowsBy}
                                icon={Group}
                                tooltip={t.tooltips.groupBy}
                            >
                                <div className="flex flex-wrap gap-2">
                                    {columns.map(col => (
                                        <button
                                            key={col.name}
                                            onClick={() => toggleGroupBy(col.name)}
                                            className={`px-3 py-1.5 text-sm rounded-md border transition-all ${groupByColumns.includes(col.name)
                                                ? 'bg-accent text-white border-accent shadow-sm'
                                                : 'bg-bg-2 text-text-primary border-border hover:border-accent/50'
                                                }`}
                                        >
                                            {col.name}
                                        </button>
                                    ))}
                                </div>
                            </SectionCard>

                            {/* HAVING */}
                            {groupByColumns.length > 0 && (
                                <SectionCard
                                    title={t.sections.filterGroups}
                                    icon={Filter}
                                    tooltip={t.tooltips.having}
                                    action={
                                        <button
                                            onClick={addHavingFilter}
                                            className="text-xs text-accent hover:text-accent/80 flex items-center gap-1 font-medium transition-colors"
                                        >
                                            <Plus size={14} /> {t.actions.add}
                                        </button>
                                    }
                                >
                                    {havingFilters.length === 0 ? (
                                        <p className="text-sm text-text-secondary italic">{t.emptyStates.noHavingFilters}</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {havingFilters.map(filter => (
                                                <div key={filter.id} className="flex gap-2 items-center">
                                                    <Select
                                                        value={filter.column}
                                                        onChange={(val) => updateHavingFilter(filter.id, 'column', val)}
                                                        options={aggregates.map(agg => ({ value: agg.alias, label: agg.alias }))}
                                                        size="sm"
                                                        className="flex-1"
                                                    />
                                                    <Select
                                                        value={filter.operator}
                                                        onChange={(val) => updateHavingFilter(filter.id, 'operator', val)}
                                                        options={[
                                                            { value: '=', label: '=' },
                                                            { value: '>', label: '>' },
                                                            { value: '<', label: '<' },
                                                            { value: '>=', label: '>=' },
                                                            { value: '<=', label: '<=' },
                                                            { value: '!=', label: '!=' },
                                                        ]}
                                                        size="sm"
                                                        className="w-24"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={filter.value}
                                                        onChange={(e) => updateHavingFilter(filter.id, 'value', e.target.value)}
                                                        placeholder={t.labels.value}
                                                        className="flex-1 bg-bg-2 border border-border rounded-md px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent transition-colors"
                                                    />
                                                    <button
                                                        onClick={() => removeHavingFilter(filter.id)}
                                                        className="p-1.5 text-text-secondary hover:text-error hover:bg-error/10 rounded transition-colors"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </SectionCard>
                            )}

                            {/* Sorting */}
                            <SectionCard
                                title={t.sections.sortResults}
                                icon={ArrowUpDown}
                                action={
                                    <button
                                        onClick={addSort}
                                        className="text-xs text-accent hover:text-accent/80 flex items-center gap-1 font-medium transition-colors"
                                    >
                                        <Plus size={14} /> {t.actions.add}
                                    </button>
                                }
                            >
                                {sorts.length === 0 ? (
                                    <p className="text-sm text-text-secondary italic">{t.emptyStates.noSorting}</p>
                                ) : (
                                    <div className="space-y-2">
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
                                                        { value: 'ASC', label: t.sort.ascending },
                                                        { value: 'DESC', label: t.sort.descending },
                                                    ]}
                                                    size="sm"
                                                    className="w-44"
                                                />
                                                <button
                                                    onClick={() => removeSort(sort.id)}
                                                    className="p-1.5 text-text-secondary hover:text-error hover:bg-error/10 rounded transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </SectionCard>

                            {/* Limit & Offset */}
                            <SectionCard title={t.sections.pagination} icon={Settings}>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-text-secondary mb-2">
                                            {t.labels.limitMaxRows}
                                        </label>
                                        <input
                                            type="number"
                                            value={limit}
                                            onChange={(e) => setLimit(e.target.value)}
                                            className="w-full bg-bg-2 border border-border rounded-md px-3 py-2 text-sm text-text-primary outline-none focus:border-accent transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-text-secondary mb-2 flex items-center gap-1">
                                            {t.labels.offsetSkipRows}
                                            <span title={t.tooltips.offset} className="text-text-secondary cursor-help">
                                                <HelpCircle size={14} />
                                            </span>
                                        </label>
                                        <input
                                            type="number"
                                            value={offset}
                                            onChange={(e) => setOffset(e.target.value)}
                                            className="w-full bg-bg-2 border border-border rounded-md px-3 py-2 text-sm text-text-primary outline-none focus:border-accent transition-colors"
                                        />
                                    </div>
                                </div>
                            </SectionCard>

                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
