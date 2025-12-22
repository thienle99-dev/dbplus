import { useState, useEffect, useRef } from 'react';
import { Filter, Trash2, Plus, ChevronDown } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Button from '../ui/Button';

interface SavedFilter {
    id: string;
    name: string;
    filter: string;
}

interface SavedFiltersProps {
    connectionId: string;
    schema: string;
    table: string;
    currentFilter: string;
    onApplyFilter: (filter: string) => void;
}

export default function SavedFilters({
    connectionId,
    schema,
    table,
    currentFilter,
    onApplyFilter,
}: SavedFiltersProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [filters, setFilters] = useState<SavedFilter[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [newFilterName, setNewFilterName] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const { showToast } = useToast();

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setIsSaving(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const fetchFilters = async () => {
        try {
            const response = await api.get(`/api/connections/${connectionId}/saved-filters`, {
                params: { schema, table }
            });
            setFilters(response.data);
        } catch (err) {
            console.error("Failed to fetch saved filters", err);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchFilters();
        }
    }, [isOpen, connectionId, schema, table]);

    const handleSave = async () => {
        if (!newFilterName.trim()) return;
        try {
            await api.post(`/api/connections/${connectionId}/saved-filters`, {
                schema,
                table,
                name: newFilterName,
                filter: currentFilter
            });
            showToast('Filter saved', 'success');
            setNewFilterName('');
            setIsSaving(false);
            fetchFilters();
        } catch (err: any) {
            showToast(`Failed to save filter: ${err.message}`, 'error');
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await api.delete(`/api/connections/${connectionId}/saved-filters/${id}`);
            showToast('Filter deleted', 'success');
            fetchFilters();
        } catch (err: any) {
            showToast(`Failed to delete filter: ${err.message}`, 'error');
        }
    };

    return (
        <div className="relative" ref={containerRef}>
            <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(!isOpen)}
                icon={<Filter size={13} />}
                className={`h-7 px-2 text-xs ${filters.length > 0 ? 'text-accent' : 'text-text-secondary'}`}
                title="Saved Filters"
            >
                <ChevronDown size={12} className="ml-1 opacity-50" />
            </Button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-bg-1 border border-border-light rounded-lg shadow-xl z-50 flex flex-col overflow-hidden">
                    <div className="p-2 border-b border-border-light bg-bg-2 flex items-center justify-between">
                        <span className="text-xs font-bold text-text-secondary">Saved Filters</span>
                        <button
                            onClick={() => setIsSaving(true)}
                            disabled={!currentFilter}
                            className="text-[10px] flex items-center gap-1 text-accent hover:underline disabled:opacity-50 disabled:no-underline"
                        >
                            <Plus size={10} /> Save Current
                        </button>
                    </div>

                    {isSaving && (
                        <div className="p-2 border-b border-border-light bg-bg-2/50 animate-in fade-in zoom-in-95 duration-150">
                            <div className="flex flex-col gap-2">
                                <input
                                    autoFocus
                                    className="w-full bg-bg-0 border border-border-subtle rounded px-2 py-1 text-xs outline-none focus:border-accent"
                                    placeholder="Filter Name..."
                                    value={newFilterName}
                                    onChange={(e) => setNewFilterName(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                                />
                                <div className="flex justify-end gap-2">
                                    <button onClick={() => setIsSaving(false)} className="text-[10px] text-text-secondary hover:text-text-primary">Cancel</button>
                                    <button onClick={handleSave} className="text-[10px] bg-accent text-white px-2 py-0.5 rounded hover:bg-accent-hover">Save</button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="max-h-[200px] overflow-y-auto p-1 custom-scrollbar">
                        {filters.length === 0 ? (
                            <div className="p-3 text-center text-[10px] text-text-tertiary">No saved filters</div>
                        ) : (
                            filters.map(f => (
                                <div
                                    key={f.id}
                                    className="group flex items-center justify-between p-1.5 hover:bg-bg-2 rounded cursor-pointer"
                                    onClick={() => {
                                        onApplyFilter(f.filter);
                                        setIsOpen(false);
                                    }}
                                >
                                    <div className="flex flex-col overflow-hidden">
                                        <span className="text-xs font-medium text-text-primary truncate">{f.name}</span>
                                        <span className="text-[9px] text-text-tertiary truncate font-mono" title={f.filter}>{f.filter}</span>
                                    </div>
                                    <button
                                        onClick={(e) => handleDelete(f.id, e)}
                                        className="p-1 opacity-0 group-hover:opacity-100 hover:text-error transition-all"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
