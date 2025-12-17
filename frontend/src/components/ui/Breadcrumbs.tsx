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
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-border bg-bg-1 text-sm text-text-secondary select-none">
            <Link to="/" className="hover:text-text-primary transition-colors flex items-center gap-1">
                <Home size={14} />
            </Link>

            <ChevronRight size={14} className="text-border" />

            <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded hover:bg-bg-2 text-text-primary transition-colors cursor-default">
                <span className="text-[10px] font-bold uppercase tracking-wider text-accent bg-accent/10 px-1 rounded">
                    {connection.type}
                </span>
                <span className="font-medium">{connection.name}</span>
                <span className="text-border">|</span>
                <span className="text-xs">{displayedDatabase}</span>
                {version && (
                    <>
                        <span className="text-border">|</span>
                        <span className="text-[10px] text-text-tertiary font-mono" title={version}>
                            {formatVersion(version)}
                        </span>
                    </>
                )}
            </div>

            {isQueryPage && (
                <>
                    <ChevronRight size={14} className="text-border" />
                    <span className="text-text-primary font-medium">Query Editor</span>
                </>
            )}

            {isDashboardPage && (
                <>
                    <ChevronRight size={14} className="text-border" />
                    <span className="text-text-primary font-medium">Dashboards</span>
                </>
            )}

            {schema && (
                <>
                    <ChevronRight size={14} className="text-border" />
                    <div className="flex items-center gap-1">
                        <Database size={12} />
                        <span>{schema}</span>
                    </div>
                </>
            )}

            {table && (
                <>
                    <ChevronRight size={14} className="text-border" />
                    <span className="text-text-primary font-medium">{table}</span>
                </>
            )}
        </div>
    );
}
