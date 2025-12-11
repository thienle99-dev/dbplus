import { useState, useEffect, useCallback } from 'react';
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

export default function QueryTabs() {
  const { connectionId } = useParams<{ connectionId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { saveDraft, loadDrafts, deleteDraft } = useDraftPersistence(connectionId || '');

  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState('');
  const [sidebarView, setSidebarView] = useState<'saved' | 'history' | null>(null);

  // Load drafts on mount
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
  }, [connectionId, loadDrafts]);

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

  const closeTab = useCallback((id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setTabs(prev => {
      if (prev.length === 1) return prev;

      // Delete draft from localStorage if it's a draft
      const tabToClose = prev.find(t => t.id === id);
      if (tabToClose?.isDraft && connectionId) {
        deleteDraft(id);
      }

      const newTabs = prev.filter(t => t.id !== id);
      if (activeTabId === id) {
        const closedIndex = prev.findIndex(t => t.id === id);
        const newActiveTab = newTabs[closedIndex] || newTabs[closedIndex - 1] || newTabs[0];
        if (newActiveTab) {
          setActiveTabId(newActiveTab.id);
        }
      }
      return newTabs;
    });
  }, [activeTabId, connectionId, deleteDraft]);

  const openTableInTab = useCallback((schema: string, table: string, newTab = true) => {
    if (newTab) {
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
  }, [activeTabId]);

  // Auto-open table or query from navigation state (when clicking from SchemaTree or Sidebar)
  // Auto-open table or query from navigation state (when clicking from SchemaTree or Sidebar)
  useEffect(() => {
    const state = location.state as any;

    // Handle opening a table
    if (state?.openTable) {
      const { schema, table } = state.openTable;
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

      // Clear the state properly using navigate
      navigate(location.pathname, { replace: true, state: {} });
    }

    // Handle loading a query (from Saved Queries or History in Sidebar)
    if (state?.sql) {
      const { sql, metadata, name, id } = state;

      // Check if tab with this savedQueryId already exists
      const existingTab = id ? tabs.find(t => t.savedQueryId === id) : undefined;

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
    setTabs(prev => prev.map(t => {
      if (t.id === tabId) {
        // Mark as dirty when modified
        const updated = { ...t, sql, metadata, lastModified: Date.now(), isDirty: true };

        // Auto-save draft to localStorage
        if (updated.isDraft || updated.savedQueryId) {
          saveDraft({
            id: updated.id,
            title: updated.title,
            type: updated.type,
            sql: updated.sql,
            metadata: updated.metadata,
            savedQueryId: updated.savedQueryId,
            lastModified: updated.lastModified
          });
        }
        return updated;
      }
      return t;
    }));
  }, [saveDraft]);

  const handleSaveSuccess = useCallback((tabId: string) => {
    setTabs(prev => prev.map(t =>
      t.id === tabId ? { ...t, isDirty: false, isDraft: false } : t
    ));
    // Optional: decide if we keep the draft in local storage or clear it.
    // Usually purely saved queries don't need drafts unless modified again.
    // For now, we can leave it or clear it. Let's not delete distinctively.
  }, []);

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
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center bg-bg-1 border-b border-border overflow-x-auto">
            {tabs.map(tab => (
              <div
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                className={clsx(
                  "group flex items-center gap-2 px-4 py-2 text-sm border-r border-border cursor-pointer min-w-[120px] max-w-[200px]",
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
                <span className="truncate flex-1">{tab.title}</span>
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
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </TabProvider>
  );
}
