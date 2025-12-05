import React, { useEffect, useRef } from 'react';

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
        <div className="flex items-center gap-3 p-4 border-b border-white/5">
            {/* Search Input */}
            <div className="flex-1 relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
                <input
                    ref={inputRef}
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="Search for connection… (⌘F)"
                    className="
            w-full pl-10 pr-4 py-2.5 
            bg-black/30 border border-white/10 rounded-lg
            text-sm text-gray-200 placeholder-gray-500
            focus:outline-none focus:border-blue-500/50 focus:bg-black/40
            transition-all duration-200
          "
                />
            </div>

            {/* Add Button */}
            <button
                onClick={onAdd}
                className="
          w-10 h-10 flex items-center justify-center
          bg-blue-600 hover:bg-blue-500 rounded-lg
          text-white transition-all duration-200
          hover:scale-105 active:scale-95
          shadow-lg hover:shadow-blue-500/50
        "
                title="Add connection"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
            </button>
        </div>
    );
};
