import React from 'react';
import { Search, X } from 'lucide-react';

export interface SearchBarProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    onClear?: () => void;
}

export default function SearchBar({
    value,
    onChange,
    placeholder = 'Search...',
    className = '',
    onClear,
}: SearchBarProps) {
    const handleClear = () => {
        onChange('');
        onClear?.();
    };

    return (
        <div className={`relative ${className}`}>
            {/* Search Icon */}
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
                <Search size={16} />
            </div>

            {/* Input */}
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="
          w-full
          h-[var(--input-height)]
          pl-10
          pr-10
          rounded-[var(--input-radius)]
          border border-[var(--input-border)]
          bg-white
          text-[var(--font-size-base)]
          text-[var(--color-text)]
          placeholder:text-[var(--color-text-muted)]
          transition-all
          focus:outline-none
          focus:ring-2
          focus:ring-[var(--input-focus-ring)]
          focus:ring-opacity-50
          focus:border-transparent
        "
            />

            {/* Clear Button */}
            {value && (
                <button
                    onClick={handleClear}
                    className="
            absolute right-3 top-1/2 -translate-y-1/2
            text-[var(--color-text-muted)]
            hover:text-[var(--color-text)]
            transition-colors
          "
                    aria-label="Clear search"
                >
                    <X size={16} />
                </button>
            )}
        </div>
    );
}
