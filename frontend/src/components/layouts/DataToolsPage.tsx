import React from 'react';

export interface DataToolsPageProps {
  sidebar?: React.ReactNode; // Optional left sidebar for tool-specific navigation (e.g., query history, favorites)
  children: React.ReactNode; // Main workspace (Editor, Results)
  footer?: React.ReactNode; // Status bar
  className?: string;
}

export default function DataToolsPage({
  sidebar,
  children,
  footer,
  className = '',
}: DataToolsPageProps) {
  return (
    <div className={`flex flex-col h-full bg-bg-1 ${className}`}>
      <div className="flex flex-1 overflow-hidden">
        
        {/* Tool Sidebar (Collapsible logic usually handled by parent or sidebar itself) */}
        {sidebar && (
          <div className="w-64 border-r border-border-light bg-bg-1 flex flex-col">
            {sidebar}
          </div>
        )}

        {/* Main Workspace */}
        <div className="flex-1 flex flex-col bg-bg-0 overflow-hidden relative">
            {children}
        </div>
      </div>

      {/* Footer / Status Bar */}
      {footer && (
        <div className="h-7 border-t border-border-light bg-bg-1 flex items-center px-3 text-xs text-text-secondary select-none">
          {footer}
        </div>
      )}
    </div>
  );
}
