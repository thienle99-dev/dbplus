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
            <div className="w-full h-full rounded-xl bg-bg-elevated flex items-center justify-center p-2.5 shadow-inner border border-border-light group-hover:border-accent/20 transition-all duration-300">
                <IconComponent className="w-full h-full text-text-secondary group-hover:text-accent transition-colors duration-300 group-hover:scale-110 transform" />
            </div>
        );
    };

    return (
        <>
            <div
                className="premium-card group relative flex items-center gap-5 p-5 rounded-2xl cursor-pointer hover:bg-bg-hover transition-all duration-300 overflow-hidden border border-border-default hover:border-accent/30"
                onClick={() => onOpen(connection.id)}
                onContextMenu={handleContextMenu}
            >
                {/* Icon Section */}
                <div className="w-14 h-14 flex-shrink-0">
                    {renderIcon()}
                </div>

                {/* Main Info */}
                <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                    <div className="flex items-center gap-3">
                        <h3 className="text-base font-black text-text-primary tracking-tight truncate group-hover:text-accent transition-colors">
                            {connection.name}
                        </h3>
                        {/* Status Tags */}
                        {isLocal && (
                            <span className="shrink-0 text-[9px] px-2 py-0.5 rounded-full bg-success/10 text-success font-black uppercase tracking-widest ring-1 ring-success/20">Local</span>
                        )}
                        {connection.environment === 'production' && (
                            <span className="shrink-0 text-[9px] px-2 py-0.5 rounded-full bg-error/10 text-error font-black uppercase tracking-widest ring-1 ring-error/20">Prod</span>
                        )}
                    </div>

                    {/* Metadata Grid */}
                    <div className="flex items-center gap-4 text-xs text-text-secondary mt-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-text-muted font-bold uppercase tracking-wider text-[10px]">Host</span>
                            <span className="font-mono text-text-primary truncate opacity-80 group-hover:opacity-100 transition-opacity">
                                {connection.host}
                            </span>
                        </div>
                        <div className="w-px h-3 bg-border-strong/50" />
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className="text-text-muted font-bold uppercase tracking-wider text-[10px]">Port</span>
                            <span className="font-mono text-text-primary opacity-80 group-hover:opacity-100 transition-opacity">
                                {connection.port || (connection.type === 'postgres' ? 5432 : 3306)}
                            </span>
                        </div>
                        {connection.username && (
                            <>
                                <div className="w-px h-3 bg-border-strong/50" />
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="text-text-muted font-bold uppercase tracking-wider text-[10px]">User</span>
                                    <span className="font-medium text-text-primary truncate opacity-80 group-hover:opacity-100 transition-opacity">
                                        {connection.username}
                                    </span>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Database Type Label */}
                <div className="hidden sm:flex flex-col items-end gap-0.5 opacity-50 group-hover:opacity-100 transition-opacity">
                    <span className="text-[9px] font-black text-text-muted uppercase tracking-[0.2em]">Engine</span>
                    <span className="text-xs font-bold text-text-secondary uppercase">{connection.type}</span>
                </div>

                {/* Animated Accent Line */}
                <div className="absolute bottom-0 left-0 w-1 h-0 bg-accent group-hover:h-full transition-all duration-300 ease-out opacity-0 group-hover:opacity-100" />
                <div className="absolute bottom-[1px] left-1/2 -translate-x-1/2 w-0 h-[1px] bg-gradient-to-r from-transparent via-accent to-transparent group-hover:w-full transition-all duration-700 opacity-0 group-hover:opacity-100" />
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
