import React from 'react';
import { Connection } from '../../types';

interface ConnectionItemProps {
    connection: Connection;
    onOpen: (id: string) => void;
    index?: number;
}

const DB_ICONS: Record<Connection['type'], { icon: string; color: string; gradient: string }> = {
    postgres: { icon: 'Pg', color: 'bg-blue-500', gradient: 'from-blue-500 to-blue-600' },
    mysql: { icon: 'My', color: 'bg-orange-500', gradient: 'from-orange-500 to-orange-600' },
    mongo: { icon: 'Mo', color: 'bg-green-500', gradient: 'from-green-500 to-green-600' },
    redis: { icon: 'Re', color: 'bg-red-500', gradient: 'from-red-500 to-red-600' },
};

export const ConnectionItem: React.FC<ConnectionItemProps> = ({ connection, onOpen, index = 0 }) => {
    const isLocal = connection.host === 'localhost' || connection.host === '127.0.0.1';
    const dbConfig = DB_ICONS[connection.type];

    return (
        <div
            className="px-5 py-4 cursor-pointer border-b border-white/5 last:border-b-0 hover:bg-gradient-to-r hover:from-white/[0.07] hover:to-transparent active:bg-white/10 transition-all duration-200 group relative animate-fadeIn"
            style={{ animationDelay: `${index * 50}ms` }}
            onDoubleClick={() => onOpen(connection.id)}
        >
            {/* Hover glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-blue-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

            <div className="flex items-start gap-4 relative z-10">
                {/* DB Type Icon */}
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${dbConfig.gradient} flex items-center justify-center flex-shrink-0 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300 ring-2 ring-white/10 group-hover:ring-white/20`}>
                    <span className="text-white text-sm font-bold drop-shadow-lg">{dbConfig.icon}</span>
                </div>

                {/* Connection Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                        <h3 className="text-sm font-semibold text-white truncate group-hover:text-blue-400 transition-colors">
                            {connection.name}
                        </h3>
                        {isLocal && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 font-medium border border-green-500/30 animate-pulse-slow">
                                local
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-gray-500 truncate group-hover:text-gray-400 transition-colors">
                        <span className="font-mono">{connection.host}</span>
                        <span className="mx-1.5 text-gray-600">•</span>
                        <span>{connection.database}</span>
                    </p>
                </div>

                {/* Hover indicator */}
                <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 transform group-hover:translate-x-1">
                    <svg className="w-5 h-5 text-gray-500 group-hover:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </div>
            </div>
        </div>
    );
};