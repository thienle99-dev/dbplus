import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
    value: string;
    label: string;
    icon?: React.ReactNode;
    disabled?: boolean;
}

interface SelectProps {
    value: string;
    onChange: (value: string) => void;
    options: SelectOption[];
    placeholder?: string;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    searchable?: boolean;
}

export default function Select({
    value,
    onChange,
    options,
    placeholder = 'Select...',
    className = '',
    size = 'md',
    disabled = false,
    searchable = false,
}: SelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const selectedOption = options.find(opt => opt.value === value);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchQuery('');
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen]);

    // Focus search input when dropdown opens
    useEffect(() => {
        if (isOpen && searchable && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isOpen, searchable]);

    const filteredOptions = searchable && searchQuery
        ? options.filter(opt =>
            opt.label.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : options;

    const handleSelect = (optionValue: string) => {
        onChange(optionValue);
        setIsOpen(false);
        setSearchQuery('');
    };

    const sizeClasses = {
        sm: 'px-2 py-1 text-xs',
        md: 'px-3 py-2 text-sm',
        lg: 'px-4 py-3 text-base',
    };

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={`
          w-full flex items-center justify-between gap-2
          rounded-lg bg-bg-2/50 border border-transparent
          text-text-primary shadow-sm
          transition-all duration-200
          ${sizeClasses[size]}
          ${disabled
                        ? 'opacity-50 cursor-not-allowed bg-bg-2/80'
                        : 'hover:bg-bg-2 focus:outline-none focus:bg-bg-0 focus:border-accent/40 focus:ring-4 focus:ring-accent/10'
                    }
          ${isOpen ? 'bg-bg-0 ring-4 ring-accent/10 border-accent/40' : ''}
        `}
            >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    {selectedOption?.icon && (
                        <span className="flex-shrink-0 text-text-secondary">
                            {selectedOption.icon}
                        </span>
                    )}
                    <span className={`truncate ${!selectedOption ? 'text-text-secondary' : ''}`}>
                        {selectedOption?.label || placeholder}
                    </span>
                </div>
                <ChevronDown
                    size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16}
                    className={`flex-shrink-0 text-text-secondary transition-transform duration-200 ${isOpen ? 'rotate-180' : ''
                        }`}
                />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div
                    className="
            absolute z-50 w-full mt-1
            bg-bg-2 border border-border/50 rounded-lg
            shadow-xl
            max-h-64 overflow-hidden
            animate-in fade-in slide-in-from-top-2 duration-200
          "
                >
                    {/* Search Input */}
                    {searchable && (
                        <div className="p-2 border-b border-border/50">
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search..."
                                className="
                  w-full px-3 py-1.5 text-sm
                  bg-bg-3/50 border border-transparent rounded
                  text-text-primary placeholder-text-secondary
                  focus:outline-none focus:bg-bg-0 focus:ring-2 focus:ring-accent/20
                "
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    )}

                    {/* Options List */}
                    <div className="overflow-y-auto max-h-56 py-1">
                        {filteredOptions.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-text-secondary text-center">
                                No options found
                            </div>
                        ) : (
                            filteredOptions.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => !option.disabled && handleSelect(option.value)}
                                    disabled={option.disabled}
                                    className={`
                    w-full flex items-center justify-between gap-2
                    px-3 py-2 text-sm text-left
                    transition-colors duration-150
                    ${option.disabled
                                            ? 'opacity-50 cursor-not-allowed'
                                            : 'hover:bg-bg-3 active:bg-accent/10'
                                        }
                    ${option.value === value
                                            ? 'bg-accent/10 text-accent font-medium'
                                            : 'text-text-primary'
                                        }
                  `}
                                >
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        {option.icon && (
                                            <span className="flex-shrink-0 text-text-secondary">
                                                {option.icon}
                                            </span>
                                        )}
                                        <span className="truncate">{option.label}</span>
                                    </div>
                                    {option.value === value && (
                                        <Check size={16} className="flex-shrink-0 text-accent" />
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
