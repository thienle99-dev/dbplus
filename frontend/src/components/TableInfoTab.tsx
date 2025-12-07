import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { Info, Code, Key, Database, Plus, X, Save, Copy } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import CodeMirror from '@uiw/react-codemirror';
import { sql } from '@codemirror/lang-sql';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView } from '@codemirror/view';
import { useSettingsStore } from '../store/settingsStore';
import ConstraintsSection from './ConstraintsSection';
import TableStatistics from './TableStatistics';
import ColumnsDetailsTable from './ColumnsDetailsTable';

interface TableInfoTabProps {
    schema?: string;
    table?: string;
}

interface IndexInfo {
    name: string;
    columns: string[];
    is_unique: boolean;
    is_primary: boolean;
    algorithm?: string;
    condition?: string;
    include?: string[];
    comment?: string;
}

interface TableColumn {
    name: string;
    data_type: string;
    is_nullable: boolean;
    default_value: string | null;
    is_primary_key: boolean;
}

interface ForeignKey {
    constraint_name: string;
    column_name: string;
    foreign_schema: string;
    foreign_table: string;
    foreign_column: string;
    update_rule: string;
    delete_rule: string;
}

interface CheckConstraint {
    constraint_name: string;
    check_clause: string;
}

interface UniqueConstraint {
    constraint_name: string;
    columns: string[];
}

interface TableConstraints {
    foreign_keys: ForeignKey[];
    check_constraints: CheckConstraint[];
    unique_constraints: UniqueConstraint[];
}

interface TableStats {
    row_count: number | null;
    table_size: number | null;
    index_size: number | null;
    total_size: number | null;
    created_at: string | null;
    last_modified: string | null;
}

export default function TableInfoTab({ schema: schemaProp, table: tableProp }: TableInfoTabProps) {
    const params = useParams();
    const schema = schemaProp || params.schema;
    const table = tableProp || params.table;
    const connectionId = params.connectionId;
    const [sqlDefinition, setSqlDefinition] = useState<string>('');
    const [indexes, setIndexes] = useState<IndexInfo[]>([]);
    const [columns, setColumns] = useState<TableColumn[]>([]);
    const [loading, setLoading] = useState(false);
    const [showNewIndex, setShowNewIndex] = useState(false);
    const [newIndexName, setNewIndexName] = useState('');
    const [newIndexColumns, setNewIndexColumns] = useState<string[]>([]);
    const [newIndexUnique, setNewIndexUnique] = useState(false);
    const [newIndexAlgorithm, setNewIndexAlgorithm] = useState('BTREE');
    const [newIndexCondition, setNewIndexCondition] = useState('');
    const [newIndexInclude, setNewIndexInclude] = useState<string[]>([]);
    const [newIndexComment, setNewIndexComment] = useState('');
    const [creating, setCreating] = useState(false);
    const [constraints, setConstraints] = useState<TableConstraints | null>(null);
    const [statistics, setStatistics] = useState<TableStats | null>(null);
    const [loadingStatistics, setLoadingStatistics] = useState(false);
    const { showToast } = useToast();
    const { theme } = useSettingsStore();

    const codeMirrorTheme = useMemo(() => {
        let effectiveTheme = theme;
        if (theme === 'system') {
            effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return effectiveTheme === 'dark' || effectiveTheme === 'midnight' ? oneDark : undefined;
    }, [theme]);

    useEffect(() => {
        if (!connectionId || !schema || !table) return;

        const fetchTableInfo = async () => {
            setLoading(true);
            try {
                // Fetch columns for SQL definition
                const response = await api.get(
                    `/api/connections/${connectionId}/columns?schema=${schema}&table=${table}`
                );

                const fetchedColumns = response.data;
                setColumns(fetchedColumns);

                // Build CREATE TABLE statement
                const columnDefs = fetchedColumns.map((col: any) => {
                    let def = `  "${col.name}" ${col.data_type}`;
                    if (!col.is_nullable) def += ' NOT NULL';
                    if (col.default_value) def += ` DEFAULT ${col.default_value}`;
                    return def;
                }).join(',\n');

                const pkColumns = fetchedColumns
                    .filter((col: any) => col.is_primary_key)
                    .map((col: any) => `"${col.name}"`)
                    .join(', ');

                let sql = `CREATE TABLE "${schema}"."${table}" (\n${columnDefs}`;
                if (pkColumns) {
                    sql += `,\n  PRIMARY KEY (${pkColumns})`;
                }
                sql += '\n);';

                setSqlDefinition(sql);

                // Extract index information from columns
                const indexMap = new Map<string, IndexInfo>();

                // Add primary key index
                if (pkColumns) {
                    indexMap.set(`${table}_pkey`, {
                        name: `${table}_pkey`,
                        columns: fetchedColumns.filter((col: any) => col.is_primary_key).map((col: any) => col.name),
                        is_unique: true,
                        is_primary: true,
                    });
                }

                setIndexes(Array.from(indexMap.values()));

                // Fetch constraints
                fetchConstraints();

                // Fetch statistics
                fetchStatistics();
            } catch (err) {
                console.error('Failed to fetch table info:', err);
                setSqlDefinition('-- Failed to load table definition');
            } finally {
                setLoading(false);
            }
        };

        const fetchConstraints = async () => {
            try {
                const response = await api.get(
                    `/api/connections/${connectionId}/constraints?schema=${schema}&table=${table}`
                );
                setConstraints(response.data);
            } catch (err) {
                console.error('Failed to fetch constraints:', err);
                setConstraints({ foreign_keys: [], check_constraints: [], unique_constraints: [] });
            }
        };

        const fetchStatistics = async () => {
            setLoadingStatistics(true);
            try {
                const response = await api.get(
                    `/api/connections/${connectionId}/table-stats?schema=${schema}&table=${table}`
                );
                setStatistics(response.data);
            } catch (err) {
                console.error('Failed to fetch statistics:', err);
                setStatistics({
                    row_count: null,
                    table_size: null,
                    index_size: null,
                    total_size: null,
                    created_at: null,
                    last_modified: null,
                });
            } finally {
                setLoadingStatistics(false);
            }
        };

        fetchTableInfo();
    }, [connectionId, schema, table]);


    const handleCreateIndex = async () => {
        if (!newIndexName.trim() || newIndexColumns.length === 0) {
            showToast('Please provide index name and select at least one column', 'error');
            return;
        }

        setCreating(true);
        try {
            const indexType = newIndexUnique ? 'UNIQUE INDEX' : 'INDEX';
            const columnList = newIndexColumns.map(col => `"${col}"`).join(', ');

            // Build SQL with optional clauses
            let sql = `CREATE ${indexType} "${newIndexName}" ON "${schema}"."${table}"`;

            // Add USING clause for algorithm (PostgreSQL)
            if (newIndexAlgorithm && newIndexAlgorithm !== 'BTREE') {
                sql += ` USING ${newIndexAlgorithm}`;
            }

            sql += ` (${columnList})`;

            // Add INCLUDE clause if specified (PostgreSQL 11+)
            if (newIndexInclude.length > 0) {
                const includeList = newIndexInclude.map(col => `"${col}"`).join(', ');
                sql += ` INCLUDE (${includeList})`;
            }

            // Add WHERE clause for partial index
            if (newIndexCondition.trim()) {
                sql += ` WHERE ${newIndexCondition}`;
            }

            sql += ';';

            // Add comment if specified
            if (newIndexComment.trim()) {
                sql += `\nCOMMENT ON INDEX "${newIndexName}" IS '${newIndexComment.replace(/'/g, "''")}';`;
            }

            await api.post(`/api/connections/${connectionId}/query`, {
                query: sql,
            });

            showToast('Index created successfully', 'success');

            // Refresh indexes
            const newIndex: IndexInfo = {
                name: newIndexName,
                columns: newIndexColumns,
                is_unique: newIndexUnique,
                is_primary: false,
                algorithm: newIndexAlgorithm,
                condition: newIndexCondition || undefined,
                include: newIndexInclude.length > 0 ? newIndexInclude : undefined,
                comment: newIndexComment || undefined,
            };
            setIndexes([...indexes, newIndex]);

            // Reset form
            setShowNewIndex(false);
            setNewIndexName('');
            setNewIndexColumns([]);
            setNewIndexUnique(false);
            setNewIndexAlgorithm('BTREE');
            setNewIndexCondition('');
            setNewIndexInclude([]);
            setNewIndexComment('');
        } catch (err: any) {
            console.error('Failed to create index:', err);
            showToast(err.response?.data?.error || 'Failed to create index', 'error');
        } finally {
            setCreating(false);
        }
    };

    const toggleColumn = (columnName: string) => {
        if (newIndexColumns.includes(columnName)) {
            setNewIndexColumns(newIndexColumns.filter(c => c !== columnName));
        } else {
            setNewIndexColumns([...newIndexColumns, columnName]);
        }
    };

    // Auto-generate index name based on selected columns
    useEffect(() => {
        if (newIndexColumns.length > 0 && !newIndexName) {
            const columnPart = newIndexColumns.join('_');
            const generatedName = `idx_${columnPart}`;
            setNewIndexName(generatedName);
        }
    }, [newIndexColumns, newIndexName]);

    if (loading) {
        return <div className="p-8 text-text-secondary">Loading table info...</div>;
    }

    if (!schema || !table) {
        return <div className="p-8 text-text-secondary">Select a table to view info</div>;
    }

    return (
        <div className="flex flex-col h-full overflow-auto">
            <div className="p-3 md:p-4 border-b border-border bg-bg-1">
                <h3 className="text-xs md:text-sm font-medium text-text-primary flex items-center gap-2">
                    <Info size={14} className="md:w-4 md:h-4" />
                    <span className="truncate">Table Information: {schema}.{table}</span>
                </h3>
            </div>

            <div className="flex-1 p-3 md:p-4 space-y-3 md:space-y-4">
                {/* SQL Definition */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <Code size={12} className="md:w-3.5 md:h-3.5 text-text-secondary" />
                            <h4 className="text-[10px] md:text-xs font-medium text-text-secondary uppercase">SQL Definition</h4>
                        </div>
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(sqlDefinition);
                                showToast('SQL copied to clipboard', 'success');
                            }}
                            className="flex items-center gap-1 px-2 py-1 text-[10px] md:text-xs bg-bg-2 hover:bg-bg-3 text-text-secondary hover:text-text-primary rounded transition-colors"
                            title="Copy SQL to clipboard"
                        >
                            <Copy size={12} />
                        </button>
                    </div>
                    <div className="bg-bg-0 border border-border rounded overflow-hidden">
                        <CodeMirror
                            value={sqlDefinition}
                            height="auto"
                            extensions={[
                                sql(),
                                EditorView.editable.of(false),
                                ...(codeMirrorTheme ? [codeMirrorTheme] : [])
                            ]}
                            basicSetup={{
                                lineNumbers: true,
                                foldGutter: false,
                                highlightActiveLineGutter: false,
                                highlightActiveLine: false,
                            }}
                            className="text-[10px] md:text-xs"
                        />
                    </div>
                </div>

                {/* Indexes */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <Key size={12} className="md:w-3.5 md:h-3.5 text-text-secondary" />
                            <h4 className="text-[10px] md:text-xs font-medium text-text-secondary uppercase">Indexes</h4>
                        </div>
                        <button
                            onClick={() => setShowNewIndex(!showNewIndex)}
                            className="flex items-center gap-1 px-2 py-1 text-[10px] md:text-xs bg-accent hover:bg-blue-600 text-white rounded transition-colors"
                            title="Add new index"
                        >
                            <Plus size={12} />
                            Index
                        </button>
                    </div>

                    {/* New Index Form */}
                    {showNewIndex && (
                        <div className="mb-3 p-2 md:p-3 bg-bg-2 border border-accent/30 rounded space-y-2">
                            <div className="flex items-center justify-between">
                                <h5 className="text-[10px] md:text-xs font-medium text-accent">Create New Index</h5>
                                <button
                                    onClick={() => {
                                        setShowNewIndex(false);
                                        setNewIndexName('');
                                        setNewIndexColumns([]);
                                        setNewIndexUnique(false);
                                        setNewIndexAlgorithm('BTREE');
                                        setNewIndexCondition('');
                                        setNewIndexInclude([]);
                                        setNewIndexComment('');
                                    }}
                                    className="p-0.5 hover:bg-bg-3 rounded text-text-secondary"
                                >
                                    <X size={12} />
                                </button>
                            </div>

                            <div className="space-y-3">
                                {/* Columns Selection */}
                                <div>
                                    <label className="text-[10px] md:text-xs text-text-secondary block mb-1">
                                        Columns <span className="text-accent">*</span>
                                    </label>

                                    {/* Selected columns as tags */}
                                    <div className="min-h-[32px] bg-bg-0 border border-border rounded px-2 py-1 mb-2 flex flex-wrap gap-1 items-center">
                                        {newIndexColumns.length > 0 ? (
                                            newIndexColumns.map((colName) => (
                                                <span
                                                    key={colName}
                                                    className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] md:text-[10px] bg-accent text-white rounded"
                                                >
                                                    {colName}
                                                    <button
                                                        onClick={() => toggleColumn(colName)}
                                                        className="hover:bg-white/20 rounded"
                                                    >
                                                        <X size={10} />
                                                    </button>
                                                </span>
                                            ))
                                        ) : (
                                            <span className="text-text-secondary text-[10px] md:text-xs">Select columns...</span>
                                        )}
                                    </div>

                                    {/* Available columns as clickable tags */}
                                    <div className="flex flex-wrap gap-1">
                                        {columns
                                            .filter(col => !newIndexColumns.includes(col.name))
                                            .map((col) => (
                                                <button
                                                    key={col.name}
                                                    type="button"
                                                    onClick={() => toggleColumn(col.name)}
                                                    className="px-2 py-0.5 text-[9px] md:text-[10px] bg-bg-2 text-text-secondary hover:bg-bg-3 hover:text-text-primary rounded transition-colors border border-border"
                                                >
                                                    + {col.name}
                                                </button>
                                            ))}
                                    </div>
                                </div>

                                {/* Index Name - Auto-generated but editable */}
                                <div>
                                    <label className="text-[10px] md:text-xs text-text-secondary block mb-1">
                                        Index Name <span className="text-accent">*</span>
                                        <span className="text-text-secondary/50 ml-1">(auto-generated)</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={newIndexName}
                                        onChange={(e) => setNewIndexName(e.target.value)}
                                        placeholder="idx_column_name"
                                        className="w-full bg-bg-0 border border-border rounded px-2 py-1 text-[10px] md:text-xs text-text-primary font-mono focus:border-accent focus:outline-none"
                                    />
                                </div>

                                {/* Algorithm Selection */}
                                <div>
                                    <label className="text-[10px] md:text-xs text-text-secondary block mb-1">Index Algorithm</label>
                                    <select
                                        value={newIndexAlgorithm}
                                        onChange={(e) => setNewIndexAlgorithm(e.target.value)}
                                        className="w-full bg-bg-0 border border-border rounded px-2 py-1 text-[10px] md:text-xs text-text-primary focus:border-accent focus:outline-none"
                                    >
                                        <option value="BTREE">BTREE</option>
                                        <option value="HASH">HASH</option>
                                        <option value="GIST">GIST</option>
                                        <option value="GIN">GIN</option>
                                        <option value="BRIN">BRIN</option>
                                    </select>
                                </div>

                                {/* Include Columns (for covering index) */}
                                <div>
                                    <label className="text-[10px] md:text-xs text-text-secondary block mb-1">
                                        Include Columns <span className="text-text-secondary/50">(optional, for covering index)</span>
                                    </label>

                                    {/* Selected include columns */}
                                    <div className="min-h-[28px] bg-bg-0 border border-border rounded px-2 py-1 mb-1 flex flex-wrap gap-1 items-center">
                                        {newIndexInclude.length > 0 ? (
                                            newIndexInclude.map((colName) => (
                                                <span
                                                    key={colName}
                                                    className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] md:text-[10px] bg-blue-500/20 text-blue-400 rounded"
                                                >
                                                    {colName}
                                                    <button
                                                        onClick={() => setNewIndexInclude(newIndexInclude.filter(c => c !== colName))}
                                                        className="hover:bg-white/20 rounded"
                                                    >
                                                        <X size={10} />
                                                    </button>
                                                </span>
                                            ))
                                        ) : (
                                            <span className="text-text-secondary/50 text-[10px]">No include columns</span>
                                        )}
                                    </div>

                                    {/* Available columns for include */}
                                    <div className="flex flex-wrap gap-1">
                                        {columns
                                            .filter(col => !newIndexColumns.includes(col.name) && !newIndexInclude.includes(col.name))
                                            .map((col) => (
                                                <button
                                                    key={col.name}
                                                    type="button"
                                                    onClick={() => setNewIndexInclude([...newIndexInclude, col.name])}
                                                    className="px-2 py-0.5 text-[9px] md:text-[10px] bg-bg-2 text-text-secondary hover:bg-blue-500/10 hover:text-blue-400 rounded transition-colors border border-border"
                                                >
                                                    + {col.name}
                                                </button>
                                            ))}
                                    </div>
                                </div>

                                {/* Condition (for partial index) */}
                                <div>
                                    <label className="text-[10px] md:text-xs text-text-secondary block mb-1">
                                        Condition <span className="text-text-secondary/50">(optional, for partial index)</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={newIndexCondition}
                                        onChange={(e) => setNewIndexCondition(e.target.value)}
                                        placeholder="e.g., status = 'active'"
                                        className="w-full bg-bg-0 border border-border rounded px-2 py-1 text-[10px] md:text-xs text-text-primary font-mono focus:border-accent focus:outline-none"
                                    />
                                </div>

                                {/* Comment */}
                                <div>
                                    <label className="text-[10px] md:text-xs text-text-secondary block mb-1">
                                        Comment <span className="text-text-secondary/50">(optional)</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={newIndexComment}
                                        onChange={(e) => setNewIndexComment(e.target.value)}
                                        placeholder="Index description..."
                                        className="w-full bg-bg-0 border border-border rounded px-2 py-1 text-[10px] md:text-xs text-text-primary focus:border-accent focus:outline-none"
                                    />
                                </div>

                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="unique-index"
                                        checked={newIndexUnique}
                                        onChange={(e) => setNewIndexUnique(e.target.checked)}
                                        className="w-3 h-3"
                                    />
                                    <label htmlFor="unique-index" className="text-[10px] md:text-xs text-text-secondary">
                                        Unique Index
                                    </label>
                                </div>

                                <div className="flex gap-2 pt-1">
                                    <button
                                        onClick={handleCreateIndex}
                                        disabled={creating || !newIndexName.trim() || newIndexColumns.length === 0}
                                        className="flex items-center gap-1 px-3 py-1 bg-accent hover:bg-blue-600 text-white rounded text-[10px] md:text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Save size={11} />
                                        Create
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowNewIndex(false);
                                            setNewIndexName('');
                                            setNewIndexColumns([]);
                                            setNewIndexUnique(false);
                                            setNewIndexAlgorithm('BTREE');
                                            setNewIndexCondition('');
                                            setNewIndexInclude([]);
                                            setNewIndexComment('');
                                        }}
                                        className="px-3 py-1 bg-bg-3 hover:bg-bg-1 text-text-secondary rounded text-[10px] md:text-xs"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {indexes.length > 0 ? (
                        <div className="bg-bg-0 border border-border rounded overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-[10px] md:text-xs">
                                    <thead className="bg-bg-1">
                                        <tr>
                                            <th className="border-b border-border px-2 md:px-3 py-1.5 md:py-2 text-left font-medium text-text-secondary whitespace-nowrap">Name</th>
                                            <th className="border-b border-border px-2 md:px-3 py-1.5 md:py-2 text-left font-medium text-text-secondary whitespace-nowrap">Algorithm</th>
                                            <th className="border-b border-border px-2 md:px-3 py-1.5 md:py-2 text-left font-medium text-text-secondary whitespace-nowrap">Unique</th>
                                            <th className="border-b border-border px-2 md:px-3 py-1.5 md:py-2 text-left font-medium text-text-secondary whitespace-nowrap">Columns</th>
                                            <th className="border-b border-border px-2 md:px-3 py-1.5 md:py-2 text-left font-medium text-text-secondary whitespace-nowrap">Condition</th>
                                            <th className="border-b border-border px-2 md:px-3 py-1.5 md:py-2 text-left font-medium text-text-secondary whitespace-nowrap">Include</th>
                                            <th className="border-b border-border px-2 md:px-3 py-1.5 md:py-2 text-left font-medium text-text-secondary whitespace-nowrap">Comment</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {indexes.map((index) => (
                                            <tr key={index.name} className="hover:bg-bg-1/50">
                                                <td className="border-b border-border px-2 md:px-3 py-1.5 md:py-2 text-text-primary font-mono break-all">{index.name}</td>
                                                <td className="border-b border-border px-2 md:px-3 py-1.5 md:py-2 text-text-primary">
                                                    <span className="text-[9px] md:text-xs bg-bg-2 text-text-secondary px-1.5 md:px-2 py-0.5 rounded whitespace-nowrap inline-block">
                                                        {index.algorithm || 'BTREE'}
                                                    </span>
                                                </td>
                                                <td className="border-b border-border px-2 md:px-3 py-1.5 md:py-2">
                                                    {index.is_primary ? (
                                                        <span className="text-[9px] md:text-xs bg-accent/20 text-accent px-1.5 md:px-2 py-0.5 rounded whitespace-nowrap inline-block">PRIMARY</span>
                                                    ) : index.is_unique ? (
                                                        <span className="text-[9px] md:text-xs bg-blue-500/20 text-blue-400 px-1.5 md:px-2 py-0.5 rounded whitespace-nowrap inline-block">TRUE</span>
                                                    ) : (
                                                        <span className="text-[9px] md:text-xs bg-bg-2 text-text-secondary px-1.5 md:px-2 py-0.5 rounded whitespace-nowrap inline-block">FALSE</span>
                                                    )}
                                                </td>
                                                <td className="border-b border-border px-2 md:px-3 py-1.5 md:py-2 text-text-primary font-mono text-[9px] md:text-xs">{index.columns.join(', ')}</td>
                                                <td className="border-b border-border px-2 md:px-3 py-1.5 md:py-2 text-text-secondary text-[9px] md:text-xs font-mono">{index.condition || 'EMPTY'}</td>
                                                <td className="border-b border-border px-2 md:px-3 py-1.5 md:py-2 text-text-secondary text-[9px] md:text-xs font-mono">{index.include?.join(', ') || 'EMPTY'}</td>
                                                <td className="border-b border-border px-2 md:px-3 py-1.5 md:py-2 text-text-secondary text-[9px] md:text-xs">{index.comment || 'NULL'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 text-center text-text-secondary text-xs">
                            No indexes found
                        </div>
                    )
                    }
                </div>

                {/* Columns Details */}
                {columns.length > 0 && constraints && (
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Database size={12} className="md:w-3.5 md:h-3.5 text-text-secondary" />
                            <h4 className="text-[10px] md:text-xs font-medium text-text-secondary uppercase">
                                Columns ({columns.length})
                            </h4>
                        </div>
                        <ColumnsDetailsTable
                            columns={columns}
                            foreignKeys={constraints.foreign_keys}
                            indexes={indexes}
                        />
                    </div>
                )}

                {/* Constraints */}
                {constraints && (
                    <div>
                        <ConstraintsSection
                            foreignKeys={constraints.foreign_keys}
                            checkConstraints={constraints.check_constraints}
                            uniqueConstraints={constraints.unique_constraints}
                        />
                    </div>
                )}

                {/* Table Statistics */}
                {statistics && (
                    <div>
                        <TableStatistics
                            statistics={statistics}
                            onRefresh={async () => {
                                setLoadingStatistics(true);
                                try {
                                    const response = await api.get(
                                        `/api/connections/${connectionId}/table-stats?schema=${schema}&table=${table}`
                                    );
                                    setStatistics(response.data);
                                    showToast('Statistics refreshed', 'success');
                                } catch (err) {
                                    console.error('Failed to refresh statistics:', err);
                                    showToast('Failed to refresh statistics', 'error');
                                } finally {
                                    setLoadingStatistics(false);
                                }
                            }}
                            loading={loadingStatistics}
                        />
                    </div>
                )}

                {/* Table Metadata */}
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Database size={12} className="md:w-3.5 md:h-3.5 text-text-secondary" />
                        <h4 className="text-[10px] md:text-xs font-medium text-text-secondary uppercase">Table Metadata</h4>
                    </div>
                    <div className="bg-bg-0 border border-border rounded p-2 md:p-3 space-y-1.5 md:space-y-2 text-[10px] md:text-xs">
                        <div className="flex justify-between gap-2">
                            <span className="text-text-secondary whitespace-nowrap">Schema:</span>
                            <span className="text-text-primary font-mono break-all text-right">{schema}</span>
                        </div>
                        <div className="flex justify-between gap-2">
                            <span className="text-text-secondary whitespace-nowrap">Table:</span>
                            <span className="text-text-primary font-mono break-all text-right">{table}</span>
                        </div>
                        <div className="flex justify-between gap-2">
                            <span className="text-text-secondary whitespace-nowrap">Full Name:</span>
                            <span className="text-text-primary font-mono break-all text-right">{schema}.{table}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
