import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { CreateSnippetParams, QuerySnippet } from '../../types/snippet';

interface SnippetFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: CreateSnippetParams) => Promise<void>;
    initialData?: QuerySnippet;
    isSubmitting?: boolean;
}

export default function SnippetFormModal({
    isOpen,
    onClose,
    onSubmit,
    initialData,
    isSubmitting = false,
}: SnippetFormModalProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [sql, setSql] = useState('');
    const [tags, setTags] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setName(initialData.name);
                setDescription(initialData.description || '');
                setSql(initialData.sql);
                setTags(initialData.tags?.join(', ') || '');
            } else {
                setName('');
                setDescription('');
                setSql('');
                setTags('');
            }
        }
    }, [isOpen, initialData]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({
            name,
            description: description || undefined,
            sql,
            tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
        });
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={initialData ? 'Edit Snippet' : 'Create Snippet'}
            size="lg"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">Name *</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-bg-0 border border-border rounded px-2 py-1.5 text-sm text-text-primary focus:border-accent focus:outline-none"
                        placeholder="e.g., Select All Users"
                        required
                        autoFocus
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">Description</label>
                    <input
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full bg-bg-0 border border-border rounded px-2 py-1.5 text-sm text-text-primary focus:border-accent focus:outline-none"
                        placeholder="Optional description"
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">SQL *</label>
                    <textarea
                        value={sql}
                        onChange={(e) => setSql(e.target.value)}
                        className="w-full h-40 bg-bg-0 border border-border rounded px-2 py-1.5 text-sm text-text-primary font-mono focus:border-accent focus:outline-none resize-y"
                        placeholder="SELECT * FROM table..."
                        required
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">Tags (comma separated)</label>
                    <input
                        type="text"
                        value={tags}
                        onChange={(e) => setTags(e.target.value)}
                        className="w-full bg-bg-0 border border-border rounded px-2 py-1.5 text-sm text-text-primary focus:border-accent focus:outline-none"
                        placeholder="e.g., users, select, template"
                    />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-2 rounded transition-colors"
                        disabled={isSubmitting}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Saving...' : initialData ? 'Update' : 'Create'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
