import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { TableColumn, ColumnModalProps } from '../types';

export default function ColumnModal({ isOpen, onClose, onSave, initialData, mode }: ColumnModalProps) {
    const [name, setName] = useState('');
    const [dataType, setDataType] = useState('text');
    const [isNullable, setIsNullable] = useState(true);
    const [defaultValue, setDefaultValue] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            if (initialData && mode === 'edit') {
                setName(initialData.name);
                setDataType(initialData.data_type);
                setIsNullable(initialData.is_nullable);
                setDefaultValue(initialData.default_value || '');
            } else {
                setName('');
                setDataType('text');
                setIsNullable(true);
                setDefaultValue('');
            }
            setError(null);
        }
    }, [isOpen, initialData, mode]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        try {
            await onSave({
                name,
                data_type: dataType,
                is_nullable: isNullable,
                default_value: defaultValue || null,
            });
            onClose();
        } catch (err: any) {
            console.error('Failed to save column:', err);
            setError(err.response?.data?.error || 'Failed to save column');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-bg-1 border border-border rounded-lg shadow-xl w-full max-w-md overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-border bg-bg-2">
                    <h3 className="font-medium text-text-primary">
                        {mode === 'create' ? 'Add Column' : 'Edit Column'}
                    </h3>
                    <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    {error && (
                        <div className="p-3 text-xs bg-red-500/10 text-red-500 border border-red-500/20 rounded">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1">
                            Column Name <span className="text-accent">*</span>
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-bg-0 border border-border rounded px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
                            placeholder="e.g., user_age"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1">
                            Data Type <span className="text-accent">*</span>
                        </label>
                        <select
                            value={dataType}
                            onChange={(e) => setDataType(e.target.value)}
                            className="w-full bg-bg-0 border border-border rounded px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
                        >
                            <option value="text">text</option>
                            <option value="varchar">varchar</option>
                            <option value="integer">integer</option>
                            <option value="boolean">boolean</option>
                            <option value="timestamp">timestamp</option>
                            <option value="jsonb">jsonb</option>
                            <option value="uuid">uuid</option>
                            <option value="float">float</option>
                            <option value="date">date</option>
                            <option value="bigint">bigint</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="isNullable"
                            checked={isNullable}
                            onChange={(e) => setIsNullable(e.target.checked)}
                            className="w-4 h-4"
                        />
                        <label htmlFor="isNullable" className="text-sm text-text-primary">
                            Is Nullable
                        </label>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1">
                            Default Value
                        </label>
                        <input
                            type="text"
                            value={defaultValue}
                            onChange={(e) => setDefaultValue(e.target.value)}
                            className="w-full bg-bg-0 border border-border rounded px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
                            placeholder="e.g., 0, now(), 'active'"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm text-text-secondary hover:bg-bg-3 rounded transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving || !name.trim()}
                            className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-blue-600 text-white text-sm font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Save size={16} />
                            {saving ? 'Saving...' : 'Save Column'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
