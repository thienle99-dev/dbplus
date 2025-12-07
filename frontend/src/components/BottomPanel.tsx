import { useState, useRef, useEffect } from 'react';
import { Code, ChevronDown, ChevronUp } from 'lucide-react';
import { LogViewer } from './LogViewer';

type TabType = 'sql';

interface BottomPanelProps {
    connectionId?: string;
    schema?: string;
    table?: string;
}

export function BottomPanel({ }: BottomPanelProps) {
    const [activeTab, setActiveTab] = useState<TabType>('sql');
    const [isOpen, setIsOpen] = useState(false);
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
