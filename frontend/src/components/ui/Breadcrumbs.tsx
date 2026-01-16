import { useLocation, useParams, Link } from 'react-router-dom';
import { ChevronRight, Home, Database } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useConnectionStore } from '../../store/connectionStore';
import { useWorkspaceTabsStore } from '../../store/workspaceTabsStore';
import { connectionApi } from '../../services/connectionApi';

export default function Breadcrumbs() {
    const { connectionId, schema, table } = useParams();
    const location = useLocation();
    const { connections } = useConnectionStore();
    const { tabs, activeTabId } = useWorkspaceTabsStore();

    const connection = connections.find(c => c.id === connectionId);
    const activeTab = tabs.find((t) => t.id === activeTabId);
    const displayedDatabase =
        activeTab && activeTab.connectionId === connectionId && activeTab.database
            ? activeTab.database
            : connection?.database;
    const isQueryPage = location.pathname.includes('/query');
    const isDashboardPage = location.pathname.includes('/dashboards');

    // Fetch DB version
    const { data: version } = useQuery({
        queryKey: ['connectionVersion', connectionId],
        queryFn: () => connectionApi.getVersion(connectionId!),
        enabled: !!connectionId,
        staleTime: Infinity,
    });

    if (!connection) return null;

    // Helper to format version string
    const formatVersion = (v: string) => {
        if (!v) return '';
        // Extract major.minor if possible or truncate
        // e.g. "PostgreSQL 16.1 (Debian 16.1-1.pgdg120+1)" -> "16.1"
        // e.g. "8.0.35-TiDB-v7.5.0" -> "v7.5.0"

        // Simple truncation for now to fit in header
        return v.length > 15 ? v.substring(0, 15) + '...' : v;
    };

    return (
        <div className="flex items-center gap-2 px-6 py-3 border-b border-border-light bg-bg-0/50 backdrop-blur-md text-sm text-text-secondary select-none z-20">
            <Link to="/" className="w-8 h-8 rounded-full bg-bg-1 border border-border-light flex items-center justify-center hover:text-accent hover:border-accent transition-all duration-300 shadow-sm active:scale-95">
                <Home size={14} />
            </Link>

            <ChevronRight size={12} className="text-text-muted opacity-40 mx-1" />

            <div className="flex items-center gap-2 glass-pill">
                <span className="text-[9px] font-black uppercase tracking-widest text-accent bg-accent/10 px-1.5 py-0.5 rounded leading-none">
                    {connection.type}
                </span>
                <span className="font-bold text-text-primary text-xs">{connection.name}</span>
                <div className="w-1 h-3 bg-border-light mx-1 rounded-full" />
                <Database size={12} className="text-text-muted" />
                <span className="text-xs font-medium">{displayedDatabase}</span>
                {version && (
                    <>
                        <div className="w-1 h-3 bg-border-light mx-1 rounded-full" />
                        <span className="text-[10px] text-text-tertiary font-mono bg-background-sunken px-1.5 py-0.5 rounded" title={version}>
                            {formatVersion(version)}
                        </span>
                    </>
                )}
            </div>

            {isQueryPage && (
                <>
                    <ChevronRight size={12} className="text-text-muted opacity-40 mx-1" />
                    <div className="glass-pill bg-accent/5 border-accent/20">
                        <span className="text-text-primary font-bold text-xs">Query Editor</span>
                    </div>
                </>
            )}

            {isDashboardPage && (
                <>
                    <ChevronRight size={12} className="text-text-muted opacity-40 mx-1" />
                    <div className="glass-pill bg-accent/5 border-accent/20">
                        <span className="text-text-primary font-bold text-xs">Dashboards</span>
                    </div>
                </>
            )}

            {schema && (
                <>
                    <ChevronRight size={12} className="text-text-muted opacity-40 mx-1" />
                    <div className="glass-pill">
                        <div className="flex items-center gap-1.5">
                            <Database size={12} className="text-accent" />
                            <span className="text-xs font-bold text-text-primary">{schema}</span>
                        </div>
                    </div>
                </>
            )}

            {table && (
                <>
                    <ChevronRight size={12} className="text-text-muted opacity-40 mx-1" />
                    <div className="glass-pill bg-accent/10 border-accent/30 shadow-glow-sm">
                        <span className="text-accent font-black text-xs">{table}</span>
                    </div>
                </>
            )}
        </div>
    );
}

