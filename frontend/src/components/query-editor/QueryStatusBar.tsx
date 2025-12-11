import React from 'react';
import { AlignLeft, Code, LayoutTemplate } from 'lucide-react';

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
        <div className="h-8 border-t border-border bg-bg-1 flex items-center px-3 justify-between select-none">
            <div className="flex items-center gap-2">
                <button
                    onClick={onFormat}
                    disabled={!queryTrimmed}
                    className="p-1.5 hover:bg-bg-3 rounded-md text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
                    title="Format SQL (Cmd+K)"
                >
                    <AlignLeft size={14} />
                </button>
            </div>

            <div className="flex items-center gap-1">
                <button
                    onClick={() => setMode('sql')}
                    className={`p-1.5 rounded-md transition-colors ${mode === 'sql' ? 'text-accent bg-accent/10' : 'text-text-secondary hover:text-text-primary hover:bg-bg-3'}`}
                    title="SQL View"
                >
                    <Code size={14} />
                </button>
                <button
                    onClick={() => setMode('visual')}
                    className={`p-1.5 rounded-md transition-colors ${mode === 'visual' ? 'text-accent bg-accent/10' : 'text-text-secondary hover:text-text-primary hover:bg-bg-3'}`}
                    title="Visual Builder"
                >
                    <LayoutTemplate size={14} />
                </button>
            </div>
        </div>
    );
};
