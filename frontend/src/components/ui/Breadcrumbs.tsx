import { useLocation, useParams, Link } from 'react-router-dom';
import { ChevronRight, Home, Database } from 'lucide-react';
import { useConnectionStore } from '../../store/connectionStore';
import { useWorkspaceTabsStore } from '../../store/workspaceTabsStore';

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

    if (!connection) return null;

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
