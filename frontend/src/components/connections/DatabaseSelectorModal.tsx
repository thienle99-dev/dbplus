import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { DatabaseSelectorModalProps } from '../../types';
import { DATABASE_TYPES } from '../../constants/databaseTypes';

export const DatabaseSelectorModal: React.FC<DatabaseSelectorModalProps> = ({ isOpen, onClose, onSelect }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDb, setSelectedDb] = useState('postgres');

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
                        {filteredDatabases.map((db) => {
                            const isSelected = selectedDb === db.id;
                            const isDisabled = !db.isAvailable;

                            return (
                                <button
                                    key={db.id}
                                    onClick={() => {
                                        if (db.isAvailable) {
                                            setSelectedDb(db.id);
                                        }
                                    }}
                                    disabled={isDisabled}
                                    title={isDisabled ? `${db.name} - Coming Soon` : db.name}
                                    className={`
                                        flex flex-col items-center gap-3 p-4 rounded-lg transition-all relative
                                        ${isSelected && db.isAvailable
                                            ? 'border-2 border-blue-500 bg-blue-500/10'
                                            : 'border-2 border-transparent'
                                        }
                                        ${isDisabled
                                            ? 'opacity-60 cursor-not-allowed'
                                            : 'hover:bg-white/5 cursor-pointer'
                                        }
                                    `}
                                >
                                    {/* Icon Circle */}
                                    <div className={`w-12 h-12 rounded-full ${db.color} flex items-center justify-center shadow-lg ${isDisabled ? 'opacity-70' : ''}`}>
                                        <span className="text-white text-sm font-bold">{db.abbreviation}</span>
                                    </div>
                                    {/* Label */}
                                    <div className="flex flex-col items-center gap-1">
                                        <span className="text-xs text-gray-300 text-center leading-tight">{db.name}</span>
                                        {!db.isAvailable && (
                                            <span className="text-[9px] px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded border border-yellow-500/30 font-medium">
                                                Coming Soon
                                            </span>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
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
                            disabled={!selectedDb || !DATABASE_TYPES.find(db => db.id === selectedDb)?.isAvailable}
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
