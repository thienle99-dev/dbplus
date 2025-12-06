import { useState } from 'react';
import { Info, X } from 'lucide-react';

export default function RightSidebar() {
    // const [activeTab, setActiveTab] = useState<'details' | 'assistant'>('assistant'); // Removed
    const [isOpen, setIsOpen] = useState(true);

    if (!isOpen) {
        return (
            <div className="w-10 border-l border-border bg-bg-1 flex flex-col items-center py-2 gap-2">
                <button
                    onClick={() => setIsOpen(true)}
                    className="p-2 text-text-secondary hover:text-text-primary hover:bg-bg-2 rounded"
                    title="Open Sidebar"
                >
                    <Info size={18} />
                </button>
            </div>
        );
    }

    return (
        <div className="w-72 border-l border-border bg-bg-1 flex flex-col h-full transition-all duration-300">
            {/* Header Tabs */}
            <div className="flex items-center border-b border-border bg-bg-2/50">
                <div className="flex-1 px-4 py-2 text-sm font-medium flex items-center justify-center gap-2 border-b-2 border-accent text-accent bg-bg-1">
                    <Info size={14} />
                    Details
                </div>
                <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 ml-1 text-text-secondary hover:text-text-primary hover:bg-bg-2"
                >
                    <X size={14} />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
                <div className="text-center text-text-secondary text-sm mt-10">
                    <Info size={32} className="mx-auto mb-2 opacity-50" />
                    <p>Select an object to view details</p>
                </div>
            </div>
        </div>
    );
}
