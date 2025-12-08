import React from 'react';

export interface ToolbarProps {
    children: React.ReactNode;
    className?: string;
}

export default function Toolbar({ children, className = '' }: ToolbarProps) {
    return (
        <div
            className={`
        h-[var(--toolbar-height)]
        px-4
        flex items-center gap-3
        bg-[var(--color-panel)]
        border-b border-[var(--color-divider)]
        ${className}
      `}
        >
            {children}
        </div>
    );
}

// Toolbar components
export function ToolbarSection({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={`flex items-center gap-2 ${className}`}>
            {children}
        </div>
    );
}

export function ToolbarDivider() {
    return (
        <div className="h-6 w-px bg-[var(--color-divider)]" />
    );
}

export function ToolbarSpacer() {
    return <div className="flex-1" />;
}
