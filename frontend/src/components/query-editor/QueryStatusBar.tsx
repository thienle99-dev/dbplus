import React from 'react';
import { Code, LayoutTemplate } from 'lucide-react';

interface QueryStatusBarProps {
    mode: 'sql' | 'visual';
    setMode: (mode: 'sql' | 'visual') => void;
    onFormat: () => void;
    queryTrimmed: string;
}

export const QueryStatusBar: React.FC<QueryStatusBarProps> = ({
    mode,
    setMode,
    onFormat,
    queryTrimmed
}) => {
    return (
        <div className="h-8 border-t border-border-subtle bg-bg-1 glass flex items-center px-3 justify-between select-none">
            <div className="flex items-center gap-2">
                <button
                    onClick={onFormat}
                    disabled={!queryTrimmed}
                    className="p-1 px-2 hover:bg-bg-2 rounded-md text-text-secondary hover:text-text-primary transition-all disabled:opacity-50 text-[10px] uppercase font-bold tracking-wider"
                    title="Format SQL (Cmd+K)"
                >
                    Format
                </button>
            </div>

            <div className="flex items-center p-0.5 bg-bg-2 rounded-lg border border-border-light">
                <button
                    onClick={() => setMode('sql')}
                    className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md transition-all text-[11px] font-medium ${mode === 'sql' ? 'text-accent bg-bg-0 shadow-sm' : 'text-text-secondary hover:text-text-primary hover:bg-bg-2'}`}
                    title="SQL View"
                >
                    <Code size={12} />
                    <span>SQL</span>
                </button>
                <button
                    onClick={() => setMode('visual')}
                    className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md transition-all text-[11px] font-medium ${mode === 'visual' ? 'text-accent bg-bg-0 shadow-sm' : 'text-text-secondary hover:text-text-primary hover:bg-bg-2'}`}
                    title="Visual Builder"
                >
                    <LayoutTemplate size={12} />
                    <span>Visual</span>
                </button>
            </div>
        </div>
    );
};
