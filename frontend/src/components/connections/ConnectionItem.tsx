import React from 'react';
import { Connection } from '../../types';
import { ContextMenu, ContextMenuItem, ContextMenuSeparator } from '../ui/CustomContextMenu';
import { PostgresIcon, MysqlIcon, ClickHouseIcon, SqliteIcon, MongoIcon, RedisIcon, AmazonRedshiftIcon, MariaDBIcon, SQLServerIcon, CassandraIcon, BigQueryIcon, LibSQLIcon, DuckDBIcon, OracleIcon, CockroachDBIcon, SnowflakeIcon, CouchbaseIcon, TiDBIcon, DatabaseIcon } from '../icons/DatabaseIcons';

import { useConnectionStore } from '../../store/connectionStore';
import { connectionApi } from '../../services/connectionApi';
import { useToast } from '../../context/ToastContext';
import CreateDatabaseModal from './CreateDatabaseModal';
import { useDialog } from '../../context/DialogContext';

interface ConnectionItemProps {
    connection: Connection;
    onOpen: (id: string) => void;
    onEdit?: (connection: Connection) => void;
    index?: number;
}

export const ConnectionItem: React.FC<ConnectionItemProps> = ({ connection, onOpen, onEdit }) => {
    const { deleteConnection, createConnection, setSortOption } = useConnectionStore();
    const isLocal = connection.type === 'sqlite' || connection.host === 'localhost' || connection.host === '127.0.0.1';
    const { showToast } = useToast();
    const dialog = useDialog();

    // UI State
    const [menuPosition, setMenuPosition] = React.useState<{ x: number; y: number } | null>(null);

    // Expansion State
    const [createDbOpen, setCreateDbOpen] = React.useState(false);

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
        const confirmed = await dialog.confirm({
            title: 'Delete Connection',
            message: `Are you sure you want to delete "${connection.name}"? This action cannot be undone.`,
            confirmLabel: 'Delete',
            variant: 'destructive'
        });

        if (confirmed) {
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

    const handleOpenCreateDatabase = async () => {
        if (connection.type !== 'postgres') {
            showToast('Create database is currently supported for Postgres only', 'info');
            setMenuPosition(null);
            return;
        }
        setCreateDbOpen(true);
        setMenuPosition(null);
    };

    const handleCreateSchema = async () => {
        if (connection.type !== 'postgres') {
            showToast('Create schema is currently supported for Postgres only', 'info');
            setMenuPosition(null);
            return;
        }

        const name = (await dialog.prompt({
            title: 'Create Schema',
            message: `Enter name for the new schema in database "${connection.database}":`,
            placeholder: 'e.g. public_v2',
            confirmLabel: 'Create'
        }) || '').trim();

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

    const renderIcon = () => {
        const className = "w-full h-full object-contain";
        let IconComponent = DatabaseIcon;

        switch (connection.type) {
            case 'postgres': IconComponent = PostgresIcon; break;
            case 'mysql': IconComponent = MysqlIcon; break;
            case 'mariadb': IconComponent = MariaDBIcon; break;
            case 'mongo': IconComponent = MongoIcon; break;
            case 'redis': IconComponent = RedisIcon; break;
            case 'sqlite': IconComponent = SqliteIcon; break;
            case 'sqlserver': IconComponent = SQLServerIcon; break;
            case 'oracle': IconComponent = OracleIcon; break;
            case 'clickhouse': IconComponent = ClickHouseIcon; break;
            case 'snowflake': IconComponent = SnowflakeIcon; break;
            case 'redshift': IconComponent = AmazonRedshiftIcon; break;
            case 'cassandra': IconComponent = CassandraIcon; break;
            case 'bigquery': IconComponent = BigQueryIcon; break;
            case 'libsql': IconComponent = LibSQLIcon; break;
            case 'duckdb': IconComponent = DuckDBIcon; break;
            case 'cockroach': IconComponent = CockroachDBIcon; break;
            case 'couchbase': IconComponent = CouchbaseIcon; break;
            case 'tidb': IconComponent = TiDBIcon; break;
        }

        return (
            <div className="w-10 h-10 flex-shrink-0 rounded-full bg-white flex items-center justify-center p-2 shadow-sm ring-1 ring-white/10">
                <IconComponent className={className} />
            </div>
        );
    };

    return (
        <>
            <div
                className="group relative flex items-center gap-4 p-4 rounded-2xl bg-bg-2/40 hover:bg-bg-2/60 border border-white/[0.03] hover:border-white/[0.08] cursor-pointer transition-all duration-300 shadow-lg shadow-black/5"
                onClick={() => onOpen(connection.id)}
                onContextMenu={handleContextMenu}
            >
                {/* Status Bar */}
                <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-3/5 rounded-r-full shadow-[2px_0_10px_rgba(0,0,0,0.3)] transition-all group-hover:h-3/4 ${connection.status_color || 'bg-accent'}`} />

                {/* Icon */}
                <div className="shrink-0 ml-1">
                    <div className="w-11 h-11 flex-shrink-0 rounded-full bg-white flex items-center justify-center p-2 shadow-inner ring-1 ring-black/5">
                        {renderIcon()}
                    </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                        <span className="text-[15px] font-semibold text-text-primary tracking-tight">
                            {connection.name}
                        </span>
                        {isLocal && (
                            <span className="text-[11px] font-bold text-[#22c55e] tracking-wide uppercase">(LOCAL)</span>
                        )}
                        {connection.environment && connection.environment !== 'development' && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${connection.environment === 'production' ? 'bg-error/20 text-error' : 'bg-accent/20 text-accent'
                                }`}>
                                {connection.environment}
                            </span>
                        )}
                        {connection.safe_mode_level !== undefined && connection.safe_mode_level > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider bg-yellow-500/20 text-yellow-500">
                                {connection.safe_mode_level === 1 ? 'SAFE' : 'STRICT'}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center h-5 gap-3 mt-1 text-xs text-text-muted">
                        <div className="flex items-center h-full">
                            <span className="text-[11px] font-bold uppercase text-accent tracking-wide leading-none">
                                {connection.type}
                            </span>
                        </div>

                        <div className="w-px h-3 bg-border-default/40" />

                        <div className="flex items-center h-full min-w-0">
                            <span className="truncate hover:text-text-primary transition-colors leading-none">
                                {connection.host}
                                {connection.port && <span className="text-text-muted/50">:{connection.port}</span>}
                            </span>
                        </div>

                        {connection.database && (
                            <>
                                <div className="w-px h-3 bg-border-default/40" />
                                <div className="flex items-center h-full min-w-0">
                                    <span className="text-text-primary truncate font-medium group-hover:text-accent transition-colors leading-none">
                                        {connection.database}
                                    </span>
                                </div>
                            </>
                        )}

                        {connection.tags && (
                            <div className="flex gap-1.5 ml-auto overflow-hidden shrink-0 h-full items-center">
                                {connection.tags.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
                                    <span key={tag} className="px-1.5 py-0.5 bg-bg-3/50 border border-border-subtle/30 rounded text-[9px] text-text-secondary whitespace-nowrap leading-none flex items-center">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Actions Hidden by Default, Shown on Hover if needed, but the image is clean */}
            </div>

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

                    <ContextMenuItem onClick={() => handleSort('name')}>Sort by Name</ContextMenuItem>
                    <ContextMenuItem onClick={() => handleSort('type')}>Sort by Type</ContextMenuItem>

                    <ContextMenuSeparator />

                    <ContextMenuItem danger onClick={handleDelete}>Delete</ContextMenuItem>
                </ContextMenu>
            )}

            <CreateDatabaseModal
                open={createDbOpen}
                onOpenChange={setCreateDbOpen}
                connectionId={connection.id}
                onCreated={() => {
                    // Databases not shown inline, so no need to refresh list
                }}
            />
        </>
    );
};
