 import React from 'react';
import Button from '../ui/Button';
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

export interface ManagementPageProps {
  title: string;
  breadcrumbs?: BreadcrumbItem[];
  primaryAction?: {
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
  };
  toolbar?: React.ReactNode;
  children: React.ReactNode;
  className?: string; // For additional styling if needed
}

export default function ManagementPage({
  title,
  breadcrumbs = [],
  primaryAction,
  toolbar,
  children,
  className = '',
}: ManagementPageProps) {
  return (
    <div className={`flex flex-col h-full bg-bg-1 ${className}`}>
      {/* Header Section */}
      <div className="flex flex-col border-b border-border-light bg-bg-1">
        
        {/* Breadcrumbs & Title Row */}
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex flex-col gap-1">
            {/* Breadcrumbs */}
            {breadcrumbs.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-text-secondary mb-1">
                {breadcrumbs.map((item, index) => (
                  <React.Fragment key={index}>
                    {index > 0 && <ChevronRight size={10} className="text-text-muted" />}
                    <span 
                      className={item.onClick ? 'cursor-pointer hover:text-text-primary transition-colors' : ''}
                      onClick={item.onClick}
                    >
                      {item.label}
                    </span>
                  </React.Fragment>
                ))}
              </div>
            )}
            
            {/* Title */}
            <h1 className="text-xl font-semibold text-text-primary tracking-tight">{title}</h1>
          </div>

          {/* Primary Action */}
          {primaryAction && (
            <Button 
              variant="primary" 
              onClick={primaryAction.onClick}
              className="gap-2 shadow-sm"
            >
              {primaryAction.icon}
              {primaryAction.label}
            </Button>
          )}
        </div>

        {/* Toolbar Section (Optional) */}
        {toolbar && (
          <div className="px-6 pb-3">
             {/* We wrap the passed toolbar to ensure it fits the page context if needed, 
                 but mostly we expect standard Toolbar components here */}
             <div className="flex items-center gap-3">
                {toolbar}
             </div>
          </div>
        )}
      </div>

      {/* Main Content Area - Scrollable */}
      <div className="flex-1 overflow-auto bg-bg-0 px-6 py-6">
        <div className="max-w-7xl mx-auto w-full"> 
            {/* Constrain width for readability on large screens, console style */}
            {children}
        </div>
      </div>
    </div>
  );
}
