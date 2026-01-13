import React from 'react';
import { Settings, Home, Link2, Terminal, Layers } from 'lucide-react';

interface SidebarProps {
    onBackup?: () => void;
    onRestore?: () => void;
    onCreate?: () => void;
    onSettings: () => void;
    activeTab?: string;
    onNavigate?: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onSettings, activeTab = 'dashboard', onNavigate }) => {
    const handleNav = (tab: string) => {
        if (onNavigate) onNavigate(tab);
    };

    return (
        <div className="w-[260px] h-[calc(100vh-32px)] m-4 flex flex-col items-start py-6 px-6 rounded-[24px] glass z-30 overflow-hidden bg-bg-1/80 border border-border-light shadow-lg backdrop-blur-xl">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-6 px-2">
                <div className="w-8 h-8 bg-gradient-to-br from-[var(--color-primary-default)] to-[var(--color-primary-active)] rounded-lg flex items-center justify-center shadow-lg transform rotate-6 hover:rotate-0 transition-transform duration-500">
                    <Layers size={18} className="text-white" />
                </div>
                <h1 className="text-lg font-black tracking-tight text-text-primary uppercase italic">
                    DB<span className="text-[var(--color-primary-default)] not-italic">Plus</span>
                </h1>
            </div>

            {/* Navigation */}
            <nav className="w-full space-y-2">
                <NavItem
                    icon={<Home size={20} />}
                    label="Dashboard"
                    isActive={activeTab === 'dashboard'}
                    onClick={() => handleNav('dashboard')}
                />
                <NavItem
                    icon={<Link2 size={20} />}
                    label="Connections"
                    isActive={activeTab === 'connections'}
                    onClick={() => handleNav('connections')}
                />
                <NavItem
                    icon={<Terminal size={20} />}
                    label="Queries"
                    isActive={activeTab === 'queries'}
                    onClick={() => handleNav('queries')}
                />
                <NavItem
                    icon={<Settings size={20} />}
                    label="Settings"
                    isActive={activeTab === 'settings'}
                    onClick={onSettings}
                />
            </nav>

            {/* Bottom Section */}
            {/* Bottom Section */}
            <div className="mt-auto w-full pt-6 border-t border-border-light px-2">

            </div>
        </div>
    );
};

interface NavItemProps {
    icon: React.ReactNode;
    label: string;
    isActive?: boolean;
    onClick?: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, isActive, onClick }) => {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 group ${isActive
                ? 'bg-bg-0 text-text-primary shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] ring-1 ring-border-light shadow-sm'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-2'
                }`}
        >
            <span className={`transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-[var(--color-primary-default)]' : ''}`}>
                {icon}
            </span>
            <span className="text-[15px] font-semibold tracking-wide">
                {label}
            </span>
            {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--color-primary-default)] shadow-[0_0_8px_var(--color-primary-transparent)]" />
            )}
        </button>
    );
};

