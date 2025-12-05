import React, { useRef, useEffect } from 'react';

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
        <div className="px-4 py-3 bg-[#3a3a3a] border-b border-black/20">
            <div className="flex items-center gap-2">
                {/* Add Button */}
                <button
                    onClick={onAdd}
                    className="w-8 h-8 flex items-center justify-center rounded-md bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors flex-shrink-0"
                    title="Create connection"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                </button>

                {/* Search Input */}
                <div className="flex-1 relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <input
                        ref={inputRef}
                        type="text"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder="Search for connection... (⌘F)"
                        className="w-full h-8 pl-9 pr-3 bg-[#2a2a2a] border border-white/10 rounded-md text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:bg-[#323232] transition-colors"
                    />
                </div>
            </div>
        </div>
    );
};
