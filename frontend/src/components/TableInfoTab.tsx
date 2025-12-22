import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { Activity, ChevronDown, Download, Info, RefreshCw, Copy } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import ConstraintsSection from './ConstraintsSection';
import TableStatistics from './TableStatistics';
import ColumnsDetailsTable from './ColumnsDetailsTable';
import SqlDefinitionView from './table-info/SqlDefinitionView';
import IndexesSection from './table-info/IndexesSection';
import TableMetadata from './table-info/TableMetadata';
import TriggersSection from './table-info/TriggersSection';
import TableCommentEditor from './table-info/TableCommentEditor';
import PermissionsSection from './table-info/PermissionsSection';
import StorageBloatSection from './table-info/StorageBloatSection';
import PartitionsSection from './table-info/PartitionsSection';
import DependenciesSection from './table-info/DependenciesSection';
import { generateSqlDefinition } from '../utils/sqlGenerator';
import { extractApiErrorDetails } from '../utils/apiError';
import {
    TableInfoTabProps
} from '../types';
import {
    useColumns,
    useIndexes,
    useConstraints,
    useTableStats,
    useTriggers,
    usePermissions,
    useStorageBloatInfo,
    usePartitions,
    useDependencies,
} from '../hooks/useDatabase';

type InfoTabKey =
    | 'overview'
    | 'columns'
    | 'constraints'
    | 'indexes'
    | 'triggers'
    | 'stats'
    | 'partitions'
    | 'dependencies'
    | 'permissions';

function quoteIdent(s: string) {
    return `"${s.replace(/"/g, '""')}"`;
}

function loadJson<T>(key: string, fallback: T): T {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        return JSON.parse(raw) as T;
    } catch {
        return fallback;
    }
}

export default function TableInfoTab({ schema: schemaProp, table: tableProp }: TableInfoTabProps) {
    const params = useParams();
    const schema = schemaProp || params.schema;
    const table = tableProp || params.table;
    const connectionId = params.connectionId;
    const { showToast } = useToast();
    const storageBaseKey = useMemo(
        () => `dbplus.tableInfo:${connectionId || 'no-conn'}:${schema || ''}.${table || ''}`,
        [connectionId, schema, table],
    );
    const [activeTab, setActiveTab] = useState<InfoTabKey>(() =>
        loadJson<InfoTabKey>(`${storageBaseKey}:activeTab`, 'overview'),
    );
    const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() =>
        loadJson<Record<string, boolean>>(`${storageBaseKey}:collapsed`, {}),
    );

    useEffect(() => {
        localStorage.setItem(`${storageBaseKey}:activeTab`, JSON.stringify(activeTab));
    }, [storageBaseKey, activeTab]);

    useEffect(() => {
        localStorage.setItem(`${storageBaseKey}:collapsed`, JSON.stringify(collapsed));
    }, [storageBaseKey, collapsed]);

    // Data Fetching Hooks
    const columnsQuery = useColumns(connectionId, schema, table);
    const indexesQuery = useIndexes(connectionId, schema, table);
    const constraintsQuery = useConstraints(connectionId, schema, table);
    const statsQuery = useTableStats(connectionId, schema, table);
    const triggersQuery = useTriggers(connectionId, schema, table);
    const permissionsQuery = usePermissions(connectionId, schema, table);
    const storageQuery = useStorageBloatInfo(connectionId, schema, table);
    const partitionsQuery = usePartitions(connectionId, schema, table);
    const dependenciesQuery = useDependencies(connectionId, schema, table);

    const isLoading =
        columnsQuery.isLoading ||
        indexesQuery.isLoading ||
        constraintsQuery.isLoading ||
        statsQuery.isLoading ||
        triggersQuery.isLoading ||
        permissionsQuery.isLoading ||
        storageQuery.isLoading ||
        partitionsQuery.isLoading ||
        dependenciesQuery.isLoading;

    const columns = columnsQuery.data || [];
    const indexes = indexesQuery.data || [];
    const constraints = constraintsQuery.data || null;
    const statistics = statsQuery.data || null;
    const triggers = triggersQuery.data || [];
    const grants = permissionsQuery.data || [];
    const permissionsError = permissionsQuery.error ? extractApiErrorDetails(permissionsQuery.error).message : null;
    const storageError = storageQuery.error ? extractApiErrorDetails(storageQuery.error).message : null;
    const partitionsError = partitionsQuery.error ? extractApiErrorDetails(partitionsQuery.error).message : null;
    const dependenciesError = dependenciesQuery.error ? extractApiErrorDetails(dependenciesQuery.error).message : null;

    const sqlDefinition = generateSqlDefinition(schema || '', table || '', columns, indexes, constraints);

    const handleIndexCreated = () => {
        indexesQuery.refetch();
    };

    const handleRefreshAll = () => {
        columnsQuery.refetch();
        indexesQuery.refetch();
        constraintsQuery.refetch();
        statsQuery.refetch();
        triggersQuery.refetch();
        permissionsQuery.refetch();
        storageQuery.refetch();
        partitionsQuery.refetch();
        dependenciesQuery.refetch();
    };

    if (isLoading && !columns.length) { // Show loading only if no data at all
        return <div className="p-8 text-text-secondary">Loading table info...</div>;
    }

    // Check for critical errors (e.g. connection lost)
    const criticalError = columnsQuery.error || indexesQuery.error || constraintsQuery.error;
    if (criticalError) {
        return (
            <div className="p-8 flex flex-col items-center justify-center text-center">
                <div className="text-error mb-2">Failed to load table information</div>
                <div className="text-text-secondary text-xs mb-4 max-w-sm">
                    {extractApiErrorDetails(criticalError).message || 'Connection might be lost.'}
                </div>
                <button
                    onClick={handleRefreshAll}
                    className="px-4 py-2 bg-bg-2 hover:bg-bg-3 border border-border-light rounded text-sm text-text-primary transition-colors"
                >
                    Retry
                </button>
            </div>
        );
    }

    if (!schema || !table) {
        return <div className="p-8 text-text-secondary">Select a table to view info</div>;
    }

    const Section = ({
        id,
        title,
        children,
        defaultCollapsed = false,
    }: {
        id: string;
        title: string;
        children: ReactNode;
        defaultCollapsed?: boolean;
    }) => {
        const isCollapsed = collapsed[id] ?? defaultCollapsed;
        return (
            <div className="border border-border-light rounded bg-bg-1 overflow-hidden">
                <button
                    type="button"
                    onClick={() => setCollapsed((prev) => ({ ...prev, [id]: !(prev[id] ?? defaultCollapsed) }))}
                    className="w-full flex items-center justify-between px-3 py-2 bg-bg-0 hover:bg-bg-2 transition-colors"
                >
                    <span className="text-[10px] md:text-xs font-medium text-text-secondary uppercase tracking-wide">
                        {title}
                    </span>
                    <ChevronDown
                        size={14}
                        className={`text-text-secondary transition-transform ${isCollapsed ? '-rotate-90' : 'rotate-0'}`}
                    />
                </button>
                {!isCollapsed && <div className="p-3 md:p-4">{children}</div>}
            </div>
        );
    };

    const tabs: Array<{ key: InfoTabKey; label: string }> = [
        { key: 'overview', label: 'Overview' },
        { key: 'columns', label: 'Columns' },
        { key: 'constraints', label: 'Constraints' },
        { key: 'indexes', label: 'Indexes' },
        { key: 'triggers', label: 'Triggers' },
        { key: 'stats', label: 'Stats' },
        { key: 'partitions', label: 'Partitions' },
        { key: 'dependencies', label: 'Dependencies' },
        { key: 'permissions', label: 'Permissions' },
    ];

    return (
        <div className="flex flex-col h-full overflow-auto">
            <div className="px-3 py-2.5 border-b border-border-light bg-bg-1/50 backdrop-blur-sm">
                <h3 className="text-xs font-semibold text-text-primary flex items-center gap-2.5">
                    <div className="p-1 rounded-md bg-accent/10 text-accent">
                        <Info size={14} />
                    </div>
                    <span>Table Information: <span className="text-accent">{schema}.{table}</span></span>
                </h3>
            </div>

            <div className="flex-1 p-3 md:p-4 space-y-3 md:space-y-4">
                {/* Quick Actions Bar */}
                <div className="flex flex-wrap items-center gap-1.5 p-1.5 border border-border-light rounded-lg bg-bg-1/30">
                    <button
                        type="button"
                        onClick={async () => {
                            try {
                                await navigator.clipboard.writeText(sqlDefinition || '');
                                showToast('DDL copied', 'success');
                            } catch {
                                showToast('Failed to copy DDL', 'error');
                            }
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium bg-bg-2 hover:bg-bg-3 text-text-secondary hover:text-text-primary rounded-md border border-border-light/50 transition-all"
                        title="Copy DDL"
                    >
                        <Copy size={13} />
                        Copy DDL
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            const filename = `schema-${schema}.${table}.sql`.replace(/\//g, '_');
                            const blob = new Blob([sqlDefinition || ''], { type: 'text/sql;charset=utf-8' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = filename;
                            a.click();
                            URL.revokeObjectURL(url);
                            showToast('Schema exported', 'success');
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium bg-bg-2 hover:bg-bg-3 text-text-secondary hover:text-text-primary rounded-md border border-border-light/50 transition-all"
                        title="Export schema"
                    >
                        <Download size={13} />
                        Export
                    </button>

                    <button
                        type="button"
                        disabled={!connectionId}
                        onClick={async () => {
                            if (!connectionId) return;
                            try {
                                const analyzeSql =
                                    schema === 'main'
                                        ? `ANALYZE ${quoteIdent(table)};`
                                        : `ANALYZE ${quoteIdent(schema)}.${quoteIdent(table)};`;
                                await api.post(`/api/connections/${connectionId}/execute`, { query: analyzeSql });
                                showToast('Analyze completed', 'success');
                            } catch (err: any) {
                                const msg = extractApiErrorDetails(err).message;
                                showToast(msg || 'Analyze failed', 'error');
                            }
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium bg-bg-2 hover:bg-bg-3 text-text-secondary hover:text-text-primary rounded-md border border-border-light/50 transition-all disabled:opacity-50"
                        title="Analyze table"
                    >
                        <Activity size={13} />
                        Analyze
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            handleRefreshAll();
                            showToast('Refreshed', 'success');
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium bg-bg-2 hover:bg-bg-3 text-text-secondary hover:text-text-primary rounded-md border border-border-light/50 transition-all"
                        title="Refresh all"
                    >
                        <RefreshCw size={13} />
                        Refresh
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex flex-wrap gap-1 p-1 border border-border-light rounded-lg bg-bg-1/30">
                    {tabs.map((t) => (
                        <button
                            key={t.key}
                            type="button"
                            onClick={() => setActiveTab(t.key)}
                            className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border transition-all ${activeTab === t.key
                                ? 'bg-bg-active border-accent/50 text-accent shadow-sm'
                                : 'bg-transparent border-transparent text-text-tertiary hover:text-text-primary hover:bg-bg-2'
                                }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                {activeTab === 'overview' && (
                    <div className="space-y-3 md:space-y-4">
                        <Section id="overview.definition" title="SQL Definition">
                            <SqlDefinitionView
                                schema={schema || ''}
                                table={table || ''}
                                columns={columns}
                                indexes={indexes}
                                constraints={constraints}
                                sqlDefinition={sqlDefinition}
                            />
                        </Section>

                        <Section id="overview.comment" title="Comment">
                            <TableCommentEditor connectionId={connectionId} schema={schema || ''} table={table || ''} />
                        </Section>

                        <Section id="overview.metadata" title="Metadata">
                            <TableMetadata schema={schema || ''} table={table || ''} />
                        </Section>
                    </div>
                )}

                {activeTab === 'columns' && (
                    <Section id="columns.table" title={`Columns (${columns.length})`}>
                        {columns.length > 0 && constraints ? (
                            <ColumnsDetailsTable
                                columns={columns}
                                foreignKeys={constraints.foreign_keys}
                                indexes={indexes}
                                onRefresh={handleRefreshAll}
                            />
                        ) : (
                            <div className="text-xs text-text-secondary">No columns to display.</div>
                        )}
                    </Section>
                )}

                {activeTab === 'constraints' && (
                    <Section id="constraints.table" title="Constraints">
                        {constraints ? (
                            <ConstraintsSection
                                foreignKeys={constraints.foreign_keys}
                                checkConstraints={constraints.check_constraints}
                                uniqueConstraints={constraints.unique_constraints}
                            />
                        ) : (
                            <div className="text-xs text-text-secondary">No constraints to display.</div>
                        )}
                    </Section>
                )}

                {activeTab === 'indexes' && (
                    <Section id="indexes.table" title={`Indexes (${indexes.length})`}>
                        <IndexesSection
                            schema={schema || ''}
                            table={table || ''}
                            columns={columns}
                            indexes={indexes}
                            onIndexCreated={handleIndexCreated}
                        />
                    </Section>
                )}

                {activeTab === 'triggers' && (
                    <Section id="triggers.table" title="Triggers">
                        <TriggersSection triggers={triggers} loading={triggersQuery.isFetching} />
                    </Section>
                )}

                {activeTab === 'stats' && (
                    <div className="space-y-3 md:space-y-4">
                        <Section id="stats.table" title="Statistics">
                            {statistics ? (
                                <TableStatistics
                                    statistics={statistics}
                                    onRefresh={async () => {
                                        await statsQuery.refetch();
                                        showToast('Statistics refreshed', 'success');
                                    }}
                                    loading={statsQuery.isFetching}
                                />
                            ) : (
                                <div className="text-xs text-text-secondary">No statistics available.</div>
                            )}
                        </Section>

                        <Section id="stats.storage" title="Storage & Bloat">
                            <StorageBloatSection
                                connectionId={connectionId}
                                schema={schema || ''}
                                table={table || ''}
                                info={storageQuery.data ?? null}
                                loading={storageQuery.isFetching}
                                error={storageError}
                                onRefresh={() => storageQuery.refetch()}
                            />
                        </Section>
                    </div>
                )}

                {activeTab === 'partitions' && (
                    <Section id="partitions.table" title="Partitions">
                        <PartitionsSection
                            connectionId={connectionId}
                            info={partitionsQuery.data ?? null}
                            loading={partitionsQuery.isFetching}
                            error={partitionsError}
                        />
                    </Section>
                )}

                {activeTab === 'dependencies' && (
                    <Section id="dependencies.table" title="Dependencies">
                        <DependenciesSection
                            dependencies={dependenciesQuery.data ?? null}
                            loading={dependenciesQuery.isFetching}
                            error={dependenciesError}
                        />
                    </Section>
                )}

                {activeTab === 'permissions' && (
                    <Section id="permissions.table" title="Permissions">
                        <PermissionsSection
                            connectionId={connectionId}
                            schema={schema || ''}
                            table={table || ''}
                            grants={grants}
                            loading={permissionsQuery.isFetching}
                            error={permissionsError}
                        />
                    </Section>
                )}
            </div>
        </div>
    );
}
