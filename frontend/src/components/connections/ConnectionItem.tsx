import React from 'react';
import { Connection } from '../../types';
import { ContextMenu, ContextMenuItem, ContextMenuSeparator } from '../ui/CustomContextMenu';

import { useConnectionStore } from '../../store/connectionStore';

interface ConnectionItemProps {
    connection: Connection;
    onOpen: (id: string) => void;
    onEdit?: (connection: Connection) => void;
    index?: number;
}

const DB_ICONS: Record<Connection['type'], { icon: string; color: string }> = {
    postgres: { icon: 'Pg', color: 'bg-blue-500' },
    mysql: { icon: 'My', color: 'bg-green-500' },
    mongo: { icon: 'Mg', color: 'bg-green-600' },
    redis: { icon: 'Re', color: 'bg-red-500' },
};

export const ConnectionItem: React.FC<ConnectionItemProps> = ({ connection, onOpen, onEdit, index = 0 }) => {
    const { deleteConnection, createConnection } = useConnectionStore();
    const isLocal = connection.host === 'localhost' || connection.host === '127.0.0.1';
    const dbConfig = DB_ICONS[connection.type] || DB_ICONS['postgres'];
    const [menuPosition, setMenuPosition] = React.useState<{ x: number; y: number } | null>(null);

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        setMenuPosition({ x: e.clientX, y: e.clientY });
    };

    const handleCopyUrl = () => {
        const url = `${connection.type}://${connection.username || 'user'}:${connection.password ? '****' : ''}@${connection.host}:${connection.port || 5432}/${connection.database}`;
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

    return (
        <>
            <div
                className="px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors border-b border-white/5 last:border-b-0 select-none"
                style={{ animationDelay: `${index * 30}ms` }}
                onDoubleClick={() => onOpen(connection.id)}
                onContextMenu={handleContextMenu}
            >
                <div className="flex items-center gap-3">
                    {/* DB Type Icon */}
                    <div className={`w-10 h-10 rounded-lg ${dbConfig.color} flex items-center justify-center flex-shrink-0 shadow-md`}>
                        <span className="text-white text-sm font-bold">{dbConfig.icon}</span>
                    </div>

                    {/* Connection Info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                            <h3 className="text-sm font-medium text-white truncate">
                                {connection.name}
                            </h3>
                            {isLocal && (
                                <span className="text-xs text-green-400 font-medium">(local)</span>
                            )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">
                            {connection.host} : {connection.database}
                        </p>
                    </div>
                </div>
            </div>

            {menuPosition && (
                <ContextMenu
                    x={menuPosition.x}
                    y={menuPosition.y}
                    onClose={() => setMenuPosition(null)}
                >
                    <ContextMenuItem onClick={() => { onOpen(connection.id); setMenuPosition(null); }} className="bg-blue-600 text-white font-medium hover:bg-blue-700">
                        Connect
                    </ContextMenuItem>

                    <ContextMenuSeparator />

                    <ContextMenuItem hasSubmenu>New</ContextMenuItem>
                    <ContextMenuItem onClick={() => { onEdit?.(connection); setMenuPosition(null); }}>Edit...</ContextMenuItem>
                    <ContextMenuItem onClick={handleDuplicate}>Duplicate</ContextMenuItem>

                    <ContextMenuSeparator />

                    <ContextMenuItem onClick={handleCopyUrl}>Copy as URL</ContextMenuItem>

                    <ContextMenuSeparator />

                    <ContextMenuItem hasSubmenu>Sort By</ContextMenuItem>

                    <ContextMenuSeparator />

                    <ContextMenuItem>Import Connections...</ContextMenuItem>
                    <ContextMenuItem hasSubmenu>Export Connections</ContextMenuItem>

                    <ContextMenuSeparator />

                    <ContextMenuItem danger onClick={handleDelete}>Delete</ContextMenuItem>
                </ContextMenu>
            )}
        </>
    );
};