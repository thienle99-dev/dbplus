import { useState } from 'react';
import { X, Database } from 'lucide-react';

interface CreateCouchbaseCollectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (collectionName: string) => void;
    scopeName: string;
    bucketName: string;
}

export default function CreateCouchbaseCollectionModal({ 
    isOpen, 
    onClose, 
    onSubmit, 
    scopeName,
    bucketName
}: CreateCouchbaseCollectionModalProps) {
    const [collectionName, setCollectionName] = useState('');
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const trimmedName = collectionName.trim();

        // Validation
        if (!trimmedName) {
            setError('Collection name is required');
            return;
        }

        if (!/^[a-zA-Z_][a-zA-Z0-9_\-%]*$/.test(trimmedName)) {
            setError('Collection name contains invalid characters');
            return;
        }

        if (trimmedName.length > 63) {
            setError('Collection name must be 63 characters or less');
            return;
        }

        onSubmit(trimmedName);
        handleClose();
    };

    const handleClose = () => {
        setCollectionName('');
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
                        <h2 className="text-base font-semibold text-text-primary">Create New Collection</h2>
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
                <div className="p-4 bg-bg-2/50 border-b border-border text-sm text-text-secondary">
                    Creating collection in bucket <strong>{bucketName}</strong>, scope <strong>{scopeName}</strong>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    {/* Collection Name Input */}
                    <div>
                        <label htmlFor="collection-name" className="block text-sm font-medium text-text-primary mb-2">
                            Collection Name
                        </label>
                        <input
                            id="collection-name"
                            type="text"
                            value={collectionName}
                            onChange={(e) => {
                                setCollectionName(e.target.value);
                                setError('');
                            }}
                            placeholder="e.g., users, transactions"
                            className={`w-full px-3 py-2 bg-bg-2 border rounded text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent ${
                                error ? 'border-red-500' : 'border-border'
                            }`}
                            autoFocus
                        />
                        {error && (
                            <p className="mt-1 text-xs text-red-500">{error}</p>
                        )}
                         <p className="mt-1 text-xs text-text-secondary">
                            Must start with a letter or underscore.
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
                            disabled={!collectionName.trim()}
                            className="px-4 py-2 text-sm font-medium bg-accent hover:bg-accent-hover text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Create Collection
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
