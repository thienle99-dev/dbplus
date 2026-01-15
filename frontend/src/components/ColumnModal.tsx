import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { ColumnModalProps } from '../types';
import Select from './ui/Select';
import Input from './ui/Input';
import Checkbox from './ui/Checkbox';

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
                        <Input
                            type="text"
                            value={name}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                            placeholder="e.g., user_age"
                            required
                            fullWidth
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1">
                            Data Type <span className="text-accent">*</span>
                        </label>
                        <Select
                            value={dataType}
                            onChange={(val) => setDataType(val)}
                            options={[
                                { value: 'text', label: 'text' },
                                { value: 'varchar', label: 'varchar' },
                                { value: 'integer', label: 'integer' },
                                { value: 'boolean', label: 'boolean' },
                                { value: 'timestamp', label: 'timestamp' },
                                { value: 'jsonb', label: 'jsonb' },
                                { value: 'uuid', label: 'uuid' },
                                { value: 'float', label: 'float' },
                                { value: 'date', label: 'date' },
                                { value: 'bigint', label: 'bigint' },
                            ]}
                            searchable
                        />
                    </div>

                    <Checkbox
                        id="isNullable"
                        checked={isNullable}
                        onChange={setIsNullable}
                        label="Is Nullable"
                    />

                    <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1">
                            Default Value
                        </label>
                        <Input
                            type="text"
                            value={defaultValue}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDefaultValue(e.target.value)}
                            placeholder="e.g., 0, now(), 'active'"
                            fullWidth
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
