import React from 'react';

interface SidebarProps {
    onBackup: () => void;
    onRestore: () => void;
    onCreate: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onBackup, onRestore, onCreate }) => {
    return (
        <div className="w-[300px] h-full bg-gradient-to-br from-[#1a1a1a] to-[#0d0d0d] flex flex-col items-center py-12 px-6 shadow-2xl relative overflow-hidden">
            {/* Subtle vignette overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/20 pointer-events-none" />

            {/* Logo */}
            <div className="relative z-10 mb-8">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center backdrop-blur-sm border border-white/10 shadow-xl">
                    <svg className="w-16 h-16 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                    </svg>
                </div>
            </div>

            {/* App Name & Version */}
            <div className="relative z-10 text-center mb-12">
                <h1 className="text-2xl font-bold text-white mb-1">MyDB Client</h1>
                <p className="text-xs text-gray-500">v1.0.0</p>
            </div>

            {/* Action Buttons */}
            <div className="relative z-10 w-full space-y-3">
                <ActionButton
                    icon={
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                    }
                    label="Backup database…"
                    onClick={onBackup}
                />
                <ActionButton
                    icon={
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                        </svg>
                    }
                    label="Restore database…"
                    onClick={onRestore}
                />
                <ActionButton
                    icon={
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                    }
                    label="Create connection"
                    onClick={onCreate}
                    primary
                />
            </div>
        </div>
    );
};

interface ActionButtonProps {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    primary?: boolean;
}

const ActionButton: React.FC<ActionButtonProps> = ({ icon, label, onClick, primary }) => {
    return (
        <button
            onClick={onClick}
            className={`
        w-full px-4 py-3 rounded-lg
        flex items-center gap-3
        transition-all duration-200
        ${primary
                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:from-blue-500 hover:to-blue-400'
                    : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
                }
        active:scale-95
      `}
        >
            <div className={`flex-shrink-0 ${primary ? 'text-white' : 'text-gray-400'}`}>
                {icon}
            </div>
            <span className="text-sm font-medium">{label}</span>
        </button>
    );
};
