import { useState, useRef, useEffect } from 'react';
import ERDiagram from './er-diagram/ERDiagram';
import { Network, X, Maximize2 } from 'lucide-react';

interface ERDiagramModalProps {
    isOpen: boolean;
    onClose: () => void;
    connectionId: string;
    schema: string;
    onTableClick?: (tableName: string, schema: string) => void;
}

export default function ERDiagramModal({
    isOpen,
    onClose,
    connectionId,
    schema,
    onTableClick,
}: ERDiagramModalProps) {
    const [size, setSize] = useState({ width: 1200, height: 800 });
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const modalRef = useRef<HTMLDivElement>(null);

    // Center modal on open
    useEffect(() => {
        if (isOpen && modalRef.current) {
            const rect = modalRef.current.getBoundingClientRect();
            setPosition({
                x: (window.innerWidth - rect.width) / 2,
                y: (window.innerHeight - rect.height) / 2,
            });
        }
    }, [isOpen]);

    const handleTableClick = (tableName: string, tableSchema: string) => {
        if (onTableClick) {
            onTableClick(tableName, tableSchema);
        }
        onClose();
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('.modal-header')) {
            setIsDragging(true);
            setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
        }
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (isDragging) {
            setPosition({
                x: e.clientX - dragStart.x,
                y: e.clientY - dragStart.y,
            });
        }
        if (isResizing) {
            setSize({
                width: Math.max(800, e.clientX - position.x),
                height: Math.max(600, e.clientY - position.y),
            });
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        setIsResizing(false);
    };

    useEffect(() => {
        if (isDragging || isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, isResizing, dragStart, position]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div
                ref={modalRef}
                className="bg-bg-1/80 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl flex flex-col overflow-hidden ring-1 ring-white/5"
                style={{
                    width: size.width,
                    height: size.height,
                    position: 'absolute',
                    left: position.x,
                    top: position.y,
                }}
                onMouseDown={handleMouseDown}
            >
                {/* Header */}
                <div className="modal-header flex items-center justify-between px-4 py-3 bg-white/5 border-b border-white/10 cursor-move">
                    <div className="flex items-center gap-2">
                        <Network size={18} className="text-accent" />
                        <span className="font-semibold text-text-primary">ER Diagram - {schema}</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-bg-2 rounded transition-colors"
                    >
                        <X size={18} className="text-text-secondary" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden">
                    <ERDiagram
                        connectionId={connectionId}
                        schema={schema}
                        onTableClick={handleTableClick}
                    />
                </div>

                {/* Resize Handle */}
                <div
                    className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
                    onMouseDown={(e) => {
                        e.stopPropagation();
                        setIsResizing(true);
                    }}
                >
                    <Maximize2 size={14} className="text-text-tertiary rotate-90" />
                </div>
            </div>
        </div>
    );
}
