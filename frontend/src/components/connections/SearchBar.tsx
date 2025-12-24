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
        <div className="px-6 py-3 sticky top-0 z-10">
            <div className="flex items-center gap-6">
                {/* Search Input */}
                <div className="flex-1 relative group max-w-2xl">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-[var(--color-primary-default)] transition-colors" size={18} />
                    <input
                        ref={inputRef}
                        type="text"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder="Search connections... (⌘F)"
                        className="w-full bg-bg-2 border border-border-light focus:border-[var(--color-primary-default)] focus:bg-bg-0 rounded-[20px] py-2.5 pl-12 pr-4 text-[14px] font-medium text-text-primary placeholder:text-text-disabled outline-none transition-all glass shadow-sm ring-1 ring-border-light"
                    />
                </div>

                {/* Add Button */}
                <button
                    onClick={onAdd}
                    className="h-10 px-5 flex items-center gap-2 bg-gradient-to-r from-[var(--color-primary-default)] to-[var(--color-primary-active)] hover:opacity-90 text-white rounded-[20px] font-bold text-xs tracking-wide transition-all shadow-md hover:shadow-lg active:scale-95"
                >
                    <Plus size={18} strokeWidth={3} />
                    <span>NEW CONNECTION</span>
                </button>
            </div>
        </div>
    );
};
