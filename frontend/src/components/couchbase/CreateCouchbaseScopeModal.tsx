import { useState, useEffect } from 'react';
import { X, Database } from 'lucide-react';
import { useDatabases } from '../../hooks/useDatabase';
import Select from '../ui/Select';

interface CreateCouchbaseScopeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (schemaName: string, bucketName: string) => void;
    connectionId: string;
    defaultBucket?: string;
}

export default function CreateCouchbaseScopeModal({ 
    isOpen, 
    onClose, 
    onSubmit, 
    connectionId,
    defaultBucket 
}: CreateCouchbaseScopeModalProps) {
    const [schemaName, setSchemaName] = useState('');
    const [selectedBucket, setSelectedBucket] = useState(defaultBucket || '');
    const [error, setError] = useState('');
    
    const { data: buckets = [], isLoading: isLoadingBuckets } = useDatabases(connectionId);

    // Update selected bucket when default changes or buckets load
    useEffect(() => {
        if (defaultBucket) {
            setSelectedBucket(defaultBucket);
        } else if (buckets.length > 0 && !selectedBucket) {
            setSelectedBucket(buckets[0]);
        }
    }, [defaultBucket, buckets, selectedBucket]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const trimmedName = schemaName.trim();

        // Validation
        if (!trimmedName) {
            setError('Scope name is required');
            return;
        }

        if (!/^[a-zA-Z_][a-zA-Z0-9_\-%]*$/.test(trimmedName)) {
            setError('Scope name contains invalid characters');
            return;
        }

        if (trimmedName.length > 63) {
            setError('Scope name must be 63 characters or less');
            return;
        }

        if (!selectedBucket) {
            setError('Please select a bucket');
            return;
        }

        onSubmit(trimmedName, selectedBucket);
        handleClose();
    };

    const handleClose = () => {
        setSchemaName('');
        setError('');
        onClose();
    };

    const bucketOptions = buckets.map(bucket => ({
        label: bucket,
        value: bucket,
        icon: <Database size={14} />
    }));

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
                        <h2 className="text-base font-semibold text-text-primary">Create New Scope</h2>
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
                    {/* Bucket Selection */}
                    <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">
                            Bucket
                        </label>
                        <Select
                            value={selectedBucket}
                            onChange={setSelectedBucket}
                            options={bucketOptions}
                            placeholder="Select a bucket"
                            searchable
                            disabled={isLoadingBuckets}
                        />
                    </div>

                    {/* Scope Name Input */}
                    <div>
                        <label htmlFor="schema-name" className="block text-sm font-medium text-text-primary mb-2">
                            Scope Name
                        </label>
                        <input
                            id="schema-name"
                            type="text"
                            value={schemaName}
                            onChange={(e) => {
                                setSchemaName(e.target.value);
                                setError('');
                            }}
                            placeholder="e.g., inventory, users"
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
                            disabled={!selectedBucket || !schemaName.trim()}
                            className="px-4 py-2 text-sm font-medium bg-accent hover:bg-accent-hover text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Create Scope
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
