import { useState, useEffect, useCallback } from 'react';
import { Plus, X, FileCode, BookMarked, History } from 'lucide-react';
import { clsx } from 'clsx';
import { useParams } from 'react-router-dom';
import QueryEditor from './QueryEditor';
import SavedQueriesList from './SavedQueriesList';
import QueryHistory from './QueryHistory';
import { useDraftPersistence } from '../hooks/useDraftPersistence';

interface Tab {
  id: string;
  title: string;
  sql?: string;
  metadata?: Record<string, any>;
  isDraft?: boolean;
  savedQueryId?: string;
  lastModified?: number;
}

export default function QueryTabs() {
  const { connectionId } = useParams<{ connectionId: string }>();
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
        sql: draft.sql,
        metadata: draft.metadata,
        isDraft: true,
        lastModified: draft.lastModified,
      }));
      setTabs(draftTabs);
      setActiveTabId(draftTabs[0].id);
    } else {
      // Create initial draft tab if no drafts exist
      const initialTab: Tab = {
        id: Math.random().toString(36).substr(2, 9),
        title: 'Draft Query 1',
        isDraft: true,
        lastModified: Date.now(),
      };
      setTabs([initialTab]);
      setActiveTabId(initialTab.id);
    }
  }, [connectionId, loadDrafts]);

  const addTab = useCallback((sql?: string, metadata?: Record<string, any>) => {
    const newId = Math.random().toString(36).substr(2, 9);
    const draftCount = tabs.filter(t => t.isDraft).length;
    const newTab: Tab = {
      id: newId,
      title: sql ? `Query ${tabs.length + 1}` : `Draft Query ${draftCount + 1}`,
      sql,
      metadata,
      isDraft: !sql, // New tabs without SQL are drafts
      lastModified: Date.now(),
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newId);
  }, [tabs.length]);

  const closeTab = useCallback((id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (tabs.length === 1) return;

    // Delete draft from localStorage if it's a draft
    const tabToClose = tabs.find(t => t.id === id);
    if (tabToClose?.isDraft) {
      deleteDraft(id);
    }

    setTabs(prev => {
      const newTabs = prev.filter(t => t.id !== id);
      if (activeTabId === id) {
        setActiveTabId(newTabs[newTabs.length - 1].id);
      }
      return newTabs;
    });
  }, [tabs, activeTabId, deleteDraft]);

  const handleLoadQuery = (sql: string, metadata?: Record<string, any>) => {
    // Update current tab's SQL and metadata
    setTabs(tabs.map(t => t.id === activeTabId ? { ...t, sql, metadata } : t));
  };

  // Handle query changes from editor (for auto-save)
  const handleQueryChange = useCallback((tabId: string, sql: string, metadata?: Record<string, any>) => {
    setTabs(prev => prev.map(t => {
      if (t.id === tabId) {
        const updated = { ...t, sql, metadata, lastModified: Date.now() };
        // Auto-save draft to localStorage
        if (updated.isDraft) {
          saveDraft({
            id: updated.id,
            title: updated.title,
            sql: sql || '',
            metadata,
            lastModified: updated.lastModified || Date.now(),
          });
        }
        return updated;
      }
      return t;
    }));
  }, [saveDraft]);

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
    <div className="flex h-full bg-bg-0">
      {/* Sidebar Actions */}
      <div className="w-12 border-r border-border bg-bg-1 flex flex-col items-center py-4 gap-4">
        <button
          onClick={() => setSidebarView(sidebarView === 'saved' ? null : 'saved')}
          className={clsx("p-2 rounded hover:bg-bg-2 text-text-secondary hover:text-text-primary", sidebarView === 'saved' && "bg-accent/10 text-accent")}
          title="Saved Queries"
        >
          <BookMarked size={20} />
        </button>
        <button
          onClick={() => setSidebarView(sidebarView === 'history' ? null : 'history')}
          className={clsx("p-2 rounded hover:bg-bg-2 text-text-secondary hover:text-text-primary", sidebarView === 'history' && "bg-accent/10 text-accent")}
          title="Query History"
        >
          <History size={20} />
        </button>
      </div>

      {/* Sidebar Content */}
      {sidebarView === 'saved' && (
        <SavedQueriesList onSelectQuery={handleLoadQuery} />
      )}
      {sidebarView === 'history' && (
        <QueryHistory onSelectQuery={handleLoadQuery} />
      )}

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
              <FileCode size={14} className={activeTabId === tab.id ? "text-accent" : ""} />
              <span className="truncate flex-1">{tab.title}</span>
              {tab.isDraft && (
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" title="Draft - Auto-saved" />
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
              <QueryEditor
                initialSql={tab.sql}
                initialMetadata={tab.metadata}
                isActive={activeTabId === tab.id}
                isDraft={tab.isDraft}
                onQueryChange={(sql, metadata) => handleQueryChange(tab.id, sql, metadata)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
