import { useState, useEffect, useCallback, useRef, lazy, Suspense, useTransition } from 'react';
import { Plus, X, FileCode, Database, Pin } from 'lucide-react';
import { clsx } from 'clsx';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
const QueryEditor = lazy(() => import('./QueryEditor'));
const TableDataView = lazy(() => import('./TableDataView'));
import { useDraftPersistence } from '../hooks/useDraftPersistence';
import { TabProvider } from '../context/TabContext';
import { Tab } from '../types';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { useWorkspaceTabsStore } from '../store/workspaceTabsStore';
import { useConnectionStore } from '../store/connectionStore';

export default function QueryTabs() {
  const [, startTransition] = useTransition();
  const { connectionId } = useParams<{ connectionId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { tabs: workspaceTabs, activeTabId: activeWorkspaceTabId, updateTabDatabase } = useWorkspaceTabsStore();
  const { connections } = useConnectionStore();

  const connectionDefaultDb = connections.find((c) => c.id === connectionId)?.database;
  const activeWorkspaceTab = workspaceTabs.find((t) => t.id === activeWorkspaceTabId);
  const effectiveDatabase =
    activeWorkspaceTab && activeWorkspaceTab.connectionId === connectionId
      ? activeWorkspaceTab.database || connectionDefaultDb
      : connectionDefaultDb;
  const draftScopeKey = `${connectionId || 'no-connection'}::${effectiveDatabase || 'default'}`;

  const { saveDraft, loadDrafts, deleteDraft, clearAllDrafts } = useDraftPersistence(draftScopeKey);

  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState('');
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  // Sleep Tab Logic
  const prevActiveTabIdRef = useRef<string | null>(null);
  const handledKeys = useRef(new Set<string>());
  const SLEEP_TIMEOUT = 5 * 60 * 1000; // 5 minutes

  // Track active state transitions
  useEffect(() => {
    const prevId = prevActiveTabIdRef.current;
    const currId = activeTabId;

    setTabs(prev => prev.map(t => {
      if (t.id === currId) {
        // Becomes active: Wake up and update timestamp
        return { ...t, isSleeping: false, lastActive: Date.now() };
      }
      if (t.id === prevId) {
        // Becomes inactive: Update timestamp
        return { ...t, lastActive: Date.now() };
      }
      // Initialize lastActive if missing
      if (!t.lastActive) return { ...t, lastActive: Date.now() };
      return t;
    }));
    prevActiveTabIdRef.current = currId;
  }, [activeTabId]);

  // Sleep Timer
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setTabs(prev => prev.map(t => {
        if (t.id === activeTabId) return t; // Active tab never sleeps
        if (t.isSleeping) return t; // Already sleeping

        if (t.lastActive && (now - t.lastActive > SLEEP_TIMEOUT)) {
          console.log(`[QueryTabs] Tab ${t.id} is sleeping due to inactivity`);
          return { ...t, isSleeping: true };
        }
        return t;
      }));
    }, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [activeTabId]);

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
    startTransition(() => setActiveTabId(newId));
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
      // Note: If last tab is closed, the logic below (newTabs.length === 0) handles re-creating a fresh default one.

      const tabToClose = prev.find(t => t.id === id);

      // Prevent closing pinned tabs unless forced
      if (tabToClose?.pinned && !force) {
        showToast('Cannot close pinned tab. Unpin it first or use Force Close.', 'info');
        return prev;
      }

      // If force or not dirty, we can close. 
      // If dirty and not force, we usually keep it (handled by UI confirmation separately if needed, 
      // but current logic assumes auto-save handles draft, so "Close" is safe to just close view.
      // "Force Close" usually implies "Delete Draft" too if we wanted to revert changes).

      if (connectionId) {
        deleteDraft(id);
      }

      const newTabs = prev.filter(t => t.id !== id);

      // If we closed the active tab
      if (activeTabId === id) {
        const closedIndex = prev.findIndex(t => t.id === id);
        // Try to go to right, else left
        const newActiveTab = newTabs[closedIndex] || newTabs[closedIndex - 1] || newTabs[0];
        if (newActiveTab) {
          startTransition(() => setActiveTabId(newActiveTab.id));
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
            startTransition(() => setActiveTabId(newId));
          }, 0);
          return []; // Temporary empty
        }
      }
      return newTabs;
    });
  }, [activeTabId, connectionId, deleteDraft, showToast]);

  const handleCloseOthers = () => {
    if (!contextMenu) return;
    const tabToKeep = tabs.find(t => t.id === contextMenu.tabId);
    if (!tabToKeep) return;

    // Delete drafts for all other tabs
    tabs.forEach(t => {
      if (t.id !== contextMenu.tabId && connectionId) {
        deleteDraft(t.id);
      }
    });

    setTabs([tabToKeep]);
    startTransition(() => setActiveTabId(contextMenu.tabId));
  };

  const handleCloseAll = () => {
    if (connectionId) {
      clearAllDrafts();
    }
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
    startTransition(() => setActiveTabId(newId));
  };

  const handleForceClose = () => {
    if (!contextMenu) return;
    closeTab(contextMenu.tabId, undefined, true);
  };

  const handlePinTab = () => {
    if (!contextMenu) return;
    setTabs(prev => prev.map(t =>
      t.id === contextMenu.tabId ? { ...t, pinned: !t.pinned } : t
    ));
    setContextMenu(null);
  };

  const handleDuplicateTab = () => {
    if (!contextMenu) return;
    const tabToDuplicate = tabs.find(t => t.id === contextMenu.tabId);
    if (!tabToDuplicate) return;

    const newId = Math.random().toString(36).substr(2, 9);
    const duplicatedTab: Tab = {
      ...tabToDuplicate,
      id: newId,
      title: `${tabToDuplicate.title} (Copy)`,
      isDraft: true,
      savedQueryId: undefined, // Don't link to original saved query
      lastModified: Date.now(),
    };

    setTabs(prev => [...prev, duplicatedTab]);
    startTransition(() => setActiveTabId(newId));
    setContextMenu(null);
  };

  const handleSetSplitMode = (mode: 'none' | 'vertical' | 'horizontal') => {
    if (!contextMenu) return;
    setTabs(prev => prev.map(t =>
      t.id === contextMenu.tabId ? { ...t, splitMode: mode } : t
    ));
    setContextMenu(null);
  };

  const openTableInTab = useCallback((schema: string, table: string, newTab = true) => {
    if (newTab) {
      const existing = tabs.find((t) => t.type === 'table' && t.schema === schema && t.table === table);
      if (existing) {
        startTransition(() => setActiveTabId(existing.id));
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
      startTransition(() => setActiveTabId(tableTab.id));
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
    if (!state || Object.keys(state).length === 0 || handledKeys.current.has(location.key)) return;

    // Mark this location key as handled
    handledKeys.current.add(location.key);

    // Handle opening a table
    if (state?.openTable) {
      const { schema, table } = state.openTable;
      const existing = tabs.find((t) => t.type === 'table' && t.schema === schema && t.table === table);
      if (existing) {
        startTransition(() => setActiveTabId(existing.id));
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
        startTransition(() => setActiveTabId(tableTab.id));
      }

      // Clear the state properly using navigate
      navigate(location.pathname, { replace: true, state: {} });
    }

    // Handle loading a query (from Saved Queries or History in Sidebar)
    else if (state?.sql) {
      const { sql, metadata, name, id } = state;
      const normalizedSql = typeof sql === 'string' ? sql.trim() : '';

      // Check if tab with this savedQueryId already exists
      const existingTab = id
        ? tabs.find(t => t.savedQueryId === id)
        : tabs.find(t => t.type === 'query' && (t.sql || '').trim() === normalizedSql);

      if (existingTab) {
        // Switch to existing tab and update content
        startTransition(() => setActiveTabId(existingTab.id));
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
          startTransition(() => setActiveTabId(newTab.id));
        }
      }

      // Clear the state properly using navigate
      navigate(location.pathname, { replace: true, state: {} });
    }

    // Handle opening a new query tab
    else if (state?.newQuery) {
      if (state.schema && activeWorkspaceTabId) {
        updateTabDatabase(activeWorkspaceTabId, state.schema);
      }
      addTab();
      // Clear the state properly using navigate
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.key, activeTabId, tabs, navigate, location.pathname, addTab, activeWorkspaceTabId, updateTabDatabase]);



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


        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 relative bg-bg-0">
          <div className="flex items-end bg-bg-sunken border-b border-border-default overflow-x-auto no-scrollbar pt-1.5 px-2 gap-1 h-10">
            {tabs.map((tab, index) => {
              const isActive = activeTabId === tab.id;
              const nextTab = tabs[index + 1];
              const isNextActive = nextTab?.id === activeTabId;

              return (
                <div
                  key={tab.id}
                  onClick={() => startTransition(() => setActiveTabId(tab.id))}
                  onContextMenu={(e) => handleContextMenu(e, tab.id)}
                  className={clsx(
                    "group relative flex items-center gap-2 px-3 py-1.5 min-w-[120px] max-w-[200px] cursor-pointer select-none transition-all duration-200 rounded-t-md border-t border-x",
                    isActive
                      ? "bg-bg-0 border-border-default border-b-transparent text-text-primary z-10 mb-[-1px] shadow-sm"
                      : "bg-transparent border-transparent text-text-secondary hover:bg-bg-elevated/50"
                  )}
                >
                  {/* Divider for inactive tabs */}
                  {!isActive && !isNextActive && index !== tabs.length - 1 && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-px h-4 bg-border-default group-hover:hidden" />
                  )}

                  {tab.type === 'table' ? (
                    <Database size={13} className={isActive ? "text-accent" : "opacity-70"} />
                  ) : (
                    <FileCode size={13} className={isActive ? "text-accent" : "opacity-70"} />
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
                      className="flex-1 bg-bg-sunken text-text-primary px-1.5 py-0.5 rounded outline-none w-full min-w-0 text-xs"
                    />
                  ) : (
                    <span
                      className="truncate flex-1 text-xs font-medium"
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

                  {tab.pinned && (
                    <Pin size={10} className="text-secondary opacity-80" />
                  )}

                  {(tab.isDraft || tab.isDirty) && (
                    <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" title="Unsaved changes" />
                  )}

                  {tab.isSleeping && (
                    <span className="text-[8px] uppercase font-black text-text-muted opacity-50 px-1 select-none">Zzz</span>
                  )}

                  <button
                    onClick={(e) => closeTab(tab.id, e)}
                    className={clsx(
                      "p-0.5 rounded-full hover:bg-bg-elevated hover:text-red-500 text-text-muted opacity-0 group-hover:opacity-100 transition-all ml-1",
                      isActive && "opacity-100 text-text-secondary",
                      tabs.length === 1 && "hidden"
                    )}
                  >
                    <X size={12} strokeWidth={2.5} />
                  </button>

                  {/* Active Indicator Line on top (Chrome style highlight) */}
                  {isActive && (
                    <div className="absolute top-[-1px] left-0 right-0 h-[2px] bg-accent rounded-t-md" />
                  )}
                </div>
              );
            })}
            <button
              onClick={() => addTab()}
              className="flex items-center justify-center w-6 h-6 ml-1.5 mb-1.5 text-text-muted hover:text-text-primary hover:bg-bg-elevated rounded-full transition-all border border-transparent hover:border-border-default hover:shadow-sm group"
              title="New Query Tab (Ctrl+T)"
            >
              <Plus size={14} strokeWidth={3} className="group-hover:scale-110 transition-transform" />
            </button>
          </div>

          <div className="flex-1 overflow-hidden relative bg-bg-0 z-0">
            {tabs.map(tab => {
              const isActive = activeTabId === tab.id;

              // Sleep Logic: Unmount if sleeping AND not active
              if (!isActive && tab.isSleeping) return null;

              // Soft Tab Logic: Keep mounted (hidden) if not active and not sleeping
              const displayStyle = isActive ? 'flex' : 'none';

              return (
                <div
                  key={tab.id}
                  className="absolute inset-0 flex-col bg-transparent z-10"
                  style={{ display: displayStyle }}
                >
                  <Suspense fallback={<div className="flex h-full items-center justify-center text-text-secondary">Loading component...</div>}>
                    {tab.type === 'table' ? (
                      <TableDataView
                        schema={tab.schema!}
                        table={tab.table!}
                        tabId={tab.id}
                      />
                    ) : (
                      <QueryEditor
                        initialSql={tab.sql}
                        initialMetadata={tab.metadata}
                        isActive={isActive} // Was activeTabId === tab.id
                        isDraft={tab.isDraft}
                        savedQueryId={tab.savedQueryId}
                        queryName={tab.title}
                        splitMode={tab.splitMode}
                        tabId={tab.id}
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
                  </Suspense>
                </div>
              );
            })}
          </div>

          {/* Context Menu */}
          {contextMenu && (
            <div
              className="fixed bg-bg-1 border border-border-light shadow-lg rounded py-1 z-50 w-48"
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
              <div className="border-t border-border-light my-1" />
              <button
                className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-bg-2"
                onClick={handlePinTab}
              >
                {tabs.find(t => t.id === contextMenu.tabId)?.pinned ? 'Unpin Tab' : 'Pin Tab'}
              </button>
              <button
                className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-bg-2"
                onClick={handleDuplicateTab}
              >
                Duplicate Tab
              </button>
              <div className="border-t border-border-light my-1" />
              <button
                className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-bg-2"
                onClick={() => handleSetSplitMode('vertical')}
              >
                Split Vertical
              </button>
              <button
                className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-bg-2"
                onClick={() => handleSetSplitMode('horizontal')}
              >
                Split Horizontal
              </button>
              <button
                className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-bg-2"
                onClick={() => handleSetSplitMode('none')}
              >
                No Split
              </button>
              <div className="border-t border-border-light my-1" />
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
