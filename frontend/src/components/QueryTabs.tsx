import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, X, FileCode, BookMarked, History, Database } from 'lucide-react';
import { clsx } from 'clsx';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import QueryEditor from './QueryEditor';
import SavedQueriesList from './SavedQueriesList';
import QueryHistory from './QueryHistory';
import TableDataView from './TableDataView';
import { useDraftPersistence } from '../hooks/useDraftPersistence';
import { TabProvider } from '../context/TabContext';
import { Tab } from '../types';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { useWorkspaceTabsStore } from '../store/workspaceTabsStore';
import { useConnectionStore } from '../store/connectionStore';

export default function QueryTabs() {
  const { connectionId } = useParams<{ connectionId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { tabs: workspaceTabs, activeTabId: activeWorkspaceTabId } = useWorkspaceTabsStore();
  const { connections } = useConnectionStore();

  const connectionDefaultDb = connections.find((c) => c.id === connectionId)?.database;
  const activeWorkspaceTab = workspaceTabs.find((t) => t.id === activeWorkspaceTabId);
  const effectiveDatabase =
    activeWorkspaceTab && activeWorkspaceTab.connectionId === connectionId
      ? activeWorkspaceTab.database || connectionDefaultDb
      : connectionDefaultDb;
  const draftScopeKey = `${connectionId || 'no-connection'}::${effectiveDatabase || 'default'}`;

  const { saveDraft, loadDrafts, deleteDraft } = useDraftPersistence(draftScopeKey);

  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState('');
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [sidebarView, setSidebarView] = useState<'saved' | 'history' | null>(null);

  // Debounce timers for auto-save (one per tab)
  const saveTimersRef = useRef<Map<string, number>>(new Map());

  // Clear per-tab debounce timers when switching workspace tab/database
  useEffect(() => {
    saveTimersRef.current.forEach(timer => clearTimeout(timer));
    saveTimersRef.current.clear();
  }, [draftScopeKey]);

  // Load drafts per (connection + database tab)
  useEffect(() => {
    if (!connectionId) return;

    const drafts = loadDrafts();
    if (drafts.length > 0) {
      const draftTabs: Tab[] = drafts.map(draft => ({
        id: draft.id,
        title: draft.title,
        type: draft.type || 'query',
        sql: draft.sql,
        metadata: draft.metadata,
        isDraft: true,
        savedQueryId: draft.savedQueryId,
        isDirty: !!draft.savedQueryId,
        lastModified: draft.lastModified,
      }));
      setTabs(draftTabs);
      setActiveTabId(draftTabs[0].id);
    } else {
      // Create initial draft tab if no drafts exist
      const initialTab: Tab = {
        id: Math.random().toString(36).substr(2, 9),
        title: 'Draft Query 1',
        type: 'query',
        isDraft: true,
        lastModified: Date.now(),
      };
      setTabs([initialTab]);
      setActiveTabId(initialTab.id);
    }
  }, [connectionId, loadDrafts, draftScopeKey]);

  const addTab = useCallback((sql?: string, metadata?: Record<string, any>) => {
    const newId = Math.random().toString(36).substr(2, 9);
    setTabs(prev => {
      const draftCount = prev.filter(t => t.isDraft).length;
      const newTab: Tab = {
        id: newId,
        title: sql ? `Query ${prev.length + 1}` : `Draft Query ${draftCount + 1}`,
        type: 'query',
        sql,
        metadata,
        isDraft: !sql, // New tabs without SQL are drafts
        lastModified: Date.now(),
      };
      return [...prev, newTab];
    });
    setActiveTabId(newId);
  }, []);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, tabId: string } | null>(null);

  const handleContextMenu = (e: React.MouseEvent, tabId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, tabId });
  };

  // Close Context Menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const closeTab = useCallback((id: string, e?: React.MouseEvent, force = false) => {
    e?.stopPropagation();
    setTabs(prev => {
      if (prev.length === 1 && !force) return prev; // Don't close last tab unless forced/clearing all replacement logic elsewhere

      const tabToClose = prev.find(t => t.id === id);

      // If force or not dirty, we can close. 
      // If dirty and not force, we usually keep it (handled by UI confirmation separately if needed, 
      // but current logic assumes auto-save handles draft, so "Close" is safe to just close view.
      // "Force Close" usually implies "Delete Draft" too if we wanted to revert changes).

      if (tabToClose?.isDraft && connectionId && force) {
        deleteDraft(id);
      }

      const newTabs = prev.filter(t => t.id !== id);

      // If we closed the active tab
      if (activeTabId === id) {
        const closedIndex = prev.findIndex(t => t.id === id);
        // Try to go to right, else left
        const newActiveTab = newTabs[closedIndex] || newTabs[closedIndex - 1] || newTabs[0];
        if (newActiveTab) {
          setActiveTabId(newActiveTab.id);
        } else if (newTabs.length === 0) {
          // If we closed the last tab (force close all), create a new default one
          const newId = Math.random().toString(36).substr(2, 9);
          const initialTab: Tab = {
            id: newId,
            title: 'Draft Query 1',
            type: 'query',
            isDraft: true,
            lastModified: Date.now(),
          };
          // Use setTimeout to avoid state update conflict during render cycle if called from effect
          setTimeout(() => {
            setTabs([initialTab]);
            setActiveTabId(newId);
          }, 0);
          return []; // Temporary empty
        }
      }
      return newTabs;
    });
  }, [activeTabId, connectionId, deleteDraft]);

  const handleCloseOthers = () => {
    if (!contextMenu) return;
    const itemsToKeep = tabs.filter(t => t.id === contextMenu.tabId);
    setTabs(itemsToKeep);
    setActiveTabId(contextMenu.tabId);
  };

  const handleCloseAll = () => {
    // Re-initialize with one empty tab
    const newId = Math.random().toString(36).substr(2, 9);
    const initialTab: Tab = {
      id: newId,
      title: 'Draft Query 1',
      type: 'query',
      isDraft: true,
      lastModified: Date.now(),
    };
    setTabs([initialTab]);
    setActiveTabId(newId);
  };

  const handleForceClose = () => {
    if (!contextMenu) return;
    closeTab(contextMenu.tabId, undefined, true);
  };

  const openTableInTab = useCallback((schema: string, table: string, newTab = true) => {
    if (newTab) {
      const existing = tabs.find((t) => t.type === 'table' && t.schema === schema && t.table === table);
      if (existing) {
        setActiveTabId(existing.id);
        return;
      }

      const tableTab: Tab = {
        id: Math.random().toString(36).substr(2, 9),
        title: `${schema}.${table}`,
        type: 'table',
        schema,
        table,
        lastModified: Date.now(),
      };
      setTabs(prev => [...prev, tableTab]);
      setActiveTabId(tableTab.id);
    } else {
      // Open in current tab
      setTabs(prev => prev.map(t =>
        t.id === activeTabId
          ? { ...t, type: 'table' as const, schema, table, title: `${schema}.${table}`, isDraft: false }
          : t
      ));
    }
  }, [activeTabId, tabs]);

  // Auto-open table or query from navigation state (when clicking from SchemaTree or Sidebar)
  useEffect(() => {
    const state = location.state as any;

    // Handle opening a table
    if (state?.openTable) {
      const { schema, table } = state.openTable;
      const existing = tabs.find((t) => t.type === 'table' && t.schema === schema && t.table === table);
      if (existing) {
        setActiveTabId(existing.id);
      } else {
        const tableTab: Tab = {
          id: Math.random().toString(36).substr(2, 9),
          title: `${schema}.${table}`,
          type: 'table',
          schema,
          table,
          lastModified: Date.now(),
        };
        setTabs(prev => [...prev, tableTab]);
        setActiveTabId(tableTab.id);
      }

      // Clear the state properly using navigate
      navigate(location.pathname, { replace: true, state: {} });
    }

    // Handle loading a query (from Saved Queries or History in Sidebar)
    if (state?.sql) {
      const { sql, metadata, name, id } = state;
      const normalizedSql = typeof sql === 'string' ? sql.trim() : '';

      // Check if tab with this savedQueryId already exists
      const existingTab = id
        ? tabs.find(t => t.savedQueryId === id)
        : tabs.find(t => t.type === 'query' && (t.sql || '').trim() === normalizedSql);

      if (existingTab) {
        // Switch to existing tab and update content
        setActiveTabId(existingTab.id);
        setTabs(prev => prev.map(t =>
          t.id === existingTab.id ? {
            ...t,
            sql,
            metadata,
            title: name || t.title
          } : t
        ));
      } else {
        // Check if active tab is a clean draft
        const activeTab = tabs.find(t => t.id === activeTabId);
        const isCleanDraft = activeTab && activeTab.isDraft && (!activeTab.sql || activeTab.sql.trim() === '');

        if (isCleanDraft) {
          // Reuse active empty draft tab
          setTabs(prev => prev.map(t =>
            t.id === activeTabId ? {
              ...t,
              sql,
              metadata,
              title: name || t.title,
              savedQueryId: id,
              isDraft: false
            } : t
          ));
        } else {
          // Create new tab
          const newTab: Tab = {
            id: Math.random().toString(36).substr(2, 9),
            title: name || 'Saved Query',
            type: 'query',
            sql,
            metadata,
            savedQueryId: id,
            lastModified: Date.now(),
            isDraft: false,
          };
          setTabs(prev => [...prev, newTab]);
          setActiveTabId(newTab.id);
        }
      }

      // Clear the state properly using navigate
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, activeTabId, tabs, navigate, location.pathname]);

  const handleLoadQuery = useCallback((sql: string, metadata?: Record<string, any>) => {
    // Update current tab's SQL and metadata using functional setState
    setTabs(prevTabs => prevTabs.map(t => t.id === activeTabId ? { ...t, sql, metadata } : t));
  }, [activeTabId]);

  // Handle query changes from editor (for auto-save)
  const handleQueryChange = useCallback((tabId: string, sql: string, metadata?: Record<string, any>) => {
    // Update state immediately for UI responsiveness
    setTabs(prev => prev.map(t => {
      if (t.id === tabId) {
        return { ...t, sql, metadata, lastModified: Date.now(), isDirty: true };
      }
      return t;
    }));

    // Debounce the localStorage write to reduce I/O operations
    // Clear existing timer for this tab
    const existingTimer = saveTimersRef.current.get(tabId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer to save after 1 second of inactivity
    const newTimer = setTimeout(() => {
      setTabs(currentTabs => {
        const tab = currentTabs.find(t => t.id === tabId);
        if (tab && (tab.isDraft || tab.savedQueryId)) {
          saveDraft({
            id: tab.id,
            title: tab.title,
            type: tab.type,
            sql: tab.sql || '',
            metadata: tab.metadata,
            savedQueryId: tab.savedQueryId,
            lastModified: tab.lastModified || Date.now()
          });
        }
        return currentTabs;
      });
      saveTimersRef.current.delete(tabId);
    }, 1000);

    saveTimersRef.current.set(tabId, newTimer);
  }, [saveDraft]);

  const handleSaveSuccess = useCallback((tabId: string) => {
    setTabs(prev => prev.map(t =>
      t.id === tabId ? { ...t, isDirty: false, isDraft: false } : t
    ));
  }, []);

  const handleRenameTab = async (tabId: string, newTitle: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab || !newTitle.trim() || newTitle === tab.title) {
      setEditingTabId(null);
      return;
    }

    const title = newTitle.trim();

    // If it's a saved query, update via API
    if (tab.savedQueryId && connectionId) {
      try {
        await api.put(`/api/connections/${connectionId}/saved-queries/${tab.savedQueryId}`, {
          name: title
        });
        showToast('Query renamed successfully', 'success');
      } catch (err) {
        console.error('Failed to rename query:', err);
        showToast('Failed to rename query', 'error');
        setEditingTabId(null);
        return;
      }
    }

    // Update local state
    setTabs(prev => prev.map(t => {
      if (t.id === tabId) {
        const updated = { ...t, title };
        // Update draft storage
        if (updated.isDraft || updated.savedQueryId) {
          saveDraft({
            id: updated.id,
            title: updated.title,
            type: updated.type,
            sql: updated.sql || '',
            metadata: updated.metadata,
            savedQueryId: updated.savedQueryId,
            lastModified: updated.lastModified || Date.now()
          });
        }
        return updated;
      }
      return t;
    }));
    setEditingTabId(null);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 't') {
        e.preventDefault();
        addTab();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'w') {
        e.preventDefault();
        closeTab(activeTabId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [addTab, closeTab, activeTabId]);

  // Cleanup: clear all debounce timers on unmount
  useEffect(() => {
    return () => {
      saveTimersRef.current.forEach(timer => clearTimeout(timer));
      saveTimersRef.current.clear();
    };
  }, []);


  return (
    <TabProvider openTableInTab={openTableInTab}>
      <div className="flex h-full bg-bg-0">
        {/* Left Sidebar for Saved Queries / History */}
        <div className={clsx(
          "border-r border-border bg-bg-1 transition-all duration-200",
          sidebarView ? "w-64" : "w-12"
        )}>
          <div className="flex flex-col h-full">
            <button
              onClick={() => setSidebarView(sidebarView === 'saved' ? null : 'saved')}
              className={clsx(
                "p-3 hover:bg-bg-2 border-b border-border",
                sidebarView === 'saved' && "bg-bg-2 text-accent"
              )}
              title="Saved Queries"
            >
              <BookMarked size={20} />
            </button>
            <button
              onClick={() => setSidebarView(sidebarView === 'history' ? null : 'history')}
              className={clsx(
                "p-3 hover:bg-bg-2 border-b border-border",
                sidebarView === 'history' && "bg-bg-2 text-accent"
              )}
              title="Query History"
            >
              <History size={20} />
            </button>

            {/* Sidebar Content */}
            {sidebarView === 'saved' && (
              <SavedQueriesList onSelectQuery={handleLoadQuery} />
            )}
            {sidebarView === 'history' && (
              <QueryHistory onSelectQuery={handleLoadQuery} />
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 relative">
          <div className="flex items-center bg-bg-1 border-b border-border overflow-x-auto">
            {tabs.map(tab => (
              <div
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                onContextMenu={(e) => handleContextMenu(e, tab.id)}
                className={clsx(
                  "group flex items-center gap-2 px-4 py-2 text-sm border-r border-border cursor-pointer min-w-[120px] max-w-[200px] select-none",
                  activeTabId === tab.id
                    ? "bg-bg-0 text-text-primary border-t-2 border-t-accent"
                    : "bg-bg-1 text-text-secondary hover:bg-bg-2 hover:text-text-primary"
                )}
              >
                {tab.type === 'table' ? (
                  <Database size={14} className={activeTabId === tab.id ? "text-accent" : ""} />
                ) : (
                  <FileCode size={14} className={activeTabId === tab.id ? "text-accent" : ""} />
                )}

                {editingTabId === tab.id ? (
                  <input
                    autoFocus
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onBlur={() => handleRenameTab(tab.id, editTitle)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRenameTab(tab.id, editTitle);
                      if (e.key === 'Escape') setEditingTabId(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 bg-bg-2 text-text-primary px-1 py-0.5 rounded outline-none min-w-[50px] h-5 text-sm"
                  />
                ) : (
                  <span
                    className="truncate flex-1"
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setEditingTabId(tab.id);
                      setEditTitle(tab.title);
                    }}
                    title="Double click to rename (Right-click for options)"
                  >
                    {tab.title}
                  </span>
                )}

                {(tab.isDraft || tab.isDirty) && (
                  <span className="w-2 h-2 rounded-full bg-yellow-500" title="Unsaved changes" />
                )}
                <button
                  onClick={(e) => closeTab(tab.id, e)}
                  className={clsx(
                    "p-0.5 rounded hover:bg-bg-3 opacity-0 group-hover:opacity-100 transition-opacity",
                    tabs.length === 1 && "hidden"
                  )}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            <button
              onClick={() => addTab()}
              className="p-2 text-text-secondary hover:text-text-primary hover:bg-bg-2"
              title="New Query Tab"
              aria-label="New Query Tab (Ctrl+T)"
            >
              <Plus size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-hidden relative">
            {tabs.map(tab => (
              <div
                key={tab.id}
                className={clsx(
                  "absolute inset-0 flex flex-col bg-bg-0",
                  activeTabId === tab.id ? "z-10" : "z-0 invisible"
                )}
              >
                {tab.type === 'table' ? (
                  <TableDataView schema={tab.schema} table={tab.table} />
                ) : (
                  <QueryEditor
                    initialSql={tab.sql}
                    initialMetadata={tab.metadata}
                    isActive={activeTabId === tab.id}
                    isDraft={tab.isDraft}
                    savedQueryId={tab.savedQueryId}
                    queryName={tab.title}
                    onQueryChange={(sql, metadata) => handleQueryChange(tab.id, sql, metadata)}
                    onSaveSuccess={() => handleSaveSuccess(tab.id)}
                    onSavedQueryCreated={(savedId, name) => {
                      setTabs(prev => prev.map(t => {
                        if (t.id !== tab.id) return t;
                        const updated = {
                          ...t,
                          savedQueryId: savedId,
                          title: name,
                          isDraft: false,
                          isDirty: false,
                          lastModified: Date.now(),
                        };
                        saveDraft({
                          id: updated.id,
                          title: updated.title,
                          type: updated.type,
                          sql: updated.sql || '',
                          metadata: updated.metadata,
                          savedQueryId: updated.savedQueryId,
                          lastModified: updated.lastModified || Date.now(),
                        });
                        return updated;
                      }));
                    }}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Context Menu */}
          {contextMenu && (
            <div
              className="fixed bg-bg-1 border border-border shadow-lg rounded py-1 z-50 w-48"
              style={{ top: contextMenu.y, left: contextMenu.x }}
            >
              <button
                className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-bg-2"
                onClick={() => { closeTab(contextMenu.tabId); setContextMenu(null); }}
              >
                Close Tab
              </button>
              <button
                className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-bg-2"
                onClick={handleForceClose}
              >
                Force Close (Discard)
              </button>
              <div className="border-t border-border my-1" />
              <button
                className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-bg-2"
                onClick={handleCloseOthers}
              >
                Close Other Tabs
              </button>
              <button
                className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-bg-2"
                onClick={handleCloseAll}
              >
                Close All Tabs
              </button>
            </div>
          )}
        </div>
      </div>
    </TabProvider>
  );
}
