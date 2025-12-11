import React from 'react';
import { Play, Save, Eraser, Book } from 'lucide-react';


interface QueryToolbarProps {
    onExecute: () => void;
    onSave: () => void;
    onClear: () => void;
    onOpenSnippets: () => void;
    loading: boolean;
    queryTrimmed: string;
    hasSelection: boolean;
    savedQueryId?: string;
    queryName?: string;
    isDraft?: boolean;
}

export const QueryToolbar: React.FC<QueryToolbarProps> = ({
    onExecute,
    onSave,
    onClear,
    onOpenSnippets,
    loading,
    queryTrimmed,
    hasSelection,
    savedQueryId,
    queryName,
    isDraft
}) => {
    return (
        <div className="h-10 px-3 border-b border-border bg-bg-0/50 backdrop-blur-md flex items-center justify-between sticky top-0 z-20">
            <div className="flex items-center gap-2">
                <button
                    onClick={onExecute}
                    disabled={loading || !queryTrimmed}
                    className="group relative flex items-center gap-1.5 bg-gradient-to-b from-pink-500 to-pink-600 hover:from-pink-400 hover:to-pink-500 text-white px-3 py-1.5 rounded-md text-xs font-bold shadow-md shadow-pink-500/20 hover:shadow-pink-500/40 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed transition-all duration-200 active:scale-95"
                    title={hasSelection ? "Run selected query (Cmd/Ctrl+Enter)" : "Run entire query (Cmd/Ctrl+Enter)"}
                >
                    <Play size={13} className={`fill-current ${loading ? 'animate-pulse' : ''}`} />
                    <span>{loading ? 'Running...' : hasSelection ? 'Run Selection' : 'Run'}</span>
                    <div className="absolute inset-0 rounded-md bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>

                <div className="w-px h-4 bg-border mx-1" />

                <button
                    onClick={onSave}
                    disabled={!queryTrimmed}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-bg-2 disabled:opacity-50 transition-all duration-200"
                    title={savedQueryId ? `Save changes to "${queryName}" (Cmd/Ctrl+S)` : "Save as new query (Cmd/Ctrl+S)"}
                >
                    <Save size={14} />
                    <span>{savedQueryId ? 'Save' : 'Save As'}</span>
                </button>

                <button
                    onClick={onClear}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-text-secondary hover:text-error hover:bg-error/10 transition-all duration-200"
                >
                    <Eraser size={14} />
                    <span>Clear</span>
                </button>

                <div className="w-px h-4 bg-border mx-1" />

                <button
                    onClick={onOpenSnippets}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-text-secondary hover:text-accent hover:bg-bg-2 transition-all duration-200"
                    title="Open Snippet Library"
                >
                    <Book size={14} />
                    <span>Snippets</span>
                </button>
            </div>

            <div className="flex items-center gap-3">
                {isDraft && (
                    <span className="text-[10px] uppercase tracking-wider text-yellow-500 flex items-center gap-1 font-bold px-1.5 py-0.5 bg-yellow-500/10 rounded-sm select-none" title="Query is auto-saved locally">
                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
                        Draft
                    </span>
                )}
            </div>
        </div>
    );
};
