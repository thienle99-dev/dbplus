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
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center p-2 shadow-sm ring-1 ring-white/10">
                <IconComponent className={className} />
            </div>
        );
    };

    return (
        <>
            <div
                className="group flex items-center gap-3 p-3 rounded-xl bg-bg-1 shadow-sm hover:shadow-md hover:bg-bg-2 cursor-pointer transition-all duration-200"
                onClick={() => onOpen(connection.id)}
                onContextMenu={handleContextMenu}
            >
                {/* Icon */}
                <div className="shrink-0">
                    {renderIcon()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-text-primary truncate leading-none mb-0.5">
                            {connection.name}
                        </span>
                        {isLocal && (
                            <span className="text-xs font-semibold text-green-500 tracking-wide uppercase">(local)</span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-text-muted truncate">
                        <span className="truncate">{connection.host}</span>
                        {connection.port && <span className="opacity-50">:{connection.port}</span>}
                    </div>
                </div>
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
