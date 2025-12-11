import { useState } from 'react';
import { X, Settings as SettingsIcon, Palette, Code, Database, Info } from 'lucide-react';
import { useSettingsStore, Theme } from '../store/settingsStore';
import { THEME_CONFIGS, getThemeDisplayName } from '../constants/themes';
import Select from './ui/Select';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type TabType = 'general' | 'editor' | 'theme' | 'query' | 'about';

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    const [activeTab, setActiveTab] = useState<TabType>('general');
    const settings = useSettingsStore();

    if (!isOpen) return null;

    const tabs = [
        { id: 'general' as TabType, label: 'General', icon: <SettingsIcon size={16} /> },
        { id: 'editor' as TabType, label: 'Editor', icon: <Code size={16} /> },
        { id: 'theme' as TabType, label: 'Theme', icon: <Palette size={16} /> },
        { id: 'query' as TabType, label: 'Query', icon: <Database size={16} /> },
        { id: 'about' as TabType, label: 'About', icon: <Info size={16} /> },
    ];

    // Get themes organized by category
    const themes = Object.values(THEME_CONFIGS);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-4xl h-[600px] bg-bg-1 border border-border rounded-lg shadow-2xl flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
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
                    <div className="w-48 border-r border-border bg-bg-0 p-2">
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
                                    <label className="flex items-center justify-between">
                                        <div>
                                            <div className="text-sm font-medium text-text-primary">Auto Save</div>
                                            <div className="text-xs text-text-secondary">Automatically save changes</div>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={settings.autoSave}
                                            onChange={(e) => settings.updateSettings({ autoSave: e.target.checked })}
                                            className="w-4 h-4 accent-accent"
                                        />
                                    </label>

                                    <label className="flex items-center justify-between">
                                        <div>
                                            <div className="text-sm font-medium text-text-primary">Confirm Before Delete</div>
                                            <div className="text-xs text-text-secondary">Show confirmation dialog for destructive actions</div>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={settings.confirmBeforeDelete}
                                            onChange={(e) => settings.updateSettings({ confirmBeforeDelete: e.target.checked })}
                                            className="w-4 h-4 accent-accent"
                                        />
                                    </label>

                                    <label className="space-y-2">
                                        <div className="text-sm font-medium text-text-primary">Max Recent Connections</div>
                                        <input
                                            type="number"
                                            min="5"
                                            max="50"
                                            value={settings.maxRecentConnections}
                                            onChange={(e) => settings.updateSettings({ maxRecentConnections: parseInt(e.target.value) })}
                                            className="w-full px-3 py-2 bg-bg-2 border border-border rounded text-text-primary text-sm"
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
                                            className="w-full px-3 py-2 bg-bg-2 border border-border rounded text-text-primary text-sm"
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
                                            className="w-full px-3 py-2 bg-bg-2 border border-border rounded text-text-primary text-sm"
                                        />
                                    </label>

                                    <label className="flex items-center justify-between">
                                        <div>
                                            <div className="text-sm font-medium text-text-primary">Word Wrap</div>
                                            <div className="text-xs text-text-secondary">Wrap long lines</div>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={settings.wordWrap}
                                            onChange={() => settings.toggleWordWrap()}
                                            className="w-4 h-4 accent-accent"
                                        />
                                    </label>

                                    <label className="flex items-center justify-between">
                                        <div>
                                            <div className="text-sm font-medium text-text-primary">Line Numbers</div>
                                            <div className="text-xs text-text-secondary">Show line numbers in editor</div>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={settings.lineNumbers}
                                            onChange={(e) => settings.updateSettings({ lineNumbers: e.target.checked })}
                                            className="w-4 h-4 accent-accent"
                                        />
                                    </label>

                                    <label className="flex items-center justify-between">
                                        <div>
                                            <div className="text-sm font-medium text-text-primary">Auto Complete</div>
                                            <div className="text-xs text-text-secondary">Enable auto-completion suggestions</div>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={settings.autoComplete}
                                            onChange={(e) => settings.updateSettings({ autoComplete: e.target.checked })}
                                            className="w-4 h-4 accent-accent"
                                        />
                                    </label>

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
                            <div className="space-y-6">
                                <h3 className="text-base font-semibold text-text-primary mb-4">Theme Settings</h3>

                                <div className="space-y-4">
                                    <label className="space-y-2">
                                        <div className="text-sm font-medium text-text-primary">Color Theme</div>
                                        <Select
                                            value={settings.theme}
                                            onChange={(val) => settings.setTheme(val as Theme)}
                                            options={themes.map((theme) => ({
                                                value: theme.value,
                                                label: getThemeDisplayName(theme.value),
                                            }))}
                                            searchable
                                        />
                                    </label>

                                    <label className="space-y-2">
                                        <div className="text-sm font-medium text-text-primary">Accent Color</div>
                                        <div className="flex gap-2">
                                            <input
                                                type="color"
                                                value={settings.accentColor}
                                                onChange={(e) => settings.updateSettings({ accentColor: e.target.value })}
                                                className="w-12 h-10 rounded cursor-pointer"
                                            />
                                            <input
                                                type="text"
                                                value={settings.accentColor}
                                                onChange={(e) => settings.updateSettings({ accentColor: e.target.value })}
                                                className="flex-1 px-3 py-2 bg-bg-2 border border-border rounded text-text-primary text-sm font-mono"
                                            />
                                        </div>
                                    </label>
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
                                            className="w-full px-3 py-2 bg-bg-2 border border-border rounded text-text-primary text-sm"
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
                                            className="w-full px-3 py-2 bg-bg-2 border border-border rounded text-text-primary text-sm"
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
                                            className="w-full px-3 py-2 bg-bg-2 border border-border rounded text-text-primary text-sm"
                                        />
                                    </label>

                                    <label className="flex items-center justify-between">
                                        <div>
                                            <div className="text-sm font-medium text-text-primary">Show NULL as Text</div>
                                            <div className="text-xs text-text-secondary">Display NULL values as "NULL" text</div>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={settings.showNullAsText}
                                            onChange={(e) => settings.updateSettings({ showNullAsText: e.target.checked })}
                                            className="w-4 h-4 accent-accent"
                                        />
                                    </label>
                                </div>
                            </div>
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

                                    <div className="pt-4 border-t border-border">
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
                <div className="flex items-center justify-between px-6 py-4 border-t border-border">
                    <button
                        onClick={() => {
                            if (confirm('Are you sure you want to reset all settings to defaults?')) {
                                settings.resetSettings();
                            }
                        }}
                        className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
                    >
                        Reset to Defaults
                    </button>
                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-accent text-white rounded hover:bg-accent/90 transition-colors text-sm"
                        >
                            Done
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
