import React, { useState, useMemo } from 'react';
import { Search, Keyboard, Edit2, Check, X } from 'lucide-react';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { KeyboardShortcut } from '../../types/settings';
import { useDialog } from '../../context/DialogContext';
import Input from '../ui/Input';
import Checkbox from '../ui/Checkbox';

export default function KeyboardShortcutsTab() {
    const { shortcuts, updateShortcut, resetShortcuts } = useKeyboardShortcuts();
    const [searchQuery, setSearchQuery] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingKeys, setEditingKeys] = useState<string[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const dialog = useDialog();

    // Filter shortcuts by search and category
    const filteredShortcuts = useMemo(() => {
        return shortcuts.filter((shortcut) => {
            const matchesSearch =
                searchQuery === '' ||
                shortcut.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                shortcut.description.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesCategory =
                selectedCategory === 'all' || shortcut.category === selectedCategory;

            return matchesSearch && matchesCategory;
        });
    }, [shortcuts, searchQuery, selectedCategory]);

    // Group shortcuts by category
    const groupedShortcuts = useMemo(() => {
        const groups: Record<string, KeyboardShortcut[]> = {};
        filteredShortcuts.forEach((shortcut) => {
            if (!groups[shortcut.category]) {
                groups[shortcut.category] = [];
            }
            groups[shortcut.category].push(shortcut);
        });
        return groups;
    }, [filteredShortcuts]);

    const categories = [
        { value: 'all', label: 'All Shortcuts' },
        { value: 'general', label: 'General' },
        { value: 'editor', label: 'Editor' },
        { value: 'query', label: 'Query' },
        { value: 'navigation', label: 'Navigation' },
    ];

    const handleEdit = (shortcut: KeyboardShortcut) => {
        setEditingId(shortcut.id);
        setEditingKeys([...shortcut.keys]);
    };

    const handleSave = (id: string) => {
        updateShortcut(id, { keys: editingKeys });
        setEditingId(null);
        setEditingKeys([]);
    };

    const handleCancel = () => {
        setEditingId(null);
        setEditingKeys([]);
    };

    const handleToggleEnabled = (id: string, enabled: boolean) => {
        updateShortcut(id, { enabled });
    };

    const formatKey = (key: string) => {
        const keyMap: Record<string, string> = {
            Mod: '⌘/Ctrl',
            Shift: '⇧',
            Alt: '⌥',
            Enter: '↵',
        };
        return keyMap[key] || key;
    };

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-base font-semibold text-text-primary mb-2">
                    Keyboard Shortcuts
                </h3>
                <p className="text-sm text-text-secondary">
                    Customize keyboard shortcuts to match your workflow
                </p>
            </div>

            {/* Search and Filter */}
            <div className="flex gap-3">
                <div className="flex-1 relative">
                    <Search
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
                    />
                    <Input
                        type="text"
                        placeholder="Search shortcuts..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        leftIcon={<Search size={16} />}
                        className="w-full"
                    />
                </div>

                <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-3 py-2 bg-bg-2 border border-border rounded text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                >
                    {categories.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                            {cat.label}
                        </option>
                    ))}
                </select>
            </div>

            {/* Shortcuts List */}
            <div className="space-y-6">
                {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
                    <div key={category}>
                        <h4 className="text-sm font-medium text-text-primary mb-3 capitalize">
                            {category}
                        </h4>
                        <div className="space-y-2">
                            {categoryShortcuts.map((shortcut) => (
                                <div
                                    key={shortcut.id}
                                    className="flex items-center justify-between p-3 bg-bg-2 border border-border rounded hover:border-accent/50 transition-colors"
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <Keyboard size={14} className="text-text-secondary" />
                                            <span className="text-sm font-medium text-text-primary">
                                                {shortcut.name}
                                            </span>
                                        </div>
                                        <p className="text-xs text-text-secondary mt-1 ml-5">
                                            {shortcut.description}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        {/* Shortcut Keys */}
                                        {editingId === shortcut.id ? (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={editingKeys.join(' + ')}
                                                    onChange={(e) =>
                                                        setEditingKeys(
                                                            e.target.value.split('+').map((k) => k.trim())
                                                        )
                                                    }
                                                    className="px-2 py-1 bg-bg-1 border border-border rounded text-xs font-mono text-text-primary w-32"
                                                    placeholder="e.g., Mod + S"
                                                />
                                                <button
                                                    onClick={() => handleSave(shortcut.id)}
                                                    className="p-1 hover:bg-bg-3 rounded transition-colors"
                                                    title="Save"
                                                >
                                                    <Check size={16} className="text-green-500" />
                                                </button>
                                                <button
                                                    onClick={handleCancel}
                                                    className="p-1 hover:bg-bg-3 rounded transition-colors"
                                                    title="Cancel"
                                                >
                                                    <X size={16} className="text-red-500" />
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex items-center gap-1">
                                                    {shortcut.keys.map((key, index) => (
                                                        <React.Fragment key={index}>
                                                            {index > 0 && (
                                                                <span className="text-text-secondary text-xs">+</span>
                                                            )}
                                                            <kbd className="px-2 py-1 bg-bg-1 border border-border rounded text-xs font-mono text-text-primary">
                                                                {formatKey(key)}
                                                            </kbd>
                                                        </React.Fragment>
                                                    ))}
                                                </div>
                                                <button
                                                    onClick={() => handleEdit(shortcut)}
                                                    className="p-1 hover:bg-bg-3 rounded transition-colors"
                                                    title="Edit shortcut"
                                                >
                                                    <Edit2 size={14} className="text-text-secondary" />
                                                </button>
                                            </>
                                        )}

                                        {/* Enable/Disable Toggle */}
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={shortcut.enabled}
                                                onChange={(e) =>
                                                    handleToggleEnabled(shortcut.id, e.target.checked)
                                                }
                                                className="sr-only peer"
                                            />
                                            <div className="w-9 h-5 bg-bg-3 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-accent rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border-strong after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent"></div>
                                        </label>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Footer Actions */}
            <div className="flex justify-between pt-4 border-t border-border">
                <button
                    onClick={async () => {
                        const confirmed = await dialog.confirm(
                            'Reset Shortcuts',
                            'Are you sure you want to reset all shortcuts to defaults?'
                        );
                        if (confirmed) {
                            resetShortcuts();
                        }
                    }}
                    className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                    Reset to Defaults
                </button>

                <div className="text-xs text-text-secondary">
                    {filteredShortcuts.length} shortcut{filteredShortcuts.length !== 1 ? 's' : ''}
                </div>
            </div>
        </div>
    );
}
