import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface ContextMenuProps {
    x: number;
    y: number;
    onClose: () => void;
    children: React.ReactNode;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, onClose, children }) => {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        // Close on escape key
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('blur', onClose);
        window.addEventListener('resize', onClose);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('blur', onClose);
            window.removeEventListener('resize', onClose);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);

    // Adjust position if it goes off screen (basic)
    const style = {
        top: y,
        left: x,
    };

    return createPortal(
        <div
            ref={menuRef}
            className="fixed z-50 min-w-[220px] bg-[#1e1e1e] border border-white/10 rounded-lg shadow-xl py-1.5 animate-in fade-in zoom-in-95 duration-75 text-sm"
            style={style}
        >
            {children}
        </div>,
        document.body
    );
};

interface ContextMenuItemProps {
    onClick?: () => void;
    children: React.ReactNode;
    icon?: React.ReactNode;
    shortcut?: string;
    danger?: boolean;
    disabled?: boolean;
    hasSubmenu?: boolean;
    className?: string;
}

export const ContextMenuItem: React.FC<ContextMenuItemProps> = ({ onClick, children, icon, shortcut, danger, disabled, hasSubmenu, className }) => {
    return (
        <button
            onClick={(e) => {
                e.stopPropagation();
                if (!disabled && onClick) {
                    onClick();
                }
            }}
            disabled={disabled}
            className={`w-full text-left px-3 py-1.5 flex items-center justify-between
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-blue-600 hover:text-white'}
                ${danger ? 'text-red-400 hover:text-white hover:bg-red-600' : 'text-gray-200'}
                ${className || ''}
                transition-colors group
            `}
        >
            <div className="flex items-center gap-2.5">
                {icon && <span className="text-gray-400 group-hover:text-currentColor w-4 flex justify-center">{icon}</span>}
                <span>{children}</span>
            </div>
            {hasSubmenu && (
                <svg className="w-3 h-3 text-gray-500 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
            )}
            {shortcut && (
                <span className="text-xs text-gray-500 group-hover:text-white/80 ml-4 font-sans">{shortcut}</span>
            )}
        </button>
    );
};

export const ContextMenuSeparator: React.FC = () => (
    <div className="h-px bg-white/10 my-1 mx-1" />
);

export const ContextMenuLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="px-3 py-1.5 text-xs font-medium text-gray-500">
        {children}
    </div>
);
