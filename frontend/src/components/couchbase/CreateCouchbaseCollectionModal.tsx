import { useState } from 'react';
import { Database } from 'lucide-react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';

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
    const [submitting, setSubmitting] = useState(false);

    const handleClose = () => {
        setCollectionName('');
        setError('');
        onClose();
    };

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
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

        setSubmitting(true);
        try {
            onSubmit(trimmedName);
            handleClose();
        } finally {
            setSubmitting(false);
        }
    };

    const footer = (
        <div className="flex justify-end gap-2">
            <Button
                variant="secondary"
                onClick={handleClose}
            >
                Cancel
            </Button>
            <Button
                variant="primary"
                onClick={() => handleSubmit()}
                disabled={!collectionName.trim()}
                isLoading={submitting}
            >
                Create Collection
            </Button>
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title={
                <div className="flex items-center gap-2">
                    <Database size={18} className="text-accent" />
                    <span>Create New Collection</span>
                </div>
            }
            size="md"
            footer={footer}
        >
            <div className="space-y-4">
                <div className="p-3 rounded-lg bg-bg-sunken border border-border-subtle text-xs text-text-secondary leading-relaxed">
                    Creating collection in bucket <span className="text-text-primary font-bold">{bucketName}</span>, scope <span className="text-text-primary font-bold">{scopeName}</span>
                </div>

                <form onSubmit={handleSubmit}>
                    <Input
                        label="Collection Name"
                        value={collectionName}
                        onChange={(e) => {
                            setCollectionName(e.target.value);
                            setError('');
                        }}
                        placeholder="e.g., users, transactions"
                        error={error}
                        helperText="Must start with a letter or underscore. Can contain letters, numbers, underscores, hyphens, and percent signs."
                        autoFocus
                        fullWidth
                    />
                </form>
            </div>
        </Modal>
    );
}
