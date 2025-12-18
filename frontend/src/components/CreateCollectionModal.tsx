import { useState } from 'react';
import { X, Table } from 'lucide-react';

interface CreateCollectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (name: string) => void;
    schemaName: string;
    isCouchbase?: boolean;
}

export default function CreateCollectionModal({ isOpen, onClose, onSubmit, schemaName, isCouchbase }: CreateCollectionModalProps) {
    const [name, setName] = useState('');
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedName = name.trim();

        if (!trimmedName) {
            setError(`${isCouchbase ? 'Collection' : 'Table'} name is required`);
            return;
        }

        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmedName)) {
            setError('Name must start with a letter or underscore and contain only letters, numbers, and underscores');
            return;
        }

        onSubmit(trimmedName);
        handleClose();
    };

    const handleClose = () => {
        setName('');
        setError('');
        onClose();
    };

    const term = isCouchbase ? 'Collection' : 'Table';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
            <div className="relative bg-bg-1 border border-border rounded-lg shadow-xl w-full max-w-md mx-4">
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <div className="flex items-center gap-2">
                        <Table size={18} className="text-accent" />
                        <h2 className="text-base font-semibold text-text-primary">Create New {term}</h2>
                    </div>
                    <button onClick={handleClose} className="p-1 hover:bg-bg-2 rounded transition-colors text-text-secondary hover:text-text-primary">
                        <X size={18} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div>
                        <div className="text-xs text-text-secondary mb-2">
                            In {isCouchbase ? 'Scope' : 'Schema'}: <span className="font-medium text-text-primary">{schemaName}</span>
                        </div>
                        <label className="block text-sm font-medium text-text-primary mb-2">
                            {term} Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => {
                                setName(e.target.value);
                                setError('');
                            }}
                            placeholder={`e.g., users`}
                            className={`w-full px-3 py-2 bg-bg-2 border rounded text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent ${error ? 'border-red-500' : 'border-border'}`}
                            autoFocus
                        />
                        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={handleClose} className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-bg-2 rounded transition-colors">
                            Cancel
                        </button>
                        <button type="submit" className="px-4 py-2 text-sm font-medium bg-accent hover:bg-accent-hover text-white rounded transition-colors">
                            Create {term}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
