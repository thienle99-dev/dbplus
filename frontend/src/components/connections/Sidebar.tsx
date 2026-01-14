import React from 'react';
import { Settings, Home, Link2, Terminal, Layers, Shield } from 'lucide-react';

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
        <div className="w-[280px] h-[calc(100vh-32px)] m-4 flex flex-col items-start py-8 px-6 rounded-lg glass z-30 transition-all duration-500 hover:shadow-2xl hover:shadow-accent/5">
            {/* Logo Section */}
            <div className="flex items-center gap-4 mb-10 px-2 group cursor-pointer" onClick={() => handleNav('dashboard')}>
                <div className="relative">
                    <div className="w-10 h-10 bg-gradient-to-br from-accent to-primary-active rounded-md flex items-center justify-center shadow-lg shadow-accent/20 group-hover:rotate-[360deg] transition-all duration-1000 ease-in-out">
                        <Layers size={22} className="text-white" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-success rounded-full border-2 border-bg-1" />
                </div>
                <div>
                    <h1 className="text-xl font-black tracking-tighter text-text-primary leading-tight">
                        DB<span className="text-accent">PLUS</span>
                    </h1>
                    <p className="text-[10px] font-semibold text-text-secondary tracking-wide uppercase mt-1.5 leading-normal">Enterprise</p>
                </div>
            </div>

            {/* Navigation */}
            <nav className="w-full space-y-2 flex-1">
                <div className="px-3 mb-4">
                    <p className="text-[10px] font-bold text-text-muted tracking-wide uppercase leading-relaxed">Main Menu</p>
                </div>
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

                <div className="px-3 mb-4 mt-8">
                    <p className="text-[10px] font-bold text-text-muted tracking-wide uppercase leading-relaxed">Configuration</p>
                </div>
                <NavItem
                    icon={<Settings size={20} />}
                    label="Settings"
                    isActive={activeTab === 'settings'}
                    onClick={onSettings}
                />
            </nav>

            {/* Bottom Section - System Health */}
            <div className="w-full mt-auto pt-6 border-t border-border-subtle">
                <div className="p-4 rounded-md bg-bg-sunken border border-border-subtle space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Shield size={14} className="text-success" />
                            <span className="text-[10px] font-bold text-text-primary uppercase tracking-wider">System Pulse</span>
                        </div>
                        <span className="text-[10px] font-bold text-success uppercase">Active</span>
                    </div>
                    <div className="h-1 w-full bg-bg-elevated rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-success to-success/50 w-[85%] rounded-full shadow-[0_0_8px_var(--color-success-bg)]" />
                    </div>
                    <p className="text-[10px] text-text-secondary leading-tight">
                        All local and remote nodes are operating within optimal latency.
                    </p>
                </div>
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
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-300 group relative border ${isActive
                ? 'bg-accent/20 border-accent/30 text-text-primary shadow-sm'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover border-transparent'
                }`}
        >
            <span className={`transition-all duration-500 ${isActive ? 'text-accent scale-110' : 'group-hover:text-text-primary group-hover:scale-110'}`}>
                {icon}
            </span>
            <span className={`text-[14px] font-bold tracking-tight transition-all duration-300 ${isActive ? 'translate-x-1' : 'group-hover:translate-x-1'}`}>
                {label}
            </span>
            {isActive && (
                <>
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-accent rounded-r-full shadow-[2px_0_10px_var(--color-primary-transparent)]" />
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_8px_var(--color-primary-transparent)]" />
                </>
            )}
        </button>
    );
};

