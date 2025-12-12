import React, { useState, useEffect, useRef } from 'react';

interface EditableCellProps {
    value: any;
    onSave: (newValue: any) => void;
    type: 'string' | 'number' | 'boolean' | 'json' | 'null';
    isEditable: boolean;
}

export const EditableCell: React.FC<EditableCellProps> = ({ value, onSave, isEditable }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [currentValue, setCurrentValue] = useState(value);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setCurrentValue(value);
    }, [value]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isEditing]);

    const handleBlur = () => {
        setIsEditing(false);
        if (currentValue !== value) {
            onSave(currentValue);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleBlur();
        } else if (e.key === 'Escape') {
            setCurrentValue(value);
            setIsEditing(false);
        }
    };

    if (!isEditable) {
        return (
            <span className="block px-2 py-1 truncate" title={String(value)}>
                {value === null ? <span className="text-gray-400 italic">null</span> : String(value)}
            </span>
        );
    }

    if (isEditing) {
        return (
            <input
                ref={inputRef}
                className="w-full h-full px-2 py-1 bg-bg-2 border border-primary-default outline-none text-text-primary text-xs"
                value={currentValue === null ? '' : String(currentValue)}
                onChange={(e) => setCurrentValue(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
            />
        );
    }

    return (
        <div
            className="w-full h-full px-2 py-1 cursor-text hover:bg-bg-3/50 truncate"
            onClick={() => setIsEditing(true)}
            title={String(value)}
        >
            {value === null ? <span className="text-gray-400 italic">null</span> : String(value)}
        </div>
    );
};
