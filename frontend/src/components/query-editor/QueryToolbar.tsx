import React, { useEffect, useRef, useState } from 'react';
import { Play, Save, Eraser, Book, ChevronDown, AlignLeft, Activity, MoreHorizontal } from 'lucide-react';
import Button from '../ui/Button';
import Select from '../ui/Select';

interface QueryToolbarProps {
    onExecute: () => void;
    onExplain: () => void;
    onExplainAnalyze: () => void;
    onSave: () => void;
    onClear: () => void;
    onFormat: () => void;
    onOpenSnippets: () => void;
    loading: boolean;
    queryTrimmed: string;
    hasSelection: boolean;
    savedQueryId?: string;
    queryName?: string;
    isDraft?: boolean;
    analyzeEnabled?: boolean;
    onToggleAnalyze?: () => void;
    databases?: string[];
    selectedDatabase?: string;
    onDatabaseChange?: (database: string) => void;
}

export const QueryToolbar: React.FC<QueryToolbarProps> = ({
    onExecute,
    onExplain,
    onExplainAnalyze,
    onSave,
    onClear,
    onFormat,
    onOpenSnippets,
    loading,
    queryTrimmed,
    hasSelection,
    savedQueryId,
    queryName,
    isDraft,
    analyzeEnabled = false,
    onToggleAnalyze,
    databases,
    selectedDatabase,
    onDatabaseChange
}) => {
    const [isExplainMenuOpen, setIsExplainMenuOpen] = useState(false);
    const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
    const explainMenuRef = useRef<HTMLDivElement>(null);
    const moreMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (explainMenuRef.current && !explainMenuRef.current.contains(e.target as Node)) {
                setIsExplainMenuOpen(false);
            }
            if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
                setIsMoreMenuOpen(false);
            }
        };

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsExplainMenuOpen(false);
                setIsMoreMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('keydown', onKeyDown);
        };
    }, []);

    return (
        <div className="h-11 px-3 md:px-4 border-b border-border-light bg-bg-1/80 backdrop-blur-xl flex items-center justify-between sticky top-0 z-20 gap-2 shadow-sm">
            <div className="flex items-center gap-2">
                <Button
                    onClick={onExecute}
                    disabled={loading || !queryTrimmed}
                    variant="primary"
                    size="sm"
                    className="shadow-lg flex-shrink-0 h-8 rounded-xl"
                    icon={<Play size={14} className={loading ? 'animate-pulse' : ''} fill="currentColor" />}
                    title={hasSelection ? "Run selected query (Cmd/Ctrl+Enter)" : "Run entire query (Cmd/Ctrl+Enter)"}
                >
                    <span className="whitespace-nowrap">{loading ? 'Running...' : hasSelection ? 'Run Selection' : 'Run'}</span>
                </Button>

                <div className="relative flex items-center gap-0.5 flex-shrink-0" ref={explainMenuRef}>
                    <button
                        onClick={onExplain}
                        disabled={loading || !queryTrimmed}
                        className="h-8 flex items-center gap-1.5 px-3 bg-bg-2 hover:bg-bg-0 border border-border-strong rounded-l-xl text-text-primary text-xs font-medium disabled:opacity-50 transition-colors border-r-0"
                        title={`Explain query execution plan (Cmd/Ctrl+E)${analyzeEnabled ? ' - ANALYZE Enabled' : ''}`}
                    >
                        <span className={`text-[10px] font-mono border rounded px-0.5 ${analyzeEnabled ? 'border-accent text-accent' : 'border-text-tertiary text-text-secondary'}`}>EX</span>
                        <span className="text-text-secondary hover:text-text-primary">Explain</span>
                    </button>
                    <button
                        disabled={loading || !queryTrimmed}
                        className="h-8 flex items-center px-1.5 bg-bg-2 hover:bg-bg-0 border border-border-strong rounded-r-xl text-text-secondary hover:text-text-primary disabled:opacity-50 transition-colors"
                        onClick={() => setIsExplainMenuOpen(!isExplainMenuOpen)}
                    >
                        <ChevronDown size={12} />
                    </button>

                    {isExplainMenuOpen && (
                        <div className="absolute top-full left-0 mt-2 w-48 bg-bg-1 border border-border-light rounded-xl shadow-xl z-40 py-1 overflow-hidden backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100 ring-1 ring-border-subtle">
                            <button
                                className="w-full text-left px-4 py-2 text-xs flex items-center gap-2 hover:bg-bg-2 text-text-secondary hover:text-text-primary transition-colors"
                                onClick={() => {
                                    onExplain();
                                    setIsExplainMenuOpen(false);
                                }}
                            >
                                <span>Explain Plan</span>
                            </button>
                            <button
                                className="w-full text-left px-4 py-2 text-xs flex items-center gap-2 hover:bg-bg-2 text-text-secondary hover:text-text-primary transition-colors"
                                onClick={() => {
                                    onExplainAnalyze();
                                    setIsExplainMenuOpen(false);
                                }}
                                title="Run Explain Analyze (Cmd/Ctrl+Shift+E)"
                            >
                                <span>Explain Analyze (+buffers)</span>
                            </button>
                        </div>
                    )}
                </div>

                {onToggleAnalyze && (
                    <button
                        className={`h-8 flex items-center gap-1.5 px-3 rounded-xl text-xs font-medium transition-colors flex-shrink-0 border ${analyzeEnabled ? 'bg-primary-transparent border-accent text-accent' : 'bg-bg-2 border-border-strong text-text-secondary hover:text-text-primary hover:bg-bg-0'}`}
                        onClick={onToggleAnalyze}
                        title="Toggle ANALYZE option"
                    >
                        <Activity size={13} strokeWidth={2} />
                        <span className="hidden lg:inline">Analyze</span>
                    </button>
                )}

                {databases && databases.length > 0 && onDatabaseChange && (
                    <div className="w-32 flex-shrink-0">
                        <Select
                            value={selectedDatabase || ''}
                            onChange={onDatabaseChange}
                            options={databases.map(db => ({ value: db, label: db }))}
                            size="sm"
                            placeholder="Database"
                            searchable
                            className="h-8"
                        />
                    </div>
                )}

                <div className="w-px h-5 bg-border-subtle mx-1 flex-shrink-0" />

                {/* Save As Button - Always visible */}
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onSave}
                    disabled={!queryTrimmed}
                    icon={<Save size={14} />}
                    title={savedQueryId ? `Save changes to "${queryName}"(Cmd / Ctrl + S)` : "Save as new query (Cmd/Ctrl+S)"}
                    className="flex-shrink-0 h-8 rounded-xl"
                >
                    <span className="hidden lg:inline">{savedQueryId ? 'Save' : 'Save As'}</span>
                </Button>

                {/* More Actions Dropdown - Always visible */}
                <div className="relative" ref={moreMenuRef}>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                        icon={<MoreHorizontal size={16} />}
                        title="More actions"
                        className={`h-8 rounded-xl ${isMoreMenuOpen ? 'bg-bg-2 text-text-primary' : ''}`}
                    />

                    {isMoreMenuOpen && (
                        <div className="absolute top-full right-0 mt-2 w-44 bg-bg-1 border border-border-light rounded-xl shadow-xl z-40 py-1 overflow-hidden backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100 ring-1 ring-border-subtle">
                            <button
                                onClick={() => { onFormat(); setIsMoreMenuOpen(false); }}
                                disabled={!queryTrimmed}
                                className="w-full text-left px-4 py-2 text-sm flex items-center gap-3 hover:bg-bg-2 text-text-primary hover:text-text-primary transition-colors disabled:opacity-50"
                                title="Format SQL (Ctrl+Shift+F)"
                            >
                                <AlignLeft size={14} />
                                <span>Format SQL</span>
                            </button>
                            <button
                                onClick={() => { onOpenSnippets(); setIsMoreMenuOpen(false); }}
                                className="w-full text-left px-4 py-2 text-sm flex items-center gap-3 hover:bg-bg-2 text-text-primary hover:text-text-primary transition-colors"
                            >
                                <Book size={14} />
                                <span>Snippets</span>
                            </button>
                            <div className="h-px bg-border-subtle my-1 mx-2" />
                            <button
                                onClick={() => { onClear(); setIsMoreMenuOpen(false); }}
                                className="w-full text-left px-4 py-2 text-sm flex items-center gap-3 hover:bg-error-50 text-text-secondary hover:text-red-500 transition-colors"
                            >
                                <Eraser size={14} />
                                <span>Clear Editor</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
                {isDraft && (
                    <span className="text-[10px] uppercase tracking-wider text-amber-500 flex items-center gap-1.5 font-bold px-2 py-1 bg-warning-50 rounded-full select-none shadow-sm border border-warning-200" title="Query is auto-saved locally">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        <span className="hidden sm:inline">Draft</span>
                    </span>
                )}
            </div>
        </div>
    );
};
