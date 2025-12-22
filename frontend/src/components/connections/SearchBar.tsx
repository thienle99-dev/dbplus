import React, { useRef, useEffect } from 'react';
import { Plus, Search } from 'lucide-react';

interface SearchBarProps {
    value: string;
    onChange: (value: string) => void;
    onAdd: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({ value, onChange, onAdd }) => {
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
                e.preventDefault();
                inputRef.current?.focus();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <div className="px-6 py-4 bg-bg-1/40 sticky top-0 z-10 backdrop-blur-md">
            <div className="flex items-center gap-4">
                {/* Add Button */}
                <button
                    onClick={onAdd}
                    className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-bg-2 rounded-lg transition-all"
                    title="Create connection"
                >
                    <Plus size={20} />
                </button>

                {/* Search Input */}
                <div className="flex-1 relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-accent transition-colors" size={16} />
                    <input
                        ref={inputRef}
                        type="text"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder="Search for connection... (⌘F)"
                        className="w-full bg-bg-2/50 border border-border-subtle focus:border-accent/50 focus:ring-4 focus:ring-accent/10 rounded-xl py-2 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-muted outline-none transition-all"
                    />
                </div>
            </div>
        </div>
    );
};
