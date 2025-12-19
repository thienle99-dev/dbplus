import React, { useState, useEffect, useRef } from 'react';
import { formatCellValue, isComplexType } from '../../utils/cellFormatters';
import { tryGetDateFromTimestamp } from '../../utils/dateUtils';

interface EditableCellProps {
    value: any;
    onSave: (newValue: any) => void;
    type: 'string' | 'number' | 'boolean' | 'json' | 'null';
    isEditable: boolean;
    className?: string;
}

export const EditableCell: React.FC<EditableCellProps> = ({ value, onSave, isEditable, className }) => {
    // ... (existing state) ...
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
        if (currentValue !== formatCellValue(value)) {
            onSave(currentValue);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleBlur();
        } else if (e.key === 'Escape') {
            setCurrentValue(formatCellValue(value));
            setIsEditing(false);
        }
    };

    // Calculate display value and tooltip
    const displayValue = formatCellValue(value);
    const isComplex = isComplexType(value);
    const datePreview = !isComplex ? tryGetDateFromTimestamp(value) : null;
    const title = datePreview
        ? `Possible Date: ${datePreview}\nOriginal Value: ${displayValue}`
        : displayValue;

    // If it's a complex type, allow "editing" mode just to view the pretty-printed 
    // data even if isEditable is false.
    const canEnterEditMode = isEditable || isComplex;

    if (isEditing) {
        // ... (existing editing logic) ...
        if (isComplex) {
            return (
                <textarea
                    ref={textareaRef}
                    readOnly={!isEditable}
                    className={`w-full h-full px-2 py-1 bg-bg-2 border border-primary-default outline-none text-text-primary text-xs font-mono resize-none absolute top-0 left-0 z-10 min-h-[100px] shadow-lg ${!isEditable ? 'bg-bg-1' : ''}`}
                    value={currentValue}
                    onChange={(e) => isEditable && setCurrentValue(e.target.value)}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    autoFocus
                />
            );
        }
        if (isEditable) {
            return (
                <input
                    ref={inputRef}
                    className="w-full h-full px-2 py-1 bg-bg-2 border border-primary-default outline-none text-text-primary text-xs"
                    value={currentValue}
                    onChange={(e) => setCurrentValue(e.target.value)}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    autoFocus
                />
            );
        }
    }

    return (
        <div
            className={`w-full h-full px-2 py-1 cursor-text hover:bg-bg-3/50 truncate ${isComplex ? 'font-mono text-xs' : ''} ${className || ''}`}
            onClick={() => canEnterEditMode && setIsEditing(true)}
            title={title}
        >
            {value === null ? <span className="text-gray-400 italic">null</span> : displayValue}
        </div>
    );
};
