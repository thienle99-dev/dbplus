import React from 'react';
import { Settings, Home, Link2, Terminal, User, LogOut, Layers } from 'lucide-react';

interface SidebarProps {
    onBackup?: () => void;
    onRestore?: () => void;
    onCreate?: () => void;
    onSettings: () => void;
    activeTab?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ onSettings, activeTab = 'dashboard' }) => {
    return (
        <div className="w-[280px] h-[calc(100vh-40px)] m-5 flex flex-col items-start py-10 px-8 rounded-[32px] glass z-50 overflow-hidden">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-12 px-2">
                <div className="w-10 h-10 bg-gradient-to-br from-[var(--color-primary-default)] to-[var(--color-primary-active)] rounded-xl flex items-center justify-center shadow-lg transform rotate-6 hover:rotate-0 transition-transform duration-500">
                    <Layers size={22} className="text-white" />
                </div>
                <h1 className="text-xl font-black tracking-tight text-white uppercase italic">
                    Bentley <span className="text-indigo-400 not-italic">DB</span>
                </h1>
            </div>

            {/* Navigation */}
            <nav className="w-full space-y-6">
                <NavItem
                    icon={<Home size={20} />}
                    label="Dashboard"
                    isActive={activeTab === 'dashboard'}
                />
                <NavItem
                    icon={<Link2 size={20} />}
                    label="Connections"
                    isActive={activeTab === 'connections'}
                />
                <NavItem
                    icon={<Terminal size={20} />}
                    label="Queries"
                    isActive={activeTab === 'queries'}
                />
                <NavItem
                    icon={<Settings size={20} />}
                    label="Settings"
                    isActive={activeTab === 'settings'}
                    onClick={onSettings}
                />
                <NavItem
                    icon={<User size={20} />}
                    label="Profile"
                    isActive={activeTab === 'profile'}
                />
            </nav>

            {/* Bottom Section */}
            <div className="mt-auto w-full pt-6 border-t border-white/5 px-2">
                <button
                    onClick={() => { }}
                    className="flex items-center gap-3 text-text-secondary hover:text-white transition-all group"
                >
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                        <LogOut size={16} />
                    </div>
                    <span className="text-sm font-medium">Profile</span>
                </button>
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
            className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group ${isActive
                ? 'bg-white/10 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] ring-1 ring-white/10'
                : 'text-text-secondary hover:text-white hover:bg-white/5'
                }`}
        >
            <span className={`transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-indigo-400' : ''}`}>
                {icon}
            </span>
            <span className="text-[15px] font-semibold tracking-wide">
                {label}
            </span>
            {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.8)]" />
            )}
        </button>
    );
};

