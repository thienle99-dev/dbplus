import React from 'react';
import { Connection } from '../../types';

interface ConnectionItemProps {
    connection: Connection;
    onOpen: (id: string) => void;
    index?: number;
}

const DB_ICONS: Record<Connection['type'], { icon: string; color: string }> = {
    postgres: { icon: 'Pg', color: 'bg-blue-500' },
    mysql: { icon: 'My', color: 'bg-green-500' },
    mongo: { icon: 'Mg', color: 'bg-green-600' },
    redis: { icon: 'Re', color: 'bg-red-500' },
};

export const ConnectionItem: React.FC<ConnectionItemProps> = ({ connection, onOpen, index = 0 }) => {
    const isLocal = connection.host === 'localhost' || connection.host === '127.0.0.1';
    const dbConfig = DB_ICONS[connection.type];

    return (
        <div
            className="px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors border-b border-white/5 last:border-b-0"
            style={{ animationDelay: `${index * 30}ms` }}
            onDoubleClick={() => onOpen(connection.id)}
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
    );
};