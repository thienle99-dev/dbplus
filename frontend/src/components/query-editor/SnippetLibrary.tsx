import React, { useState, useEffect } from 'react';
import { Search, Plus, Trash2, Edit2, Copy, Play } from 'lucide-react';
import Modal from '../ui/Modal';
import { QuerySnippet } from '../../types/snippet';
import { snippetApi } from '../../services/snippetApi';
import { useToast } from '../../context/ToastContext';
import SnippetFormModal from './SnippetFormModal';
import { applyTemplateVariables, extractTemplateVariables } from '../../utils/snippetTemplate';

interface SnippetLibraryProps {
    isOpen: boolean;
    onClose: () => void;
    onInsert: (sql: string) => void;
}

export default function SnippetLibrary({ isOpen, onClose, onInsert }: SnippetLibraryProps) {
    const [snippets, setSnippets] = useState<QuerySnippet[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingSnippet, setEditingSnippet] = useState<QuerySnippet | undefined>(undefined);
    const [insertSnippet, setInsertSnippet] = useState<QuerySnippet | null>(null);
    const [templateValues, setTemplateValues] = useState<Record<string, string>>({});
    const { showToast } = useToast();

    const fetchSnippets = async () => {
        if (!isOpen) return;
        setLoading(true);
        try {
            const data = await snippetApi.getSnippets();
            setSnippets(data);
        } catch (err) {
            console.error('Failed to fetch snippets:', err);
            showToast('Failed to load snippets', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSnippets();
    }, [isOpen]);

    const filteredSnippets = snippets.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.description?.toLowerCase().includes(search.toLowerCase()) ||
        s.tags?.some(t => t.toLowerCase().includes(search.toLowerCase()))
    );

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this snippet?')) return;
        try {
            await snippetApi.deleteSnippet(id);
            showToast('Snippet deleted', 'success');
            fetchSnippets();
        } catch (err) {
            showToast('Failed to delete snippet', 'error');
        }
    };

    const handleEdit = (snippet: QuerySnippet, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingSnippet(snippet);
        setIsFormOpen(true);
    };

    const handleCreate = () => {
        setEditingSnippet(undefined);
        setIsFormOpen(true);
    };

    const handleFormSubmit = async (data: any) => {
        try {
            if (editingSnippet) {
                await snippetApi.updateSnippet(editingSnippet.id, data);
                showToast('Snippet updated', 'success');
            } else {
                await snippetApi.createSnippet(data);
                showToast('Snippet created', 'success');
            }
            setIsFormOpen(false);
            fetchSnippets();
        } catch (err) {
            showToast('Failed to save snippet', 'error');
        }
    };

    const handleCopy = (sql: string, e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(sql);
        showToast('SQL copied to clipboard', 'success');
    };

    const openInsert = (snippet: QuerySnippet) => {
        const vars = extractTemplateVariables(snippet.sql);
        if (vars.length === 0) {
            onInsert(snippet.sql);
            return;
        }
        setInsertSnippet(snippet);
        setTemplateValues(Object.fromEntries(vars.map((v) => [v, ''])));
    };

    const handleConfirmInsert = () => {
        if (!insertSnippet) return;
        const resolved = applyTemplateVariables(insertSnippet.sql, templateValues);
        onInsert(resolved);
        setInsertSnippet(null);
        setTemplateValues({});
        showToast('Snippet inserted', 'success');
    };

    return (
        <>
            <Modal
                isOpen={isOpen}
                onClose={onClose}
                title="Snippet Library"
                size="xl"
            >
                <div className="flex flex-col h-[60vh]">
                    {/* Toolbar */}
                    <div className="flex items-center justify-between mb-4 gap-4">
                        <div className="relative flex-1">
                            <Search size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-secondary" />
                            <input
                                type="text"
                                placeholder="Search snippets..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full bg-bg-2 border border-border rounded pl-9 pr-3 py-1.5 text-sm text-text-primary focus:border-accent focus:outline-none"
                            />
                        </div>
                        <button
                            onClick={handleCreate}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white rounded text-sm hover:bg-blue-600 transition-colors"
                        >
                            <Plus size={16} />
                            New Snippet
                        </button>
                    </div>

                    {/* List */}
                    <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                        {loading ? (
                            <div className="text-center text-text-secondary py-8">Loading...</div>
                        ) : filteredSnippets.length === 0 ? (
                            <div className="text-center text-text-secondary py-8">
                                {search ? 'No snippets found matching your search' : 'No snippets yet. Create one!'}
                            </div>
                        ) : (
                            filteredSnippets.map(snippet => (
                                <div
                                    key={snippet.id}
                                    className="p-3 border border-border rounded bg-bg-1 hover:border-accent/50 cursor-pointer group transition-all"
                                    onClick={() => openInsert(snippet)}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <div>
                                            <h3 className="text-sm font-medium text-text-primary group-hover:text-accent transition-colors">{snippet.name}</h3>
                                            {snippet.description && <p className="text-xs text-text-secondary mt-0.5">{snippet.description}</p>}
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => handleCopy(snippet.sql, e)}
                                                className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-bg-2 rounded"
                                                title="Copy SQL"
                                            >
                                                <Copy size={14} />
                                            </button>
                                            <button
                                                onClick={(e) => handleEdit(snippet, e)}
                                                className="p-1.5 text-text-secondary hover:text-accent hover:bg-bg-2 rounded"
                                                title="Edit"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button
                                                onClick={(e) => handleDelete(snippet.id, e)}
                                                className="p-1.5 text-text-secondary hover:text-red-500 hover:bg-red-500/10 rounded"
                                                title="Delete"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="bg-bg-0 p-2 rounded border border-border/50 font-mono text-xs text-text-secondary overflow-hidden max-h-16 relative">
                                        <pre className="whitespace-pre-wrap break-all line-clamp-2">{snippet.sql}</pre>
                                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-bg-0/50 pointer-events-none" />
                                    </div>

                                    <div className="mt-2 flex items-center justify-between">
                                        <div className="flex gap-1.5 flex-wrap">
                                            {snippet.tags?.map(tag => (
                                                <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-bg-2 text-text-secondary rounded-full border border-border">
                                                    #{tag}
                                                </span>
                                            ))}
                                        </div>
                                        <span className="flex items-center gap-1 text-xs text-accent opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Play size={10} /> Insert
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={!!insertSnippet}
                onClose={() => {
                    setInsertSnippet(null);
                    setTemplateValues({});
                }}
                title={insertSnippet ? `Insert: ${insertSnippet.name}` : 'Insert Snippet'}
                size="lg"
            >
                {insertSnippet && (
                    <div className="space-y-4">
                        <div className="text-xs text-text-secondary">
                            Fill template variables like <span className="font-mono">{'{{var}}'}</span>.
                        </div>

                        <div className="space-y-3">
                            {extractTemplateVariables(insertSnippet.sql).map((name) => (
                                <div key={name}>
                                    <label className="block text-xs font-medium text-text-secondary mb-1">{name}</label>
                                    <input
                                        type="text"
                                        value={templateValues[name] ?? ''}
                                        onChange={(e) => setTemplateValues((prev) => ({ ...prev, [name]: e.target.value }))}
                                        className="w-full bg-bg-0 border border-border rounded px-2 py-1.5 text-sm text-text-primary focus:border-accent focus:outline-none"
                                        placeholder={`Value for ${name}`}
                                    />
                                </div>
                            ))}
                        </div>

                        <div>
                            <div className="text-xs font-medium text-text-secondary mb-1">Preview</div>
                            <pre className="bg-bg-0 border border-border rounded p-2 text-xs font-mono text-text-secondary whitespace-pre-wrap break-words max-h-48 overflow-auto">
                                {applyTemplateVariables(insertSnippet.sql, templateValues)}
                            </pre>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setInsertSnippet(null);
                                    setTemplateValues({});
                                }}
                                className="px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-2 rounded transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmInsert}
                                className="px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-blue-600 transition-colors"
                            >
                                Insert
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            <SnippetFormModal
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                onSubmit={handleFormSubmit}
                initialData={editingSnippet}
            />
        </>
    );
}
