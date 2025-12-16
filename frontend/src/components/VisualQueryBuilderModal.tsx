import { X } from 'lucide-react';
import { useEffect } from 'react';
import VisualQueryBuilderEnhanced from './VisualQueryBuilderEnhanced';

interface VisualQueryBuilderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSqlChange: (sql: string) => void;
    initialState?: {
        schema?: string;
        table: string;
        columns: string[];
        filters: any[];
        sorts: any[];
        limit: number;
    };
}

export default function VisualQueryBuilderModal({
    isOpen,
    onClose,
    onSqlChange,
    initialState,
}: VisualQueryBuilderModalProps) {
    // Close on Escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-6xl h-[90vh] mx-4 bg-bg-0 rounded-lg shadow-2xl border border-border flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-bg-1">
                    <div>
                        <h2 className="text-lg font-semibold text-text-primary">
                            Visual Query Builder
                        </h2>
                        <p className="text-xs text-text-secondary mt-1">
                            Build SQL queries visually without writing code
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-bg-2 rounded-lg transition-colors text-text-secondary hover:text-text-primary"
                        title="Close (Esc)"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden">
                    <VisualQueryBuilderEnhanced
                        onSqlChange={onSqlChange}
                        initialState={initialState}
                    />
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-bg-1">
                    <div className="text-xs text-text-secondary">
                        💡 Tip: Press <kbd className="px-2 py-1 bg-bg-2 border border-border rounded text-xs">Esc</kbd> to close
                    </div>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors font-medium text-sm"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
