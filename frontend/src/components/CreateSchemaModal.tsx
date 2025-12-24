import { useState } from 'react';

import Modal from './ui/Modal';
import Input from './ui/Input';
import Button from './ui/Button';

interface CreateSchemaModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (schemaName: string) => void;
}

export default function CreateSchemaModal({ isOpen, onClose, onSubmit }: CreateSchemaModalProps) {
    const [schemaName, setSchemaName] = useState('');
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const trimmedName = schemaName.trim();

        // Validation
        if (!trimmedName) {
            setError('Schema name is required');
            return;
        }

        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmedName)) {
            setError('Schema name must start with a letter or underscore and contain only letters, numbers, and underscores');
            return;
        }

        if (trimmedName.length > 63) {
            setError('Schema name must be 63 characters or less');
            return;
        }

        onSubmit(trimmedName);
        handleClose();
    };

    const handleClose = () => {
        setSchemaName('');
        setError('');
        onClose();
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
                onClick={() => handleSubmit({ preventDefault: () => { } } as any)}
            >
                Create Schema
            </Button>
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Create New Schema"
            size="sm"
            footer={footer}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <Input
                        label="Schema Name"
                        id="schema-name"
                        value={schemaName}
                        onChange={(e) => {
                            setSchemaName(e.target.value);
                            setError('');
                        }}
                        placeholder="e.g., public, my_schema"
                        error={error}
                        helperText="Must start with a letter or underscore. Only letters, numbers, and underscores allowed."
                        autoFocus
                    />
                </div>
            </form>
        </Modal>
    );
}
