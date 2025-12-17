import React from 'react';
import { Settings } from 'lucide-react';

interface SidebarProps {
    onBackup: () => void;
    onRestore: () => void;
    onCreate: () => void;
    onSettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onBackup, onRestore, onCreate, onSettings }) => {
    return (
        <div className="w-[280px] h-full bg-bg-1 flex flex-col items-center py-8 px-6 border-r border-border">
            {/* Logo */}
            <div className="mb-6">
                <div className="w-32 h-32 flex items-center justify-center">
                    <img
                        src="/logo-dbplus.png"
                        alt="App Logo"
                        className="w-full h-full object-contain"
                    />
                </div>
            </div>

            {/* App Name */}
            <h1 className="text-2xl font-bold text-text-primary mb-1">DBPlus</h1>
            <p className="text-sm text-text-secondary mb-12">Version 1.0.0</p>

            {/* Action Buttons */}
            <div className="w-full space-y-2 mt-auto">
                <ActionButton
                    icon={
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                    }
                    label="Backup database..."
                    onClick={onBackup}
                />
                <ActionButton
                    icon={
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                        </svg>
                    }
                    label="Restore database..."
                    onClick={onRestore}
                />
                <ActionButton
                    icon={
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                    }
                    label="Create connection..."
                    onClick={onCreate}
                />
                <ActionButton
                    icon={<Settings size={16} />}
                    label="Settings"
                    onClick={onSettings}
                />
            </div>
        </div>
    );
};

interface ActionButtonProps {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
}

const ActionButton: React.FC<ActionButtonProps> = ({ icon, label, onClick }) => {
    return (
        <button
            onClick={onClick}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-text-secondary hover:bg-bg-2 hover:text-text-primary transition-colors text-sm font-medium"
        >
            <span className="flex-shrink-0">{icon}</span>
            <span>{label}</span>
        </button>
    );
};
