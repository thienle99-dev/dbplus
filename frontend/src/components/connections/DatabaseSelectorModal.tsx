import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { DatabaseSelectorModalProps } from '../../types';
import { DATABASE_TYPES } from '../../constants/databaseTypes';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';

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

    const footer = (
        <div className="flex w-full items-center justify-between">
            <Button variant="secondary" onClick={onClose}>
                Cancel
            </Button>
            <div className="flex gap-2">
                <Button variant="secondary">Import from URL</Button>
                <Button variant="secondary">New Group</Button>
                <Button
                    variant="primary"
                    onClick={handleSelect}
                    disabled={!selectedDb || !DATABASE_TYPES.find((db) => db.id === selectedDb)?.isAvailable}
                >
                    Create
                </Button>
            </div>
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Select Connection Type"
            size="xl"
            footer={footer}
        >
            <div className="space-y-6">
                {/* Search */}
                <Input
                    leftIcon={<Search size={16} />}
                    placeholder="Search for connection... (⌘F)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                />

                {/* Database Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 max-h-[400px]">
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
                                    flex flex-col items-center gap-3 p-4 rounded-xl transition-all relative
                                    ${isSelected && db.isAvailable
                                        ? 'ring-2 ring-accent bg-accent/10'
                                        : 'ring-1 ring-border/40 hover:bg-bg-2/50'
                                    }
                                    ${isDisabled
                                        ? 'opacity-60 cursor-not-allowed'
                                        : 'cursor-pointer'
                                    }
                                `}
                            >
                                {/* Icon Circle */}
                                <div className={`w-12 h-12 rounded-2xl ${db.color} flex items-center justify-center shadow-sm ${isDisabled ? 'opacity-70' : ''}`}>
                                    <span className="text-white text-sm font-bold">{db.abbreviation}</span>
                                </div>
                                {/* Label */}
                                <div className="flex flex-col items-center gap-1">
                                    <span className="text-xs font-medium text-text-primary text-center leading-tight">{db.name}</span>
                                    {!db.isAvailable && (
                                        <span className="text-[9px] px-1.5 py-0.5 bg-yellow-500/10 text-yellow-500 rounded-full border border-yellow-500/20 font-medium whitespace-nowrap">
                                            Coming Soon
                                        </span>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </Modal>
    );
};
