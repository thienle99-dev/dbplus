import { useState } from 'react';
import { X, Settings as SettingsIcon, Palette, Code, Database, Info, Keyboard as KeyboardIcon } from 'lucide-react';
import { useSettingsStore } from '../store/settingsStore';
import { useDialog } from '../context/DialogContext';
import { THEME_CONFIGS } from '../constants/themes';
import Select from './ui/Select';
import Checkbox from './ui/Checkbox';
import Button from './ui/Button';
import ThemePreview from './settings/ThemePreview';
import KeyboardShortcutsTab from './settings/KeyboardShortcutsTab';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type TabType = 'general' | 'editor' | 'theme' | 'query' | 'shortcuts' | 'about';

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    const [activeTab, setActiveTab] = useState<TabType>('general');
    const settings = useSettingsStore();
    const dialog = useDialog();

    if (!isOpen) return null;

    const tabs = [
        { id: 'general' as TabType, label: 'General', icon: <SettingsIcon size={16} /> },
        { id: 'editor' as TabType, label: 'Editor', icon: <Code size={16} /> },
        { id: 'theme' as TabType, label: 'Theme', icon: <Palette size={16} /> },
        { id: 'query' as TabType, label: 'Query', icon: <Database size={16} /> },
        { id: 'shortcuts' as TabType, label: 'Shortcuts', icon: <KeyboardIcon size={16} /> },
        { id: 'about' as TabType, label: 'About', icon: <Info size={16} /> },
    ];

    // Get themes organized by category
    const themes = Object.values(THEME_CONFIGS);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-overlay backdrop-blur-sm">
            <div className="w-[95vw] max-w-4xl h-[85vh] max-h-[600px] bg-bg-1 border border-border-light rounded-lg shadow-2xl flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border-light">
                    <h2 className="text-lg font-semibold text-text-primary">Settings</h2>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-bg-2 rounded transition-colors"
                    >
                        <X size={20} className="text-text-secondary" />
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar */}
                    <div className="w-48 border-r border-border-light bg-bg-0 p-2">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                  w-full flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors
                  ${activeTab === tab.id
                                        ? 'bg-accent text-white'
                                        : 'text-text-secondary hover:bg-bg-2 hover:text-text-primary'
                                    }
                `}
                            >
                                {tab.icon}
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-6 overflow-y-auto">
                        {activeTab === 'general' && (
                            <div className="space-y-6">
                                <h3 className="text-base font-semibold text-text-primary mb-4">General Settings</h3>

                                <div className="space-y-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="text-sm font-medium text-text-primary">Auto Save</div>
                                            <div className="text-xs text-text-secondary">Automatically save changes</div>
                                        </div>
                                        <div className="flex-shrink-0">
                                            <Checkbox
                                                checked={settings.autoSave}
                                                onChange={(checked) => settings.updateSettings({ autoSave: checked })}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="text-sm font-medium text-text-primary">Confirm Before Delete</div>
                                            <div className="text-xs text-text-secondary">Show confirmation dialog for destructive actions</div>
                                        </div>
                                        <div className="flex-shrink-0">
                                            <Checkbox
                                                checked={settings.confirmBeforeDelete}
                                                onChange={(checked) => settings.updateSettings({ confirmBeforeDelete: checked })}
                                            />
                                        </div>
                                    </div>

                                    <label className="space-y-2">
                                        <div className="text-sm font-medium text-text-primary">Max Recent Connections</div>
                                        <input
                                            type="number"
                                            min="5"
                                            max="50"
                                            value={settings.maxRecentConnections}
                                            onChange={(e) => settings.updateSettings({ maxRecentConnections: parseInt(e.target.value) })}
                                            className="w-full px-3 py-2 bg-bg-2 border border-border-light rounded text-text-primary text-sm"
                                        />
                                    </label>
                                </div>
                            </div>
                        )}

                        {activeTab === 'editor' && (
                            <div className="space-y-6">
                                <h3 className="text-base font-semibold text-text-primary mb-4">Editor Settings</h3>

                                <div className="space-y-4">
                                    <label className="space-y-2">
                                        <div className="text-sm font-medium text-text-primary">Font Size</div>
                                        <input
                                            type="number"
                                            min="10"
                                            max="24"
                                            value={settings.editorFontSize}
                                            onChange={(e) => settings.setEditorFontSize(parseInt(e.target.value))}
                                            className="w-full px-3 py-2 bg-bg-2 border border-border-light rounded text-text-primary text-sm"
                                        />
                                    </label>

                                    <label className="space-y-2">
                                        <div className="text-sm font-medium text-text-primary">Tab Size</div>
                                        <input
                                            type="number"
                                            min="2"
                                            max="8"
                                            value={settings.tabSize}
                                            onChange={(e) => settings.updateSettings({ tabSize: parseInt(e.target.value) })}
                                            className="w-full px-3 py-2 bg-bg-2 border border-border-light rounded text-text-primary text-sm"
                                        />
                                    </label>

                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="text-sm font-medium text-text-primary">Word Wrap</div>
                                            <div className="text-xs text-text-secondary">Wrap long lines</div>
                                        </div>
                                        <div className="flex-shrink-0">
                                            <Checkbox
                                                checked={settings.wordWrap}
                                                onChange={() => settings.toggleWordWrap()}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="text-sm font-medium text-text-primary">Line Numbers</div>
                                            <div className="text-xs text-text-secondary">Show line numbers in editor</div>
                                        </div>
                                        <div className="flex-shrink-0">
                                            <Checkbox
                                                checked={settings.lineNumbers}
                                                onChange={(checked) => settings.updateSettings({ lineNumbers: checked })}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="text-sm font-medium text-text-primary">Auto Complete</div>
                                            <div className="text-xs text-text-secondary">Enable auto-completion suggestions</div>
                                        </div>
                                        <div className="flex-shrink-0">
                                            <Checkbox
                                                checked={settings.autoComplete}
                                                onChange={(checked) => settings.updateSettings({ autoComplete: checked })}
                                            />
                                        </div>
                                    </div>

                                    <label className="space-y-2">
                                        <div className="text-sm font-medium text-text-primary">SQL Keyword Case</div>
                                        <Select
                                            value={settings.formatKeywordCase}
                                            onChange={(val) => settings.updateSettings({ formatKeywordCase: val as any })}
                                            options={[
                                                { value: 'preserve', label: 'Preserve' },
                                                { value: 'upper', label: 'Uppercase' },
                                                { value: 'lower', label: 'Lowercase' },
                                            ]}
                                        />
                                    </label>
                                </div>
                            </div>
                        )}

                        {activeTab === 'theme' && (
                            <div className="space-y-8">
                                <div className="space-y-4">
                                    <h3 className="text-base font-semibold text-text-primary">Theme Selection</h3>

                                    {/* Group themes by category */}
                                    {['standard', 'premium', 'retro', 'anime'].map((category) => {
                                        const categoryThemes = themes.filter(t => t.category === category);
                                        if (categoryThemes.length === 0) return null;

                                        return (
                                            <div key={category} className="space-y-3">
                                                <h4 className="text-sm font-medium text-text-secondary uppercase tracking-wider text-[10px]">
                                                    {category}
                                                </h4>
                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                    {categoryThemes.map((theme) => (
                                                        <button
                                                            key={theme.value}
                                                            onClick={() => settings.setTheme(theme.value)}
                                                            className={`
                                                                relative group flex flex-col p-2 space-y-2 rounded-lg border text-left transition-all overflow-hidden
                                                                ${settings.theme === theme.value
                                                                    ? 'bg-primary-transparent border-accent ring-1 ring-accent'
                                                                    : 'bg-bg-1 border-border-light hover:bg-bg-2 hover:border-text-secondary'
                                                                }
                                                            `}
                                                        >
                                                            {/* Preview mock */}
                                                            <div className="w-full relative pointer-events-none">
                                                                <ThemePreview theme={theme.value} active={settings.theme === theme.value} />

                                                                {/* Emoji overlay */}
                                                                {theme.emoji && (
                                                                    <div className="absolute -bottom-2 -right-1 text-2xl drop-shadow-md transform group-hover:scale-110 transition-transform">
                                                                        {theme.emoji}
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div className="flex flex-col px-1">
                                                                <div className="flex items-center justify-between w-full">
                                                                    <span className={`text-sm font-medium ${settings.theme === theme.value ? 'text-accent' : 'text-text-primary'}`}>
                                                                        {theme.label}
                                                                    </span>
                                                                </div>
                                                                <span className="text-xs text-text-secondary line-clamp-1">
                                                                    {theme.description || 'Theme'}
                                                                </span>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                            </div>
                        )}

                        {activeTab === 'query' && (
                            <div className="space-y-6">
                                <h3 className="text-base font-semibold text-text-primary mb-4">Query Settings</h3>

                                <div className="space-y-4">
                                    <label className="space-y-2">
                                        <div className="text-sm font-medium text-text-primary">Default Limit</div>
                                        <div className="text-xs text-text-secondary mb-2">Default row limit for queries</div>
                                        <input
                                            type="number"
                                            min="100"
                                            max="10000"
                                            step="100"
                                            value={settings.defaultLimit}
                                            onChange={(e) => settings.updateSettings({ defaultLimit: parseInt(e.target.value) })}
                                            className="w-full px-3 py-2 bg-bg-2 border border-border-light rounded text-text-primary text-sm"
                                        />
                                    </label>

                                    <label className="space-y-2">
                                        <div className="text-sm font-medium text-text-primary">Query Timeout (ms)</div>
                                        <div className="text-xs text-text-secondary mb-2">Maximum query execution time</div>
                                        <input
                                            type="number"
                                            min="5000"
                                            max="300000"
                                            step="5000"
                                            value={settings.queryTimeout}
                                            onChange={(e) => settings.updateSettings({ queryTimeout: parseInt(e.target.value) })}
                                            className="w-full px-3 py-2 bg-bg-2 border border-border-light rounded text-text-primary text-sm"
                                        />
                                    </label>

                                    <label className="space-y-2">
                                        <div className="text-sm font-medium text-text-primary">Default Page Size</div>
                                        <div className="text-xs text-text-secondary mb-2">Rows per page in table view</div>
                                        <input
                                            type="number"
                                            min="10"
                                            max="500"
                                            step="10"
                                            value={settings.defaultPageSize}
                                            onChange={(e) => settings.updateSettings({ defaultPageSize: parseInt(e.target.value) })}
                                            className="w-full px-3 py-2 bg-bg-2 border border-border-light rounded text-text-primary text-sm"
                                        />
                                    </label>

                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="text-sm font-medium text-text-primary">Show NULL as Text</div>
                                            <div className="text-xs text-text-secondary">Display NULL values as "NULL" text</div>
                                        </div>
                                        <div className="flex-shrink-0">
                                            <Checkbox
                                                checked={settings.showNullAsText}
                                                onChange={(checked) => settings.updateSettings({ showNullAsText: checked })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'shortcuts' && (
                            <KeyboardShortcutsTab />
                        )}

                        {activeTab === 'about' && (
                            <div className="space-y-6">
                                <h3 className="text-base font-semibold text-text-primary mb-4">About DB Plus</h3>

                                <div className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 bg-accent rounded-lg flex items-center justify-center">
                                            <Database size={32} className="text-white" />
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-semibold text-text-primary">DB Plus</h4>
                                            <p className="text-sm text-text-secondary">Modern Database Client</p>
                                        </div>
                                    </div>

                                    <div className="space-y-2 pt-4">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-text-secondary">Version</span>
                                            <span className="text-text-primary font-mono">1.0.0</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-text-secondary">Build</span>
                                            <span className="text-text-primary font-mono">2024.12.08</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-text-secondary">License</span>
                                            <span className="text-text-primary">MIT</span>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-border-light">
                                        <p className="text-sm text-text-secondary">
                                            A modern, fast, and intuitive database client built with React, TypeScript, and Rust.
                                        </p>
                                    </div>

                                    <div className="pt-4">
                                        <button className="text-sm text-accent hover:underline">
                                            View on GitHub →
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-border-light">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                            const confirmed = await dialog.confirm({
                                title: 'Reset Settings',
                                message: 'Are you sure you want to reset all settings to defaults?',
                                confirmLabel: 'Reset',
                                variant: 'destructive'
                            });
                            
                            if (confirmed) {
                                settings.resetSettings();
                            }
                        }}
                    >
                        Reset to Defaults
                    </Button>
                    <div className="flex gap-2">
                        <Button
                            variant="primary"
                            size="md"
                            onClick={onClose}
                        >
                            Done
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
