import React, { useEffect, useRef, useState } from 'react';
import { Play, Save, Eraser, Book, ChevronDown, AlignLeft, Activity, MoreHorizontal } from 'lucide-react';
import Button from '../ui/Button';

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
    onToggleAnalyze
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
        <div className="h-12 px-3 md:px-4 border-b border-border/40 bg-bg-1/80 backdrop-blur-md flex items-center justify-between sticky top-0 z-20 shadow-sm gap-2">
            <div className="flex items-center gap-2">
                <Button
                    onClick={onExecute}
                    disabled={loading || !queryTrimmed}
                    variant="primary"
                    size="sm"
                    className="shadow-md shadow-accent/20 flex-shrink-0"
                    icon={<Play size={14} className={loading ? 'animate-pulse' : ''} fill="currentColor" />}
                    title={hasSelection ? "Run selected query (Cmd/Ctrl+Enter)" : "Run entire query (Cmd/Ctrl+Enter)"}
                >
                    <span className="whitespace-nowrap">{loading ? 'Running...' : hasSelection ? 'Run Selection' : 'Run'}</span>
                </Button>

                <div className="relative flex items-center gap-1 flex-shrink-0" ref={explainMenuRef}>
                    <div className="flex bg-bg-2/50 rounded-full border border-border/60 p-0.5">
                        <button
                            onClick={onExplain}
                            disabled={loading || !queryTrimmed}
                            className="flex items-center gap-1.5 px-3 py-1 rounded-l-full hover:bg-bg-0 text-text-primary text-xs font-medium disabled:opacity-50 transition-colors whitespace-nowrap"
                            title={`Explain query execution plan (Cmd/Ctrl+E)${analyzeEnabled ? ' - ANALYZE Enabled' : ''}`}
                        >
                            <span className={`text-[10px] font-mono border rounded px-0.5 ${analyzeEnabled ? 'border-accent text-accent' : 'border-text-secondary/50 text-text-secondary'}`}>EX</span>
                            Explain
                        </button>
                        <div className="w-px bg-border/40 my-1" />
                        <button
                            disabled={loading || !queryTrimmed}
                            className="flex items-center px-1.5 py-1 rounded-r-full hover:bg-bg-0 text-text-secondary hover:text-text-primary disabled:opacity-50 transition-colors"
                            onClick={() => setIsExplainMenuOpen(!isExplainMenuOpen)}
                        >
                            <ChevronDown size={12} />
                        </button>
                    </div>

                    {isExplainMenuOpen && (
                        <div className="absolute top-full left-0 mt-2 w-48 bg-bg-1 border border-border/40 rounded-xl shadow-xl z-40 py-1 overflow-hidden backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100 ring-1 ring-black/5">
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
                    <div className={`flex rounded-full border p-0.5 transition-colors ${analyzeEnabled ? 'bg-accent/10 border-accent/20' : 'bg-bg-2/50 border-border/60'}`}>
                        <button
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors flex-shrink-0 ${analyzeEnabled ? 'text-accent' : 'text-text-secondary hover:text-text-primary hover:bg-bg-0'}`}
                            onClick={onToggleAnalyze}
                            title="Toggle ANALYZE option"
                        >
                            <Activity size={13} strokeWidth={2} />
                            <span className="hidden lg:inline">Analyze</span>
                        </button>
                    </div>
                )}

                <div className="w-px h-5 bg-border/40 mx-1 flex-shrink-0" />

                {/* Secondary Actions (Desktop) */}
                <div className="hidden md:flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onSave}
                        disabled={!queryTrimmed}
                        icon={<Save size={14} />}
                        title={savedQueryId ? `Save changes to "${queryName}"(Cmd / Ctrl + S)` : "Save as new query (Cmd/Ctrl+S)"}
                        className="flex-shrink-0"
                    >
                        <span className="hidden lg:inline">{savedQueryId ? 'Save' : 'Save As'}</span>
                    </Button>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClear}
                        icon={<Eraser size={14} />}
                        className="hover:text-red-500 hover:bg-red-500/10 flex-shrink-0"
                        title="Clear Editor"
                    >
                        <span className="hidden lg:inline">Clear</span>
                    </Button>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onFormat}
                        disabled={!queryTrimmed}
                        icon={<AlignLeft size={14} />}
                        title="Format SQL (Ctrl+Shift+F)"
                        className="flex-shrink-0"
                    >
                        <span className="hidden lg:inline">Format</span>
                    </Button>

                    <div className="w-px h-5 bg-border/40 mx-1 flex-shrink-0" />

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onOpenSnippets}
                        icon={<Book size={14} />}
                        className="flex-shrink-0"
                        title="Snippets Library"
                    >
                        <span className="hidden lg:inline">Snippets</span>
                    </Button>
                </div>

                {/* Mobile/Tablet More Dropdown */}
                <div className="md:hidden relative" ref={moreMenuRef}>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                        icon={<MoreHorizontal size={16} />}
                        title="More actions"
                        className={isMoreMenuOpen ? 'bg-bg-2 text-text-primary' : ''}
                    />

                    {isMoreMenuOpen && (
                        <div className="absolute top-full left-0 mt-2 w-40 bg-bg-1 border border-border/40 rounded-xl shadow-xl z-40 py-1 overflow-hidden backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100 ring-1 ring-black/5">
                            <button
                                onClick={() => { onSave(); setIsMoreMenuOpen(false); }}
                                disabled={!queryTrimmed}
                                className="w-full text-left px-4 py-2 text-xs flex items-center gap-3 hover:bg-bg-2 text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
                            >
                                <Save size={14} />
                                <span>{savedQueryId ? 'Save' : 'Save As'}</span>
                            </button>
                            <button
                                onClick={() => { onFormat(); setIsMoreMenuOpen(false); }}
                                disabled={!queryTrimmed}
                                className="w-full text-left px-4 py-2 text-xs flex items-center gap-3 hover:bg-bg-2 text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
                            >
                                <AlignLeft size={14} />
                                <span>Format</span>
                            </button>
                            <button
                                onClick={() => { onOpenSnippets(); setIsMoreMenuOpen(false); }}
                                className="w-full text-left px-4 py-2 text-xs flex items-center gap-3 hover:bg-bg-2 text-text-secondary hover:text-text-primary transition-colors"
                            >
                                <Book size={14} />
                                <span>Snippets</span>
                            </button>
                            <div className="h-px bg-border/40 my-1 mx-2" />
                            <button
                                onClick={() => { onClear(); setIsMoreMenuOpen(false); }}
                                className="w-full text-left px-4 py-2 text-xs flex items-center gap-3 hover:bg-error/10 text-text-secondary hover:text-red-500 transition-colors"
                            >
                                <Eraser size={14} />
                                <span>Clear</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
                {isDraft && (
                    <span className="text-[10px] uppercase tracking-wider text-amber-500 flex items-center gap-1.5 font-bold px-2 py-1 bg-amber-500/10 rounded-full select-none shadow-sm border border-amber-500/20" title="Query is auto-saved locally">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        <span className="hidden sm:inline">Draft</span>
                    </span>
                )}
            </div>
        </div>
    );
};
