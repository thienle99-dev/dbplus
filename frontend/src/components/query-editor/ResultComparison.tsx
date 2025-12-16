
import React, { useMemo, useState } from 'react';
import { DiffResult, RowDiff } from '../../utils/resultDiff';
import { Filter } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';

interface ResultComparisonProps {
    diff: DiffResult;
    columns: any[];
    onClose?: () => void;
}

export function ResultComparison({ diff, columns, onClose }: ResultComparisonProps) {
    const parentRef = React.useRef<HTMLDivElement>(null);
    const [filter, setFilter] = useState<'all' | 'changes'>('all');

    const filteredRows = useMemo(() => {
        if (filter === 'all') return diff.rows;
        return diff.rows.filter(r => r.type !== 'unchanged');
    }, [diff.rows, filter]);

    const rowVirtualizer = useVirtualizer({
        count: filteredRows.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 35,
        overscan: 20,
    });

    const getRowStyle = (type: RowDiff['type']) => {
        switch (type) {
            case 'added': return 'bg-green-500/10 hover:bg-green-500/20';
            case 'removed': return 'bg-red-500/10 hover:bg-red-500/20 opacity-70';
            case 'modified': return 'bg-yellow-500/10 hover:bg-yellow-500/20';
            default: return 'hover:bg-bg-2';
        }
    };

    const getCellStyle = (row: RowDiff, colName: string) => {
        if (row.type !== 'modified' || !row.changes) return '';
        const change = row.changes.find(c => c.column === colName);
        if (change) return 'bg-yellow-500/20 text-yellow-500 font-medium';
        return '';
    };

    const getCellTitle = (row: RowDiff, colName: string) => {
        if (row.type !== 'modified' || !row.changes) return undefined;
        const change = row.changes.find(c => c.column === colName);
        if (change) return `Previous: ${String(change.oldValue)}`;
        return undefined;
    };

    return (
        <div className="flex flex-col h-full bg-bg-1">
            {/* Header / Toolbar */}
            <div className="flex items-center justify-between p-2 border-b border-border bg-bg-2">
                <div className="flex items-center gap-4">
                    <span className="font-semibold text-sm">Result Comparison</span>
                    <div className="flex items-center gap-2 text-xs">
                        <span className="text-green-500 bg-green-500/10 px-2 py-0.5 rounded">+{diff.added} Added</span>
                        <span className="text-red-500 bg-red-500/10 px-2 py-0.5 rounded">-{diff.removed} Removed</span>
                        <span className="text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded">~{diff.modified} Modified</span>
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => setFilter(filter === 'all' ? 'changes' : 'all')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs border ${
                            filter === 'changes' 
                                ? 'bg-accent/10 border-accent text-accent' 
                                : 'bg-bg-1 border-border text-text-secondary hover:text-text-primary'
                        }`}
                    >
                        <Filter size={12} />
                        {filter === 'changes' ? 'Showing Changes only' : 'Show All Rows'}
                    </button>
                    {onClose && (
                        <button onClick={onClose} className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary">
                            Close Comparison
                        </button>
                    )}
                </div>
            </div>

            {/* Virtualized Table */}
            <div ref={parentRef} className="flex-1 overflow-auto relative">
                <div
                    style={{
                        height: `${rowVirtualizer.getTotalSize()}px`,
                        width: '100%',
                        position: 'relative',
                    }}
                >
                    {/* Header Row (sticky not easily doable with pure absolute positioning without sticky handling, 
                        so we usually render header outside. But for horizontal scroll sync it is tricky.
                        Let's try simple layout first: Fixed Header outside, sync scroll maybe? 
                        For now, simple approach: Render header inside but strictly positioned? 
                        No, let's just make it a simple table structure for V1.
                    */}
                    {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                        const row = filteredRows[virtualRow.index];
                        return (
                            <div
                                key={virtualRow.index}
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: `${virtualRow.size}px`,
                                    transform: `translateY(${virtualRow.start}px)`,
                                }}
                                className={`flex items-center border-b border-border/50 text-xs font-mono whitespace-nowrap px-4 ${getRowStyle(row.type)}`}
                            >
                                <div className="w-8 shrink-0 text-text-tertiary select-none">
                                    {row.type === 'removed' ? '-' : row.rowIndex + 1}
                                </div>
                                <div className="w-8 shrink-0 select-none mr-2">
                                     {row.type === 'added' && <span className="text-green-500 font-bold">+</span>}
                                     {row.type === 'removed' && <span className="text-red-500 font-bold">-</span>}
                                     {row.type === 'modified' && <span className="text-yellow-500 font-bold">~</span>}
                                </div>
                                {columns.map((col, cIdx) => (
                                    <div 
                                        key={cIdx} 
                                        className={`w-[150px] shrink-0 truncate px-2 border-l border-border/10 ${getCellStyle(row, col.name)}`}
                                        title={getCellTitle(row, col.name) || String(row.data[col.name])}
                                    >
                                        {String(row.data[col.name] ?? 'NULL')}
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                </div>
            </div>
            
            {/* Header Overlay (Pseudo) - a simple way to show headers */}
            <div className="absolute top-[41px] left-0 right-0 bg-bg-1 border-b border-border flex text-xs font-bold text-text-secondary px-4 h-8 items-center pointer-events-none z-10">
                <div className="w-8 shrink-0">#</div>
                <div className="w-8 shrink-0 mr-2"></div>
                 {columns.map((col, cIdx) => (
                    <div key={cIdx} className="w-[150px] shrink-0 px-2 border-l border-transparent">
                        {col.name}
                    </div>
                ))}
            </div>
        </div>
    );
}
