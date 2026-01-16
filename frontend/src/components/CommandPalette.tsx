import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Search, Table, Eye, Code, FileCode, ArrowRight, Database, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGlobalSearch, useDatabases } from '../hooks/useDatabase';
import { useTabContext } from '../context/TabContext';
import { useWorkspaceTabsStore } from '../store/workspaceTabsStore';
import { useConnectionStore } from '../store/connectionStore';
import CreateDatabaseModal from './connections/CreateDatabaseModal';
import { useQueryClient } from '@tanstack/react-query';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  connectionId: string | undefined;
}

export default function CommandPalette({ isOpen, onClose, connectionId }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [createDbOpen, setCreateDbOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: searchResults = [] } = useGlobalSearch(connectionId, query);
  const { data: databases = [] } = useDatabases(connectionId);
  const { openTab } = useWorkspaceTabsStore();

  const { connections } = useConnectionStore();
  const connection = useMemo(() => connections.find(c => c.id === connectionId), [connections, connectionId]);
  const isPostgres = connection?.type === 'postgres';

  // Combine databases and search results
  const results = useMemo(() => {
    const dbResults = query
      ? databases.filter(db => db.toLowerCase().includes(query.toLowerCase())).map(db => ({
        name: db,
        type: 'DATABASE',
        schema: '',
      }))
      : databases.map(db => ({
        name: db,
        type: 'DATABASE',
        schema: '',
      }));

    // If query is empty, show all databases first (if reasonable count) or just nothing?
    // "Switch Database" implies we want to see databases.
    // If query is empty, allow showing databases?

    // CommandPalette is usually for searching.
    // If the user clicks "Switch Database", they might expect a list immediately.
    // Let's show databases if query is empty OR matches.

    // However, searchResults only return if query >= 2 chars usually.
    return [...dbResults, ...searchResults];
  }, [databases, searchResults, query]);

  // Tab Context
  let tabContext: any;
  try { tabContext = useTabContext(); } catch { tabContext = null; }


  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        handleSelect(results[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  // Scroll selected into view
  useEffect(() => {
    if (listRef.current && results.length > 0) {
      const el = listRef.current.children[selectedIndex] as HTMLElement;
      if (el) {
        el.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex, results]);

  const handleSelect = (item: any) => {
    if (item.type === 'DATABASE') {
      if (connectionId) {
        openTab(connectionId, item.name);
        // Force navigation to query tab of that connection/db
        navigate(`/workspace/${connectionId}/query`);
      }
      onClose();
      return;
    }

    // If View or Function -> Open Definition Modal
    if (item.type === 'VIEW' || item.type === 'FUNCTION' || item.type === 'TRIGGER') {
      window.dispatchEvent(new CustomEvent('dbplus:open-definition', {
        detail: { schema: item.schema, name: item.name, type: item.type.toLowerCase() }
      }));
      onClose();

    } else {
      // TABLE
      if (connectionId) {
        if (tabContext) {
          tabContext.openTableInTab(item.schema, item.name, true);
        } else {
          navigate(`/workspace/${connectionId}/query`, {
            state: { openTable: { schema: item.schema, table: item.name } }
          });
        }
      }
      onClose();
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-xl bg-bg-1 rounded-md shadow-2xl border border-border-subtle flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100 ring-1 ring-border-light/10">
        <div className="flex items-center px-4 py-3 border-b border-border-light gap-3">
          <Search size={18} className="text-text-secondary" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search databases, tables, views, functions..."
            className="flex-1 bg-transparent outline-none text-text-primary placeholder:text-text-secondary"
          />
          <div className="flex items-center gap-2">
            {isPostgres && (
              <button
                onClick={() => setCreateDbOpen(true)}
                className="p-1 hover:bg-bg-3 rounded text-text-secondary hover:text-accent transition-colors"
                title="Create Database"
              >
                <Plus size={16} />
              </button>
            )}
            <kbd className="px-1.5 py-0.5 bg-bg-3 rounded text-[10px] text-text-secondary">ESC</kbd>
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2" ref={listRef}>
          {results.length === 0 ? (
            <div className="py-8 text-center text-text-secondary text-sm">
              {query ? 'No results found' : 'Type to search...'}
            </div>
          ) : (
            results.map((item: any, index: number) => {
              const isSelected = index === selectedIndex;
              let Icon = Table;
              let iconColor = "text-accent";
              if (item.type === 'VIEW') { Icon = Eye; iconColor = "text-accent"; }
              if (item.type === 'FUNCTION') { Icon = FileCode; iconColor = "text-accent"; }
              if (item.type === 'TRIGGER') { Icon = Code; iconColor = "text-accent"; }
              if (item.type === 'DATABASE') { Icon = Database; iconColor = "text-accent"; }

              return (
                <div
                  key={`${item.schema}.${item.name}.${item.type}`}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer text-sm ${isSelected ? 'bg-accent/10 text-accent' : 'text-text-primary hover:bg-bg-2'}`}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <Icon size={16} className={iconColor} />
                  <div className="flex-1 flex flex-col">
                    <span className="font-medium">{item.name}</span>
                    {item.type !== 'DATABASE' && (
                      <span className="text-xs opacity-60 flex items-center gap-1">
                        {item.schema} <span className="w-1 h-1 rounded-full bg-current opacity-40" /> {item.type}
                      </span>
                    )}
                    {item.type === 'DATABASE' && (
                      <span className="text-xs opacity-60">Database</span>
                    )}
                  </div>
                  {isSelected && <ArrowRight size={14} className="opacity-50" />}
                </div>
              );
            })
          )}
        </div>
      </div>

      {createDbOpen && connectionId && (
        <CreateDatabaseModal
          open={createDbOpen}
          onOpenChange={setCreateDbOpen}
          connectionId={connectionId}
          onCreated={async () => {
            await queryClient.invalidateQueries({ queryKey: ['databases', connectionId] });
            // Maybe select the new database?
          }}
        />
      )}
    </div>,
    document.body
  );
}
