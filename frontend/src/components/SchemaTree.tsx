import { useEffect, useState } from 'react';
import { ChevronRight, Database, Plus, Table, Pin, Trash2 } from 'lucide-react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import * as Collapsible from '@radix-ui/react-collapsible';
import { useQueryClient } from '@tanstack/react-query';
import { useTabContext } from '../context/TabContext';
import { useToast } from '../context/ToastContext';
import { TableInfo } from '../types';
import TableContextMenu from './TableContextMenu';
import { usePinnedTables } from '../hooks/usePinnedTables';
import { useSchemas, useTables } from '../hooks/useDatabase';
import { connectionApi } from '../services/connectionApi';
import CreateDatabaseModal from './connections/CreateDatabaseModal';

interface SchemaNodeProps {
  schemaName: string;
  connectionId: string;
  searchTerm?: string;
  defaultOpen?: boolean;
}

function SchemaNode({ schemaName, connectionId, searchTerm, defaultOpen }: SchemaNodeProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen || false);
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [contextMenu, setContextMenu] = useState<{
    table: string;
    position: { x: number; y: number };
  } | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { isPinned, togglePin } = usePinnedTables(connectionId);

  // Conditionally fetch tables when open or searching
  const { data: tables = [], isLoading: loading } = useTables(
    connectionId,
    // If open or has search term, fetch the schema tables. Otherwise skip.
    (isOpen || !!searchTerm) ? schemaName : undefined
  );

  // Try to get tab context - it's only available when inside QueryTabs
  let tabContext;
  try {
    tabContext = useTabContext();
  } catch {
    // Not inside TabProvider, that's okay
    tabContext = null;
  }

  // Use tabs if we're on the query route and context is available
  const isQueryRoute = location.pathname.includes('/query');
  const shouldUseTabs = isQueryRoute && tabContext;

  // If search term is present, we might want to auto-expand or filter
  // For now, let's just use it to filter visible tables if we have them
  const filteredTables = (tables as any[]).map(t => typeof t === 'string' ? { name: t } : t).filter(t =>
    !searchTerm || t.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sort tables: pinned first, then alphabetically
  const sortedTables = [...filteredTables].sort((a, b) => {
    const aIsPinned = isPinned(schemaName, a.name);
    const bIsPinned = isPinned(schemaName, b.name);

    if (aIsPinned && !bIsPinned) return -1;
    if (!aIsPinned && bIsPinned) return 1;
    return a.name.localeCompare(b.name);
  });

  const shouldShow = !searchTerm || filteredTables.length > 0 || schemaName.toLowerCase().includes(searchTerm.toLowerCase());

  // Auto-expand if searching and matches
  useEffect(() => {
    if (searchTerm && filteredTables.length > 0 && !isOpen) {
      setIsOpen(true);
    }
  }, [searchTerm, filteredTables.length]);


  if (!shouldShow) return null;

  const handleTableClick = (table: TableInfo) => {
    if (shouldUseTabs && tabContext) {
      // Already on query route, open in tab
      tabContext.openTableInTab(schemaName, table.name, true);
    } else {
      // Navigate to query route with state to auto-open table
      navigate(`/workspace/${connectionId}/query`, {
        state: { openTable: { schema: schemaName, table: table.name } }
      });
    }
  };

  const handleContextMenu = (e: React.MouseEvent, tableName: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      table: tableName,
      position: { x: e.clientX, y: e.clientY },
    });
  };

  const handleDropSchema = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const confirmName = prompt(`To drop schema "${schemaName}", type its name to confirm:`);
    if (confirmName !== schemaName) {
      if (confirmName !== null) showToast('Schema name did not match', 'error');
      return;
    }

    try {
      await connectionApi.dropSchema(connectionId, schemaName);
      await queryClient.invalidateQueries({ queryKey: ['schemas', connectionId] });
      await queryClient.invalidateQueries({ queryKey: ['tables', connectionId] });
      showToast(`Schema '${schemaName}' dropped`, 'success');
    } catch (err: any) {
      console.error('Failed to drop schema', err);
      showToast(err?.response?.data?.message || err?.response?.data || 'Failed to drop schema', 'error');
    }
  };

  return (
    <Collapsible.Root open={isOpen} onOpenChange={setIsOpen}>
      <Collapsible.Trigger className="flex items-center gap-1.5 w-full px-3 py-1.5 hover:bg-bg-2 text-sm text-text-primary group select-none transition-colors">
        <div className={`transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}>
          <ChevronRight size={12} className="text-text-secondary" />
        </div>
        <Database size={14} className="text-accent/80" />
        <span className="truncate font-medium flex-1">{schemaName}</span>
        <button
          className="opacity-0 group-hover:opacity-100 transition-opacity text-text-secondary hover:text-red-400"
          title="Drop schema"
          onClick={handleDropSchema}
        >
          <Trash2 size={14} />
        </button>
      </Collapsible.Trigger>

      <Collapsible.Content className="pl-3 ml-2 border-l border-border/50 overflow-hidden data-[state=closed]:animate-slideUp data-[state=open]:animate-slideDown">
        {loading ? (
          <div className="text-[10px] text-text-secondary py-1 pl-4">Loading tables...</div>
        ) : filteredTables.length === 0 && tables.length > 0 ? (
          <div className="text-[10px] text-text-secondary py-1 pl-4">No matching tables</div>
        ) : (
          sortedTables.map((table) => {
            const tablePinned = isPinned(schemaName, table.name);
            return (
              <div
                key={table.name}
                onClick={() => handleTableClick(table)}
                onContextMenu={(e) => handleContextMenu(e, table.name)}
                className="flex items-center gap-2 pl-4 py-1.5 hover:bg-bg-2 rounded-r-md text-sm text-text-secondary hover:text-text-primary cursor-pointer transition-colors group"
              >
                <Table size={14} className="flex-shrink-0 opacity-70" />
                <span className="truncate flex-1">{table.name}</span>
                {tablePinned && (
                  <Pin size={12} className="flex-shrink-0 text-accent opacity-60" />
                )}
              </div>
            );
          })
        )}
      </Collapsible.Content>

      {contextMenu && (
        <TableContextMenu
          table={contextMenu.table}
          schema={schemaName}
          connectionId={connectionId}
          position={contextMenu.position}
          onClose={() => setContextMenu(null)}
          isPinned={isPinned(schemaName, contextMenu.table)}
          onTogglePin={() => togglePin(schemaName, contextMenu.table)}
        />
      )}
    </Collapsible.Root>
  );
}

export default function SchemaTree({ searchTerm }: { searchTerm?: string }) {
  const { connectionId } = useParams();
  const { data: schemas = [], isLoading: loading } = useSchemas(connectionId);
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [createDbOpen, setCreateDbOpen] = useState(false);

  if (loading) return <div className="p-4 text-xs text-text-secondary text-center">Loading schemas...</div>;

  const handleOpenCreateDatabase = () => {
    if (!connectionId) return;
    setCreateDbOpen(true);
  };

  const handleCreateSchema = async () => {
    if (!connectionId) return;
    const name = (prompt('Schema name to create:') || '').trim();
    if (!name) return;

    try {
      const result = await connectionApi.createSchema(connectionId, name);
      await queryClient.invalidateQueries({ queryKey: ['schemas', connectionId] });
      showToast(result.message || `Schema '${name}' created`, result.success ? 'success' : 'error');
    } catch (err: any) {
      console.error('Failed to create schema', err);
      showToast(err?.response?.data?.message || err?.response?.data || 'Failed to create schema', 'error');
    }
  };

  return (
    <div className="flex flex-col pb-4">
      <div className="px-3 py-2 flex items-center justify-between">
        <div className="text-xs font-medium text-text-secondary uppercase tracking-wide">Schemas</div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleOpenCreateDatabase}
            className="p-1 rounded hover:bg-bg-2 text-text-secondary hover:text-text-primary transition-colors"
            title="Create database"
          >
            <Database size={14} />
          </button>
          <button
            onClick={handleCreateSchema}
            className="p-1 rounded hover:bg-bg-2 text-text-secondary hover:text-text-primary transition-colors"
            title="Create schema"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>
      {schemas.map((schema) => (
        <SchemaNode
          key={schema}
          schemaName={schema}
          connectionId={connectionId!}
          searchTerm={searchTerm}
        />
      ))}

      {connectionId && (
        <CreateDatabaseModal
          open={createDbOpen}
          onOpenChange={setCreateDbOpen}
          connectionId={connectionId}
          onCreated={async () => {
            await queryClient.invalidateQueries({ queryKey: ['databases', connectionId] });
          }}
        />
      )}
    </div>
  );
}
