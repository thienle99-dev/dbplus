import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Search, Database, FileText, Clock, Settings, LogOut, Plus } from 'lucide-react';
import SchemaTree from './SchemaTree';
import SavedQueriesList from './SavedQueriesList';
import QueryHistory from './QueryHistory';
import SettingsModal from './SettingsModal';
import { CommandPalette } from './CommandPalette';
import { useWorkspaceTabsStore } from '../store/workspaceTabsStore';
import { useConnectionStore } from '../store/connectionStore';
import { useQueryClient } from '@tanstack/react-query';

export default function Sidebar() {
  const navigate = useNavigate();
  const { connectionId } = useParams();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'items' | 'queries' | 'history'>('items');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const { tabs, activeTabId, ensureTabForRoute, setActiveTab: setActiveWorkspaceTab, closeTab, setTabLastPath } = useWorkspaceTabsStore();
  const { connections, fetchConnections } = useConnectionStore();
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('left-sidebar-width');
    return saved ? parseInt(saved, 10) : 320;
  });
  const [isResizing, setIsResizing] = useState(false);
  const sidebarWidthRef = useRef(sidebarWidth);

  useEffect(() => {
    if (connections.length === 0) {
      void fetchConnections();
    }
  }, [connections.length, fetchConnections]);

  const connectionById = useMemo(() => {
    const map = new Map<string, { name: string; database: string; type: string }>();
    for (const c of connections) map.set(c.id, { name: c.name, database: c.database, type: c.type });
    return map;
  }, [connections]);

  useEffect(() => {
    if (!connectionId) return;
    const path = location.pathname + location.search;
    const id = ensureTabForRoute(connectionId, path);
    setTabLastPath(id, path);
  }, [connectionId, connectionById, ensureTabForRoute, location.pathname, location.search, setTabLastPath]);

  useEffect(() => {
    sidebarWidthRef.current = sidebarWidth;
  }, [sidebarWidth]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = e.clientX;
      const constrainedWidth = Math.max(240, Math.min(520, newWidth));
      setSidebarWidth(constrainedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      localStorage.setItem('left-sidebar-width', sidebarWidthRef.current.toString());
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      localStorage.setItem('left-sidebar-width', sidebarWidthRef.current.toString());
    };
  }, [isResizing]);

  // Global Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Mock handler for selecting a query from history/saved
  const handleSelectQuery = (sql: string, metadata?: Record<string, any>, name?: string, id?: string) => {
    navigate(`/workspace/${connectionId}/query`, { state: { sql, metadata, name, id } });
  };

  return (
    <div
      className="bg-bg-1 pb-[30px] border-r border-border flex h-full flex-shrink-0 relative"
      style={{ width: `${sidebarWidth}px` }}
    >
      {/* Vertical Workspace Tabs Rail */}
      <div className="w-[60px] border-r border-border bg-bg-1 flex flex-col">
        <div className="flex-1 overflow-y-auto py-2 px-1 space-y-1">
          {tabs.map((t) => {
            const meta = connectionById.get(t.connectionId);
            const label = meta ? `${meta.name}${t.database ? ` · ${t.database}` : ''}` : t.connectionId;
            const isActive = t.id === activeTabId;
            const tabText = (t.database || meta?.database || '').trim();
            const badge = tabText ? tabText.slice(0, 2).toUpperCase() : 'DB';
            return (
              <button
                key={t.id}
                onClick={() => {
                  setActiveWorkspaceTab(t.id);
                  navigate(t.lastPath || `/workspace/${t.connectionId}/query`);
                  void Promise.all([
                    queryClient.invalidateQueries({ queryKey: ['schemas', t.connectionId] }),
                    queryClient.invalidateQueries({ queryKey: ['tables', t.connectionId] }),
                    queryClient.invalidateQueries({ queryKey: ['columns', t.connectionId] }),
                    queryClient.invalidateQueries({ queryKey: ['tableData', t.connectionId] }),
                    queryClient.invalidateQueries({ queryKey: ['indexes', t.connectionId] }),
                    queryClient.invalidateQueries({ queryKey: ['constraints', t.connectionId] }),
                    queryClient.invalidateQueries({ queryKey: ['tableStats', t.connectionId] }),
                  ]);
                }}
                className={`group relative w-full h-10 rounded border flex items-center justify-center text-[10px] font-semibold transition-colors ${
                  isActive
                    ? 'bg-bg-2 border-accent text-text-primary'
                    : 'bg-bg-0 border-border text-text-secondary hover:text-text-primary hover:bg-bg-2'
                }`}
                title={label}
              >
                <span className="select-none">{badge}</span>
                <span
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const closingWasActive = t.id === activeTabId;
                    const nextTabs = tabs.filter((x) => x.id !== t.id);
                    const closingIndex = tabs.findIndex((x) => x.id === t.id);
                    const nextActive = closingWasActive
                      ? (nextTabs[closingIndex - 1] || nextTabs[0] || null)
                      : null;

                    closeTab(t.id);

                    // If we just closed the last workspace tab, leave the workspace route entirely
                    // so the right-side content unmounts too.
                    if (nextTabs.length === 0) {
                      navigate('/');
                      return;
                    }

                    // If we closed the active tab, navigate to the newly active workspace tab.
                    if (nextActive) {
                      navigate(nextActive.lastPath || `/workspace/${nextActive.connectionId}/query`);
                    }
                  }}
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-bg-2 border border-border text-text-secondary hover:text-text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center leading-none"
                  aria-label="Close tab"
                  title="Close"
                >
                  ×
                </span>
              </button>
            );
          })}
        </div>

        <div className="p-1 border-t border-border">
          <button
            onClick={() => setIsCommandPaletteOpen(true)}
            className="w-full h-10 rounded border border-border bg-bg-0 text-text-secondary hover:text-text-primary hover:bg-bg-2 transition-colors text-sm"
            title="Open connection/database (Cmd+K)"
          >
            +
          </button>
        </div>
      </div>

      {/* Resize Handle */}
      <div
        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-accent/50 z-50 transition-colors"
        onMouseDown={(e) => {
          e.preventDefault();
          setIsResizing(true);
        }}
        title="Drag to resize"
      />

      {/* Main Sidebar Content */}
      <div className="flex-1 flex flex-col min-w-0">
      {/* Search Header */}
      <div className="p-3 border-b border-border space-y-3">
        {/* Global Search Input */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-2.5 top-2.5 text-text-secondary" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-bg-2 border border-border rounded pl-8 pr-3 py-1.5 text-sm text-text-primary focus:border-accent outline-none"
            />
          </div>
          <button
            onClick={() => setIsCommandPaletteOpen(true)}
            className="px-2 py-1.5 bg-bg-2 border border-border rounded text-text-secondary hover:text-text-primary hover:border-accent transition-colors"
            title="Switch Database (Cmd+K)"
          >
            <Database size={16} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-bg-2 p-0.5 rounded border border-border">
          <button
            onClick={() => setActiveTab('items')}
            className={`flex-1 flex items-center justify-center py-1 rounded text-xs font-medium transition-all ${activeTab === 'items' ? 'bg-bg-1 text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
              }`}
            title="Items"
          >
            <Database size={14} />
          </button>
          <button
            onClick={() => setActiveTab('queries')}
            className={`flex-1 flex items-center justify-center py-1 rounded text-xs font-medium transition-all ${activeTab === 'queries' ? 'bg-bg-1 text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
              }`}
            title="Saved Queries"
          >
            <FileText size={14} />
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 flex items-center justify-center py-1 rounded text-xs font-medium transition-all ${activeTab === 'history' ? 'bg-bg-1 text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
              }`}
            title="History"
          >
            <Clock size={14} />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'items' && (
          <div className="flex flex-col">
            <div className="px-3 py-2 flex justify-between items-center text-xs font-semibold text-text-secondary uppercase tracking-wider">
              <span>Explorer</span>
              <button
                onClick={() => navigate(`/workspace/${connectionId}/query`)}
                className="p-1 hover:bg-bg-2 rounded text-accent hover:text-accent-hover"
                title="New Query"
              >
                <Plus size={14} />
              </button>
            </div>
            <SchemaTree searchTerm={searchTerm} />
          </div>
        )}

        {activeTab === 'queries' && (
          <SavedQueriesList
            onSelectQuery={handleSelectQuery}
            embedded={true}
            searchTerm={searchTerm}
          />
        )}

        {activeTab === 'history' && (
          <QueryHistory
            onSelectQuery={handleSelectQuery}
            embedded={true}
            searchTerm={searchTerm}
          />
        )}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-border space-y-1 bg-bg-1 z-10">
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="w-full flex items-center gap-2 p-2 hover:bg-bg-2 rounded text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          <Settings size={16} />
          Settings
        </button>
        <button
          onClick={() => navigate('/')}
          className="w-full flex items-center gap-2 p-2 hover:bg-bg-2 rounded text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          <LogOut size={16} />
          Disconnect
        </button>
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />
      </div>
    </div>
  );
}
