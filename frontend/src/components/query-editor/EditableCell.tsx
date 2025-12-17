import React, { useState, useEffect, useRef } from 'react';
import { formatCellValue, isComplexType } from '../../utils/cellFormatters';

interface EditableCellProps {
    value: any;
    onSave: (newValue: any) => void;
    type: 'string' | 'number' | 'boolean' | 'json' | 'null';
    isEditable: boolean;
}

export const EditableCell: React.FC<EditableCellProps> = ({ value, onSave, isEditable }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [currentValue, setCurrentValue] = useState(formatCellValue(value));
    const inputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        setCurrentValue(formatCellValue(value));
    }, [value]);

    useEffect(() => {
        if (isEditing) {
            if (inputRef.current) inputRef.current.focus();
            if (textareaRef.current) textareaRef.current.focus();
        }
    }, [isEditing]);

    const handleBlur = () => {
        setIsEditing(false);
        // Basic check change - proper parsing logic should be in parent or here
        if (currentValue !== formatCellValue(value)) {
            onSave(currentValue);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) { // Allow shift+enter for new line in textarea
            e.preventDefault(); 
            handleBlur();
        } else if (e.key === 'Escape') {
            setCurrentValue(formatCellValue(value));
            setIsEditing(false);
        }
    };

    // Calculate display value
    const displayValue = formatCellValue(value);
    const isComplex = isComplexType(value);

    if (!isEditable) {
        return (
            <span 
                className={`block px-2 py-1 truncate ${isComplex ? 'font-mono text-xs' : ''}`} 
                title={displayValue}
            >
                {value === null ? <span className="text-gray-400 italic">null</span> : displayValue}
            </span>
        );
    }

    if (isEditing) {
        if (isComplex) {
            return (
                <textarea
                    ref={textareaRef}
                    className="w-full h-full px-2 py-1 bg-bg-2 border border-primary-default outline-none text-text-primary text-xs font-mono resize-none absolute top-0 left-0 z-10 min-h-[100px] shadow-lg"
                    value={currentValue}
                    onChange={(e) => setCurrentValue(e.target.value)}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                />
            );
        }
        return (
            <input
                ref={inputRef}
                className="w-full h-full px-2 py-1 bg-bg-2 border border-primary-default outline-none text-text-primary text-xs"
                value={currentValue}
                onChange={(e) => setCurrentValue(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
            />
        );
    }

    return (
        <div
            className={`w-full h-full px-2 py-1 cursor-text hover:bg-bg-3/50 truncate ${isComplex ? 'font-mono text-xs' : ''}`}
            onClick={() => setIsEditing(true)}
            title={displayValue}
        >
             {value === null ? <span className="text-gray-400 italic">null</span> : displayValue}
        </div>
    );
};
