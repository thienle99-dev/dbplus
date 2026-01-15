import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Search, Database, FileText, Clock, Settings, LogOut, Pin, LayoutGrid, Shield, Activity, ChevronsUpDown } from 'lucide-react';
import SchemaTree from './SchemaTree';
import ActivityMonitor from './tools/ActivityMonitor';
import SavedQueriesList from './SavedQueriesList';
import QueryHistory from './QueryHistory';
import SettingsModal from './SettingsModal';
import CommandPalette from './CommandPalette';
import { useWorkspaceTabsStore } from '../store/workspaceTabsStore';
import { useConnectionStore } from '../store/connectionStore';
import { useQueryClient } from '@tanstack/react-query';
import Input from './ui/Input';

export default function Sidebar() {
  const navigate = useNavigate();
  const { connectionId } = useParams();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'items' | 'queries' | 'history'>('items');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [showActivityMonitor, setShowActivityMonitor] = useState(false);
  const { tabs, activeTabId, ensureTabForRoute, setActiveTab: setActiveWorkspaceTab, closeTab, setTabLastPath } = useWorkspaceTabsStore();
  const { connections, fetchConnections } = useConnectionStore();
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('left-sidebar-width');
    return saved ? parseInt(saved, 10) : 320;
  });
  const [isResizing, setIsResizing] = useState(false);
  const [showPinnedOnly, setShowPinnedOnly] = useState(() => {
    const saved = localStorage.getItem('show-pinned-only');
    return saved ? JSON.parse(saved) : false;
  });
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

  const currentConnection = useMemo(() => {
    return connections.find(c => c.id === connectionId);
  }, [connections, connectionId]);

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
      className="bg-bg-1 border-r pb-[20px] pt-8 border-border-light flex h-full flex-shrink-0 relative shadow-xl z-30 backdrop-blur-md"
      style={{ width: `${sidebarWidth}px` }}
      data-tauri-drag-region
    >
      {/* Vertical Workspace Tabs Rail */}
      <div className="w-[60px] border-r border-border-light bg-bg-sunken flex flex-col items-center py-3 gap-2">
        <button
          onClick={() => navigate('/')}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${location.pathname === '/'
            ? 'bg-accent text-white shadow-lg'
            : 'bg-bg-1 text-text-secondary hover:text-text-primary hover:bg-bg-0 border border-border-light hover:border-accent'
            }`}
          title="Connections Hub"
        >
          <LayoutGrid size={20} strokeWidth={1.5} />
        </button>
        <div className="w-8 h-px bg-border-light my-1" />
        <div className="flex-1 overflow-y-auto px-1 space-y-2 w-full no-scrollbar">
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
                className={`group relative w-10 h-10 rounded-xl flex items-center justify-center text-[10px] font-bold transition-all duration-200 mx-auto ${isActive
                  ? 'bg-accent text-white shadow-lg scale-105'
                  : 'bg-bg-1 text-text-secondary hover:text-text-primary hover:bg-bg-0 border border-border-light hover:border-accent'
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

                    if (nextTabs.length === 0) {
                      navigate('/');
                      return;
                    }

                    if (nextActive) {
                      navigate(nextActive.lastPath || `/workspace/${nextActive.connectionId}/query`);
                    }
                  }}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-bg-2 border border-border-light text-text-secondary hover:text-white hover:bg-red-500 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center leading-none shadow-sm z-10"
                  aria-label="Close tab"
                  title="Close"
                >
                  ×
                </span>
              </button>
            );
          })}
        </div>

        <div className="p-1 pt-2 border-t border-border-light w-full flex flex-col items-center gap-2 mt-auto">
          <button
            onClick={() => setIsCommandPaletteOpen(true)}
            className="w-10 h-10 rounded-xl border border-border-light bg-bg-1 text-text-secondary hover:text-accent hover:border-accent hover:bg-bg-0 transition-all flex items-center justify-center shadow-sm"
            title="Open connection/database (Cmd+K)"
          >
            <span className="text-lg leading-none pb-0.5">+</span>
          </button>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="w-10 h-10 rounded-xl border border-transparent hover:bg-bg-0 text-text-secondary hover:text-primary transition-all flex items-center justify-center"
            title="Settings"
          >
            <Settings size={20} />
          </button>

          <button
            onClick={() => navigate('/')}
            className="w-10 h-10 rounded-xl border border-transparent hover:bg-red-500/10 text-text-secondary hover:text-red-400 transition-all flex items-center justify-center"
            title="Disconnect"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {/* Resize Handle */}
      <div
        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-accent z-50 transition-colors opacity-0 hover:opacity-100"
        onMouseDown={(e) => {
          e.preventDefault();
          setIsResizing(true);
        }}
        title="Drag to resize"
      />

      {/* Main Sidebar Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-transparent">
        {/* Search Header */}
        <div className="p-5 border-b border-border-light space-y-4 bg-bg-1/50 backdrop-blur-sm">
          {/* Connection & Actions Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="status-pulse status-online shadow-[0_0_12px_rgba(34,197,94,0.4)]" />
              <span className="text-sm font-bold text-text-primary truncate tracking-tight">
                {currentConnection?.name || 'Select Connection'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsCommandPaletteOpen(true)}
                className="p-1.5 text-text-secondary hover:text-accent hover:bg-accent/5 rounded-lg transition-all duration-300"
                title="Switch Database (Cmd+K)"
              >
                <ChevronsUpDown size={14} strokeWidth={2.5} />
              </button>
              <button
                onClick={() => navigate(`/workspace/${connectionId}/permissions`)}
                className={`p-1.5 rounded-lg transition-all duration-300 ${location.pathname.includes('/permissions')
                  ? 'bg-accent text-white shadow-glow-sm'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-2'
                  }`}
                title="Permissions"
              >
                <Shield size={14} strokeWidth={2.5} />
              </button>
              <button
                onClick={() => setShowActivityMonitor(true)}
                className={`p-1.5 rounded-lg transition-all duration-300 ${showActivityMonitor
                  ? 'bg-accent text-white shadow-glow-sm'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-2'
                  }`}
                title="Activity Monitor"
              >
                <Activity size={14} strokeWidth={2.5} />
              </button>
            </div>
          </div>

          {/* Full Width Search Input */}
          <div className="w-full">
            <Input
              leftIcon={<Search size={14} className="text-text-tertiary" />}
              placeholder="Search objects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-bg-sunken border-transparent focus:bg-bg-0 focus:ring-1 focus:ring-accent/30 premium-input"
            />
          </div>

          {/* Tab Navigation (Premium Segmented Control style) */}
          <div className="premium-tabs-container">
            <button
              onClick={() => setActiveTab('items')}
              className={`premium-tab ${activeTab === 'items' ? 'active' : ''}`}
              title="Explorer"
            >
              <Database size={13} strokeWidth={activeTab === 'items' ? 3 : 2} className={sidebarWidth > 280 ? "mr-1" : ""} />
              {sidebarWidth > 280 && <span>Explorer</span>}
            </button>
            <button
              onClick={() => setActiveTab('queries')}
              className={`premium-tab ${activeTab === 'queries' ? 'active' : ''}`}
              title="Saved Queries"
            >
              <FileText size={13} strokeWidth={activeTab === 'queries' ? 3 : 2} className={sidebarWidth > 280 ? "mr-1" : ""} />
              {sidebarWidth > 280 && <span>Saved</span>}
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`premium-tab ${activeTab === 'history' ? 'active' : ''}`}
              title="History"
            >
              <Clock size={13} strokeWidth={activeTab === 'history' ? 3 : 2} className={sidebarWidth > 280 ? "mr-1" : ""} />
              {sidebarWidth > 280 && <span>History</span>}
            </button>
          </div>
        </div>


        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'items' && (
            <div className="flex flex-col">
              <div className="px-4 py-3 flex justify-between items-center text-xs font-semibold text-text-tertiary uppercase tracking-wider">
                <span>Explorer</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      void Promise.all([
                        queryClient.invalidateQueries({ queryKey: ['schemas', connectionId] }),
                        queryClient.invalidateQueries({ queryKey: ['tables', connectionId] }),
                        queryClient.invalidateQueries({ queryKey: ['columns', connectionId] }),
                      ]);
                    }}
                    className="p-1.5 hover:bg-white/5 rounded-lg text-text-secondary hover:text-text-primary transition-colors"
                    title="Refresh Schema"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
                    </svg>
                  </button>
                  <button
                    onClick={() => {
                      const newValue = !showPinnedOnly;
                      setShowPinnedOnly(newValue);
                      localStorage.setItem('show-pinned-only', JSON.stringify(newValue));
                    }}
                    className={`p-1.5 hover:bg-white/5 rounded-lg transition-colors ${showPinnedOnly
                      ? 'text-accent bg-white/10'
                      : 'text-text-secondary hover:text-text-primary'
                      }`}
                    title={showPinnedOnly ? "Show All Tables" : "Show Pinned Tables Only"}
                  >
                    <Pin size={14} fill={showPinnedOnly ? "currentColor" : "none"} />
                  </button>
                </div>
              </div>
              <div className="px-2">
                <SchemaTree searchTerm={searchTerm} showPinnedOnly={showPinnedOnly} />
              </div>
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



        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
        />

        {/* Activity Monitor */}
        {showActivityMonitor && connectionId && (
          <ActivityMonitor
            connectionId={connectionId}
            onClose={() => setShowActivityMonitor(false)}
          />
        )}

        <CommandPalette
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
          connectionId={connectionId}
        />
      </div>
    </div>
  );
}
