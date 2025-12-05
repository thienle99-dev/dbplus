import React, { useState } from 'react';
import { Search } from 'lucide-react';

interface DatabaseType {
    id: string;
    name: string;
    abbreviation: string;
    color: string;
}

const DATABASE_TYPES: DatabaseType[] = [
    { id: 'postgres', name: 'PostgreSQL', abbreviation: 'Pg', color: 'bg-blue-600' },
    { id: 'redshift', name: 'Amazon Redshift', abbreviation: 'Rs', color: 'bg-blue-800' },
    { id: 'mysql', name: 'MySQL', abbreviation: 'Ms', color: 'bg-orange-500' },
    { id: 'mariadb', name: 'MariaDB', abbreviation: 'Mb', color: 'bg-blue-700' },
    { id: 'sqlserver', name: 'SQL Server', abbreviation: 'Ss', color: 'bg-red-600' },
    { id: 'cassandra', name: 'Cassandra', abbreviation: 'Ca', color: 'bg-cyan-600' },
    { id: 'clickhouse', name: 'ClickHouse', abbreviation: 'Ch', color: 'bg-yellow-500' },
    { id: 'bigquery', name: 'BigQuery', abbreviation: 'Bq', color: 'bg-blue-500' },
    { id: 'libsql', name: 'LibSQL', abbreviation: 'Ls', color: 'bg-purple-600' },
    { id: 'd1', name: 'Cloudflare D1', abbreviation: 'D1', color: 'bg-orange-600' },
    { id: 'mongo', name: 'MongoDB', abbreviation: 'Mg', color: 'bg-green-600' },
    { id: 'snowflake', name: 'Snowflake', abbreviation: 'Sf', color: 'bg-cyan-500' },
    { id: 'redis', name: 'Redis', abbreviation: 'Re', color: 'bg-red-500' },
    { id: 'sqlite', name: 'SQLite', abbreviation: 'Sq', color: 'bg-blue-400' },
    { id: 'duckdb', name: 'DuckDB', abbreviation: 'Dk', color: 'bg-yellow-600' },
    { id: 'oracle', name: 'Oracle', abbreviation: 'Or', color: 'bg-red-700' },
    { id: 'cockroach', name: 'CockroachDB', abbreviation: 'Cr', color: 'bg-indigo-600' },
];

interface DatabaseSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (dbType: string) => void;
}

export const DatabaseSelectorModal: React.FC<DatabaseSelectorModalProps> = ({ isOpen, onClose, onSelect }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDb, setSelectedDb] = useState('redis');

    const filteredDatabases = DATABASE_TYPES.filter(db =>
        db.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSelect = () => {
        if (selectedDb) {
            onSelect(selectedDb);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="relative bg-[#1e1e1e] rounded-xl shadow-2xl w-full max-w-4xl mx-4 border border-white/10">
                {/* Header - Search */}
                <div className="p-6 border-b border-white/10">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search for connection... (⌘F)"
                            className="w-full h-10 pl-10 pr-4 bg-[#121212] border border-white/10 rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                    </div>
                </div>

                {/* Database Grid */}
                <div className="p-6 max-h-[500px] overflow-y-auto">
                    <div className="grid grid-cols-6 gap-4">
                        {filteredDatabases.map((db) => (
                            <button
                                key={db.id}
                                onClick={() => setSelectedDb(db.id)}
                                className={`
                  flex flex-col items-center gap-3 p-4 rounded-lg transition-all
                  ${selectedDb === db.id
                                        ? 'border-2 border-blue-500 bg-blue-500/10'
                                        : 'border-2 border-transparent hover:bg-white/5'
                                    }
                `}
                            >
                                {/* Icon Circle */}
                                <div className={`w-12 h-12 rounded-full ${db.color} flex items-center justify-center shadow-lg`}>
                                    <span className="text-white text-sm font-bold">{db.abbreviation}</span>
                                </div>
                                {/* Label */}
                                <span className="text-xs text-gray-300 text-center leading-tight">{db.name}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-white/10">
                    <button
                        onClick={onClose}
                        className="h-9 px-4 bg-[#2a2a2a] border border-[#3a3a3a] text-gray-300 rounded-lg text-sm hover:bg-[#333] transition-colors"
                    >
                        Cancel
                    </button>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            className="h-9 px-4 bg-[#2a2a2a] border border-[#3a3a3a] text-gray-300 rounded-lg text-sm hover:bg-[#333] transition-colors"
                        >
                            Import from URL
                        </button>
                        <button
                            type="button"
                            className="h-9 px-4 bg-[#2a2a2a] border border-[#3a3a3a] text-gray-300 rounded-lg text-sm hover:bg-[#333] transition-colors"
                        >
                            New Group
                        </button>
                        <button
                            onClick={handleSelect}
                            disabled={!selectedDb}
                            className="h-9 px-4 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                        >
                            Create
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
