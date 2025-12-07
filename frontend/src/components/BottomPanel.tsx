import { useState, useRef, useEffect } from 'react';
import { Database, FileText, User, Code, ChevronDown, ChevronUp } from 'lucide-react';
import { LogViewer } from './LogViewer';

type TabType = 'data' | 'structure' | 'row' | 'sql';

interface BottomPanelProps {
    connectionId?: string;
    schema?: string;
    table?: string;
}

export function BottomPanel({ connectionId, schema, table }: BottomPanelProps) {
    const [activeTab, setActiveTab] = useState<TabType>('sql');
    const [isOpen, setIsOpen] = useState(true);
    const [panelHeight, setPanelHeight] = useState(() => {
        const saved = localStorage.getItem('bottom-panel-height');
        return saved ? parseInt(saved, 10) : 300;
    });
    const [isResizing, setIsResizing] = useState(false);
    const panelHeightRef = useRef(panelHeight);

    useEffect(() => {
        panelHeightRef.current = panelHeight;
    }, [panelHeight]);

    useEffect(() => {
        if (isResizing) {
            const handleMouseMove = (e: MouseEvent) => {
                const newHeight = window.innerHeight - e.clientY;
                const constrainedHeight = Math.max(150, Math.min(600, newHeight));
                setPanelHeight(constrainedHeight);
            };

            const handleMouseUp = () => {
                setIsResizing(false);
                localStorage.setItem('bottom-panel-height', panelHeightRef.current.toString());
            };

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'row-resize';
            document.body.style.userSelect = 'none';

            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                localStorage.setItem('bottom-panel-height', panelHeightRef.current.toString());
            };
        }
    }, [isResizing]);

    if (!isOpen) {
        return (
            <div className="fixed bottom-0 left-0 right-0 z-40 bg-bg-1 border-t border-border">
                <button
                    onClick={() => setIsOpen(true)}
                    className="w-full px-4 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-2 flex items-center justify-center gap-2"
                >
                    <ChevronUp size={14} />
                    Show Panel
                </button>
            </div>
        );
    }

    return (
        <div
            className="fixed bottom-0 left-0 right-0 z-40 bg-bg-1 border-t border-border flex flex-col"
            style={{ height: `${panelHeight}px` }}
        >
            {/* Resize Handle */}
            <div
                className="absolute top-0 left-0 right-0 h-1 cursor-row-resize hover:bg-accent/50 z-50 transition-colors"
                onMouseDown={(e) => {
                    e.preventDefault();
                    setIsResizing(true);
                }}
                title="Drag to resize"
            />

            {/* Tabs Header */}
            <div className="flex items-center justify-between border-b border-border bg-bg-2/50 px-2">
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setActiveTab('data')}
                        className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors ${activeTab === 'data'
                            ? 'text-accent border-b-2 border-accent bg-bg-1'
                            : 'text-text-secondary hover:text-text-primary hover:bg-bg-2'
                            }`}
                        title="Data view"
                    >
                        <Database size={12} />
                        Data
                    </button>
                    <button
                        onClick={() => setActiveTab('structure')}
                        className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors ${activeTab === 'structure'
                            ? 'text-accent border-b-2 border-accent bg-bg-1'
                            : 'text-text-secondary hover:text-text-primary hover:bg-bg-2'
                            }`}
                        title="Table structure"
                    >
                        <FileText size={12} />
                        Structure
                    </button>
                    <button
                        onClick={() => setActiveTab('row')}
                        className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors ${activeTab === 'row'
                            ? 'text-accent border-b-2 border-accent bg-bg-1'
                            : 'text-text-secondary hover:text-text-primary hover:bg-bg-2'
                            }`}
                        title="Selected row details"
                    >
                        <User size={12} />
                        Row
                    </button>
                    <button
                        onClick={() => setActiveTab('sql')}
                        className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors ${activeTab === 'sql'
                            ? 'text-accent border-b-2 border-accent bg-bg-1'
                            : 'text-text-secondary hover:text-text-primary hover:bg-bg-2'
                            }`}
                        title="Network logs"
                    >
                        <Code size={12} />
                        Logs
                    </button>
                </div>
                <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 text-text-secondary hover:text-text-primary hover:bg-bg-2 rounded"
                    title="Hide panel"
                >
                    <ChevronDown size={14} />
                </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden">
                {activeTab === 'data' && (
                    <div className="h-full p-2 overflow-auto">
                        <div className="text-xs text-text-secondary">
                            Current table view (integrate with main table component)
                        </div>
                    </div>
                )}
                {activeTab === 'structure' && (
                    <div className="h-full overflow-auto">
                        <StructureTab connectionId={connectionId} schema={schema} table={table} />
                    </div>
                )}
                {activeTab === 'row' && (
                    <div className="h-full p-2 overflow-auto">
                        <div className="text-xs text-text-secondary">
                            Selected row details will appear here
                        </div>
                    </div>
                )}
                {activeTab === 'sql' && (
                    <div className="h-full flex flex-col">
                        <LogViewer />
                    </div>
                )}
            </div>
        </div>
    );
}

// Structure Tab Component
function StructureTab({ connectionId, schema, table }: { connectionId?: string; schema?: string; table?: string }) {
    return (
        <div className="p-2" key={connectionId}>
            <div className="text-xs text-text-secondary mb-2">
                Table: {schema}.{table}
            </div>
            <div className="text-[10px] text-text-secondary">
                Column structure will be displayed here
            </div>
        </div>
    );
}
