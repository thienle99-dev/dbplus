import React, { useState } from 'react';
import { X, Monitor, Type, Check } from 'lucide-react';
import { useSettingsStore, Theme } from '../../store/settingsStore';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const THEMES: { id: Theme; name: string; color: string }[] = [
    { id: 'dark', name: 'Dark Default', color: '#0f1115' },
    { id: 'light', name: 'Light Mode', color: '#ffffff' },
    { id: 'solar', name: 'Solarized', color: '#fdf6e3' },
    { id: 'midnight', name: 'Midnight', color: '#0f172a' },
    { id: 'system', name: 'System', color: 'linear-gradient(135deg, #ffffff 50%, #0f1115 50%)' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState<'appearance' | 'editor'>('appearance');
    const { theme, setTheme, editorFontSize, setEditorFontSize, wordWrap, toggleWordWrap } = useSettingsStore();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-[600px] h-[500px] bg-bg-1 border border-border rounded-lg shadow-xl flex flex-col overflow-hidden animate-fadeIn">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-bg-2">
                    <h2 className="text-lg font-semibold text-text-primary">Settings</h2>
                    <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar */}
                    <div className="w-48 border-r border-border bg-bg-1 p-2 space-y-1">
                        <button
                            onClick={() => setActiveTab('appearance')}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition-colors ${activeTab === 'appearance' ? 'bg-accent/10 text-accent' : 'text-text-secondary hover:bg-bg-2 hover:text-text-primary'
                                }`}
                        >
                            <Monitor size={16} />
                            Appearance
                        </button>
                        <button
                            onClick={() => setActiveTab('editor')}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition-colors ${activeTab === 'editor' ? 'bg-accent/10 text-accent' : 'text-text-secondary hover:bg-bg-2 hover:text-text-primary'
                                }`}
                        >
                            <Type size={16} />
                            Editor
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-6 overflow-y-auto bg-bg-0">
                        {activeTab === 'appearance' && (
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-sm font-medium text-text-primary mb-4">Theme</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        {THEMES.map((t) => (
                                            <button
                                                key={t.id}
                                                onClick={() => setTheme(t.id)}
                                                className={`group relative p-3 rounded-lg border-2 text-left transition-all hover:bg-bg-2 ${theme === t.id ? 'border-accent bg-bg-2' : 'border-border'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3 mb-2">
                                                    <div
                                                        className="w-6 h-6 rounded-full border border-border shadow-sm"
                                                        style={{ background: t.color }}
                                                    />
                                                    <span className={`text-sm font-medium ${theme === t.id ? 'text-text-primary' : 'text-text-secondary'}`}>
                                                        {t.name}
                                                    </span>
                                                </div>
                                                {theme === t.id && (
                                                    <div className="absolute top-3 right-3 text-accent">
                                                        <Check size={16} />
                                                    </div>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'editor' && (
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-sm font-medium text-text-primary mb-4">Font Settings</h3>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <label className="text-sm text-text-secondary">Font Size</label>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    value={editorFontSize}
                                                    onChange={(e) => setEditorFontSize(Number(e.target.value))}
                                                    className="w-16 bg-bg-2 border border-border rounded px-2 py-1 text-sm text-center focus:border-accent outline-none"
                                                />
                                                <span className="text-xs text-text-secondary">px</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t border-border pt-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="text-sm font-medium text-text-primary">Word Wrap</h4>
                                            <p className="text-xs text-text-secondary">Wrap long lines in the editor</p>
                                        </div>
                                        <button
                                            onClick={toggleWordWrap}
                                            className={`w-10 h-5 rounded-full transition-colors relative ${wordWrap ? 'bg-accent' : 'bg-bg-3'}`}
                                        >
                                            <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-transform ${wordWrap ? 'left-6' : 'left-1'}`} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
