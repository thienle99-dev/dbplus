import { useEffect, useState } from 'react';
import { ChevronRight, Database, Table, Pin } from 'lucide-react';
import api from '../services/api';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import * as Collapsible from '@radix-ui/react-collapsible';
import { useTabContext } from '../context/TabContext';
import { TableInfo } from '../types';
import TableContextMenu from './TableContextMenu';
import { usePinnedTables } from '../hooks/usePinnedTables';

interface SchemaNodeProps {
  schemaName: string;
  connectionId: string;
  searchTerm?: string;
  defaultOpen?: boolean;
}

function SchemaNode({ schemaName, connectionId, searchTerm, defaultOpen }: SchemaNodeProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen || false);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    table: string;
    position: { x: number; y: number };
  } | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { isPinned, togglePin } = usePinnedTables(connectionId);

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

  // Fetch tables when expanded
  const fetchTables = async () => {
    if (tables.length > 0) return;
    setLoading(true);
    try {
      const response = await api.get(`/api/connections/${connectionId}/tables?schema=${schemaName}`);
      setTables(response.data);
    } catch (error) {
      console.error(`Failed to fetch tables for schema ${schemaName}:`, error);
    } finally {
      setLoading(false);
    }
  };

  // If search term is present, we might want to auto-expand or filter
  // For now, let's just use it to filter visible tables if we have them
  const filteredTables = tables.filter(t =>
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
      if (tables.length === 0) fetchTables(); // Force fetch if not loaded
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

  return (
    <Collapsible.Root open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (open) fetchTables();
    }}>
      <Collapsible.Trigger className="flex items-center gap-1.5 w-full px-3 py-1.5 hover:bg-bg-2 text-sm text-text-primary group select-none transition-colors">
        <div className={`transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}>
          <ChevronRight size={12} className="text-text-secondary" />
        </div>
        <Database size={14} className="text-accent/80" />
        <span className="truncate font-medium">{schemaName}</span>
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
  const [schemas, setSchemas] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (connectionId) {
      fetchSchemas();
    }
  }, [connectionId]);

  const fetchSchemas = async () => {
    try {
      const response = await api.get(`/api/connections/${connectionId}/schemas`);
      setSchemas(response.data);
    } catch (error) {
      console.error('Failed to fetch schemas:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-4 text-xs text-text-secondary text-center">Loading schemas...</div>;

  return (
    <div className="flex flex-col pb-4">
      {schemas.map((schema) => (
        <SchemaNode
          key={schema}
          schemaName={schema}
          connectionId={connectionId!}
          searchTerm={searchTerm}
        />
      ))}
    </div>
  );
}
