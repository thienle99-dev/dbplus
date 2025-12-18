import { useState, useEffect } from 'react';
import { X, Database } from 'lucide-react';
import Select from './ui/Select';

interface CreateSchemaModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (schemaName: string) => void;
    isCouchbase?: boolean;
    databases?: string[];
}

export default function CreateSchemaModal({ isOpen, onClose, onSubmit, isCouchbase, databases = [] }: CreateSchemaModalProps) {
    const [schemaName, setSchemaName] = useState('');
    const [selectedDatabase, setSelectedDatabase] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen && databases.length > 0 && !selectedDatabase) {
            setSelectedDatabase(databases[0]);
        }
    }, [isOpen, databases, selectedDatabase]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const trimmedName = schemaName.trim();

        // Validation
        if (isCouchbase && !selectedDatabase) {
            setError('Please select a collection (bucket)');
            return;
        }

        if (!trimmedName) {
            setError(`${isCouchbase ? 'Scope' : 'Schema'} name is required`);
            return;
        }

        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmedName)) {
            setError('Name must start with a letter or underscore and contain only letters, numbers, and underscores');
            return;
        }

        if (trimmedName.length > 63) {
            setError('Name must be 63 characters or less');
            return;
        }

        const finalName = isCouchbase ? `${selectedDatabase}.${trimmedName}` : trimmedName;
        onSubmit(finalName);
        handleClose();
    };

    const handleClose = () => {
        setSchemaName('');
        // Don't reset selectedDatabase to keep user's preference if they reopen
        setError('');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="relative bg-bg-1 border border-border rounded-lg shadow-xl w-full max-w-md mx-4">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <div className="flex items-center gap-2">
                        <Database size={18} className="text-accent" />
                        <h2 className="text-base font-semibold text-text-primary">
                            Create New {isCouchbase ? 'Scope' : 'Schema'}
                        </h2>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-1 hover:bg-bg-2 rounded transition-colors text-text-secondary hover:text-text-primary"
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    {isCouchbase && (
                        <div>
                            <label className="block text-sm font-medium text-text-primary mb-2">
                                Collection (Bucket)
                            </label>
                            <Select
                                value={selectedDatabase}
                                onChange={setSelectedDatabase}
                                options={databases.map(db => ({ value: db, label: db }))}
                                placeholder="Select bucket..."
                                className="w-full"
                            />
                        </div>
                    )}

                    <div>
                        <label htmlFor="schema-name" className="block text-sm font-medium text-text-primary mb-2">
                            {isCouchbase ? 'Scope Name' : 'Schema Name'}
                        </label>
                        <input
                            id="schema-name"
                            type="text"
                            value={schemaName}
                            onChange={(e) => {
                                setSchemaName(e.target.value);
                                setError('');
                            }}
                            placeholder={isCouchbase ? "e.g., inventory" : "e.g., public, my_schema"}
                            className={`w-full px-3 py-2 bg-bg-2 border rounded text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent ${error ? 'border-red-500' : 'border-border'
                                }`}
                            autoFocus
                        />
                        {error && (
                            <p className="mt-1 text-xs text-red-500">{error}</p>
                        )}
                        <p className="mt-1 text-xs text-text-secondary">
                            Must start with a letter or underscore. Only letters, numbers, and underscores allowed.
                        </p>
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-bg-2 rounded transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 text-sm font-medium bg-accent hover:bg-accent-hover text-white rounded transition-colors"
                        >
                            Create {isCouchbase ? 'Scope' : 'Schema'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
