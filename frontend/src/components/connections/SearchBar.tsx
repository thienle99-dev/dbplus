import React, { useRef, useEffect } from 'react';
import { Plus, Search } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';

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
        <div className="px-4 py-3 bg-bg-2 glass border-b border-border-light sticky top-0 z-10">
            <div className="flex items-center gap-3">
                {/* Add Button */}
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onAdd}
                    className="w-8 h-8 rounded-full !px-0"
                    title="Create connection"
                    icon={<Plus size={18} />}
                />

                {/* Search Input */}
                <div className="flex-1">
                    <Input
                        ref={inputRef}
                        type="text"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder="Search for connection... (⌘F)"
                        leftIcon={<Search size={16} />}
                        fullWidth
                    />
                </div>
            </div>
        </div>
    );
};
