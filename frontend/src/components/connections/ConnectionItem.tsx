import React from 'react';
import { Connection } from '../../types';
import { ContextMenu, ContextMenuItem, ContextMenuSeparator, ContextMenuLabel } from '../ui/CustomContextMenu';
import { DATABASE_TYPES } from '../../constants/databaseTypes';
import { PostgresIcon, MysqlIcon, ClickHouseIcon, SqliteIcon, MongoIcon, RedisIcon, AmazonRedshiftIcon, MariaDBIcon, SQLServerIcon, CassandraIcon, BigQueryIcon, LibSQLIcon, DuckDBIcon, OracleIcon, CockroachDBIcon, SnowflakeIcon, CouchbaseIcon, TiDBIcon } from '../icons/DatabaseIcons';

import { useConnectionStore } from '../../store/connectionStore';
import { connectionApi } from '../../services/connectionApi';
import { useToast } from '../../context/ToastContext';
import CreateDatabaseModal from './CreateDatabaseModal';

interface ConnectionItemProps {
    connection: Connection;
    onOpen: (id: string) => void;
    onEdit?: (connection: Connection) => void;
    index?: number;
}

export const ConnectionItem: React.FC<ConnectionItemProps> = ({ connection, onOpen, onEdit, index = 0 }) => {
    const { deleteConnection, createConnection, connections, setSortOption } = useConnectionStore();
    const isLocal = connection.type === 'sqlite' || connection.host === 'localhost' || connection.host === '127.0.0.1';
    const dbType = DATABASE_TYPES.find(t => t.id === connection.type) || DATABASE_TYPES.find(t => t.id === 'postgres')!;
    const { showToast } = useToast();

    // UI State
    const [menuPosition, setMenuPosition] = React.useState<{ x: number; y: number } | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Expansion State
    const [isExpanded, setIsExpanded] = React.useState(false);
    const [databases, setDatabases] = React.useState<string[]>([]);
    const [isLoadingDbs, setIsLoadingDbs] = React.useState(false);
    const [createDbOpen, setCreateDbOpen] = React.useState(false);

    const refreshDatabases = async () => {
        setIsLoadingDbs(true);
        try {
            const dbs = await connectionApi.getDatabases(connection.id);
            setDatabases(dbs);
        } catch (err) {
            console.error("Failed to load databases", err);
            showToast('Failed to load databases', 'error');
        } finally {
            setIsLoadingDbs(false);
        }
    };

    // Lazy load databases on expand
    const handleToggleExpand = async (e: React.MouseEvent) => {
        e.stopPropagation();

        if (!isExpanded && databases.length === 0) {
            await refreshDatabases();
        }
        setIsExpanded(!isExpanded);
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        setMenuPosition({ x: e.clientX, y: e.clientY });
    };

    const handleCopyUrl = () => {
        const url =
            connection.type === 'sqlite'
                ? `sqlite:///${connection.database || ':memory:'}`
                : `${connection.type}://${connection.username || 'user'}:${connection.password ? '****' : ''}@${connection.host}:${connection.port || 5432}/${connection.database}`;
        navigator.clipboard.writeText(url);
        setMenuPosition(null);
    };

    const handleDelete = async () => {
        if (window.confirm('Are you sure you want to delete this connection?')) {
            await deleteConnection(connection.id);
        }
        setMenuPosition(null);
    };

    const handleDuplicate = async () => {
        const { id, ...data } = connection;
        await createConnection({
            ...data,
            name: `${data.name} Copy`
        });
        setMenuPosition(null);
    };

    const handleSort = (field: 'name' | 'type' | 'host') => {
        setSortOption({ field, direction: 'asc' });
        setMenuPosition(null);
    };

    const handleExport = () => {
        const dataStr = JSON.stringify(connections, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "connections.json";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setMenuPosition(null);
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
        setMenuPosition(null);
    };

    const handleOpenCreateDatabase = async () => {
        if (connection.type !== 'postgres') {
            showToast('Create database is currently supported for Postgres only', 'info');
            setMenuPosition(null);
            return;
        }
        setCreateDbOpen(true);
        setMenuPosition(null);
    };

    const handleDropDatabase = async (dbName: string) => {
        if (connection.type !== 'postgres') {
            showToast('Drop database is currently supported for Postgres only', 'info');
            return;
        }

        const confirmName = prompt(`To drop database "${dbName}", type its name to confirm:`);
        if (confirmName !== dbName) {
            if (confirmName !== null) showToast('Database name did not match', 'error');
            return;
        }

        try {
            await connectionApi.dropDatabase(connection.id, dbName);
            showToast(`Database '${dbName}' dropped`, 'success');
            await refreshDatabases();
        } catch (err: any) {
            console.error('Failed to drop database', err);
            showToast(err?.response?.data?.message || err?.response?.data || 'Failed to drop database', 'error');
        }
    };

    const handleCreateSchema = async () => {
        if (connection.type !== 'postgres') {
            showToast('Create schema is currently supported for Postgres only', 'info');
            setMenuPosition(null);
            return;
        }

        const name = (prompt(`Schema name to create (in database "${connection.database}"):`) || '').trim();
        if (!name) {
            setMenuPosition(null);
            return;
        }

        try {
            const result = await connectionApi.createSchema(connection.id, name);
            showToast(result.message || `Schema '${name}' created`, result.success ? 'success' : 'error');
        } catch (err: any) {
            console.error('Failed to create schema', err);
            showToast(err?.response?.data?.message || err?.response?.data || 'Failed to create schema', 'error');
        } finally {
            setMenuPosition(null);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const text = await file.text();
        try {
            const imported = JSON.parse(text) as Connection[];
            if (Array.isArray(imported)) {
                for (const item of imported) {
                    const { id, ...data } = item; // Strip ID
                    await createConnection(data);
                }
            }
        } catch (err) {
            console.error('Failed to import connections', err);
            alert('Failed to import connections: Invalid JSON');
        }
        e.target.value = ''; // Reset
    };

    const renderIcon = () => {
        const className = "w-full h-full drop-shadow-sm";
        switch (connection.type) {
            case 'postgres': return <PostgresIcon className={className} />;
            case 'redshift': return <AmazonRedshiftIcon className={className} />;
            case 'mysql': return <MysqlIcon className={className} />;
            case 'mariadb': return <MariaDBIcon className={className} />;
            case 'sqlserver': return <SQLServerIcon className={className} />;
            case 'cassandra': return <CassandraIcon className={className} />;
            case 'clickhouse': return <ClickHouseIcon className={className} />;
            case 'bigquery': return <BigQueryIcon className={className} />;
            case 'libsql': return <LibSQLIcon className={className} />;
            case 'duckdb': return <DuckDBIcon className={className} />;
            case 'oracle': return <OracleIcon className={className} />;
            case 'cockroach': return <CockroachDBIcon className={className} />;
            case 'snowflake': return <SnowflakeIcon className={className} />;
            case 'couchbase': return <CouchbaseIcon className={className} />;
            case 'tidb': return <TiDBIcon className={className} />;
            case 'sqlite': return <SqliteIcon className={className} />;
            case 'mongo': return <MongoIcon className={className} />;
            case 'redis': return <RedisIcon className={className} />;
            default:
                return (
                    <div className={`w-full h-full rounded-xl ${dbType.color} flex items-center justify-center shadow-sm ring-1 ring-inset ring-black/10`}>
                        <span className="text-white text-sm font-bold">{dbType.abbreviation}</span>
                    </div>
                );
        }
    };

    return (
        <>
            <div
                className="px-4 py-3 cursor-pointer hover:bg-bg-2/70 transition-colors border-b border-border/40 last:border-b-0 select-none group"
                style={{ animationDelay: `${index * 30}ms` }}
                onClick={() => onOpen(connection.id)}
                onContextMenu={handleContextMenu}
            >
                <div className="flex items-center gap-3">
                    {/* Expand Toggle */}
                    <button
                        onClick={handleToggleExpand}
                        className="p-1 rounded-lg hover:bg-bg-3 text-text-secondary hover:text-text-primary transition-colors"
                    >
                        {isExpanded ? (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                        ) : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                        )}
                    </button>

                    {/* DB Type Icon */}
                    <div className="w-10 h-10 flex-shrink-0">
                        {renderIcon()}
                    </div>

                    {/* Connection Info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                            <h3 className="text-sm font-medium text-text-primary truncate">
                                {connection.name}
                            </h3>
                            {isLocal && (
                                <span className="text-xs text-success font-medium">(local)</span>
                            )}
                        </div>
                        <p className="text-xs text-text-muted truncate">
                            {connection.host} : {connection.database}
                        </p>
                    </div>
                </div>

                {/* Inline Database List */}
                {isExpanded && (
                    <div className="mt-2 pl-[3.25rem] border-l-2 border-border/40 ml-5">
                        {isLoadingDbs ? (
                            <div className="py-1 px-2 text-xs text-text-muted italic">Loading databases...</div>
                        ) : (
                            <div className="flex flex-col">
                                {databases.length > 0 ? (
                                    databases.map(db => (
                                        <div
                                            key={db}
                                            className="flex items-center gap-2 py-1 px-2 hover:bg-bg-2 rounded text-xs text-text-secondary group"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50"><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></svg>
                                            <span className="flex-1 truncate">{db}</span>
                                            {connection.type === 'postgres' && (
                                                <button
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-text-secondary hover:text-error"
                                                    title="Drop database"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        void handleDropDatabase(db);
                                                    }}
                                                >
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /></svg>
                                                </button>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-1 px-2 text-xs text-text-muted italic">No databases found</div>
                                )}
                                {connection.type === 'postgres' && (
                                    <button
                                        className="mt-1 py-1 px-2 text-left text-xs text-accent hover:text-accent-hover hover:bg-bg-2 rounded transition-colors"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            void handleOpenCreateDatabase();
                                        }}
                                    >
                                        + Create database…
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".json"
                onChange={handleFileChange}
            />

            {menuPosition && (
                <ContextMenu
                    x={menuPosition.x}
                    y={menuPosition.y}
                    onClose={() => setMenuPosition(null)}
                >
                    <ContextMenuItem onClick={() => { onOpen(connection.id); setMenuPosition(null); }} className="bg-accent text-white font-medium hover:bg-accent-hover">
                        Connect
                    </ContextMenuItem>

                    <ContextMenuSeparator />

                    <ContextMenuItem onClick={handleOpenCreateDatabase}>Create database...</ContextMenuItem>
                    <ContextMenuItem onClick={handleCreateSchema}>Create schema...</ContextMenuItem>
                    <ContextMenuItem onClick={() => { onEdit?.(connection); setMenuPosition(null); }}>Edit...</ContextMenuItem>
                    <ContextMenuItem onClick={handleDuplicate}>Duplicate</ContextMenuItem>

                    <ContextMenuSeparator />

                    <ContextMenuItem onClick={handleCopyUrl}>Copy as URL</ContextMenuItem>

                    <ContextMenuSeparator />

                    <ContextMenuLabel>Sort By</ContextMenuLabel>
                    <ContextMenuItem onClick={() => handleSort('name')}>Name</ContextMenuItem>
                    <ContextMenuItem onClick={() => handleSort('type')}>Type</ContextMenuItem>
                    <ContextMenuItem onClick={() => handleSort('host')}>Host</ContextMenuItem>

                    <ContextMenuSeparator />

                    <ContextMenuItem onClick={handleImportClick}>Import Connections...</ContextMenuItem>
                    <ContextMenuItem onClick={handleExport}>Export Connections</ContextMenuItem>

                    <ContextMenuSeparator />

                    <ContextMenuItem danger onClick={handleDelete}>Delete</ContextMenuItem>
                </ContextMenu>
            )}

            <CreateDatabaseModal
                open={createDbOpen}
                onOpenChange={setCreateDbOpen}
                connectionId={connection.id}
                onCreated={async () => {
                    await refreshDatabases();
                }}
            />
        </>
    );
};
