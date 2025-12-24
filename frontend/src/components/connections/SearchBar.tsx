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
        <div className="px-10 py-6 sticky top-0 z-10">
            <div className="flex items-center gap-6">
                {/* Search Input */}
                <div className="flex-1 relative group max-w-2xl">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-indigo-400 transition-colors" size={18} />
                    <input
                        ref={inputRef}
                        type="text"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder="Search connections... (⌘F)"
                        className="w-full bg-white/5 border border-white/5 focus:border-[var(--color-primary-default)] focus:bg-white/10 rounded-[20px] py-3.5 pl-12 pr-4 text-[15px] font-medium text-white placeholder:text-white/20 outline-none transition-all glass shadow-none ring-1 ring-white/5"
                    />
                </div>

                {/* Add Button */}
                <button
                    onClick={onAdd}
                    className="h-12 px-6 flex items-center gap-2 bg-gradient-to-r from-[var(--color-primary-default)] to-[var(--color-primary-active)] hover:opacity-90 text-white rounded-[20px] font-bold text-sm tracking-wide transition-all shadow-[0_4px_15px_var(--color-primary-transparent)] hover:shadow-[0_8px_25px_var(--color-primary-transparent)] active:scale-95"
                >
                    <Plus size={18} strokeWidth={3} />
                    <span>NEW CONNECTION</span>
                </button>
            </div>
        </div>
    );
};
