import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Database, Plus, Table, Pin, Trash2, Wrench, Eye, Code, FileCode } from 'lucide-react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import * as Collapsible from '@radix-ui/react-collapsible';
import { useQueryClient } from '@tanstack/react-query';
import { useTabContext } from '../context/TabContext';
import { useToast } from '../context/ToastContext';
import { TableInfo, ViewInfo, FunctionInfo } from '../types';
import TableContextMenu from './TableContextMenu';
import DataToolsModal from './DataToolsModal';
import { usePinnedTables } from '../hooks/usePinnedTables';
import { useSchemas, useTables, useViews, useFunctions } from '../hooks/useDatabase';
import { connectionApi } from '../services/connectionApi';
import CreateDatabaseModal from './connections/CreateDatabaseModal';
import { invoke } from '@tauri-apps/api/core';
import { useConnectionStore } from '../store/connectionStore';
import SqliteToolsModal from './sqlite/SqliteToolsModal';
import CreateSchemaModal from './CreateSchemaModal';
import ObjectDefinitionModal from './ObjectDefinitionModal';

interface ObjectFolderProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  count?: number;
  defaultOpen?: boolean;
  className?: string;
}

function ObjectFolder({ title, icon, children, count, defaultOpen, className }: ObjectFolderProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen || false);

  // If we have an explicit count of 0, don't show the folder? 
  // Or simpler: always show. Let's filter in parent if we want to hide empty.
  if (count === 0 && !defaultOpen) {
    // Optional: render closed and grayed out?
  }

  return (
    <Collapsible.Root open={isOpen} onOpenChange={setIsOpen}>
      <Collapsible.Trigger className={`flex items-center gap-1.5 w-full pl-6 pr-3 py-1 hover:bg-bg-2 text-xs text-text-secondary select-none transition-colors group ${className}`}>
        <div className={`transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}>
          <ChevronRight size={10} className="text-text-tertiary group-hover:text-text-secondary" />
        </div>
        {icon}
        <span className="flex-1 text-left font-medium">{title}</span>
        {count !== undefined && <span className="text-[10px] text-text-tertiary bg-bg-3 px-1.5 rounded-full">{count}</span>}
      </Collapsible.Trigger>
      <Collapsible.Content className="overflow-hidden data-[state=closed]:animate-slideUp data-[state=open]:animate-slideDown">
        {children}
      </Collapsible.Content>
    </Collapsible.Root>
  )
}

interface SchemaNodeProps {
  schemaName: string;
  connectionId: string;
  searchTerm?: string;
  defaultOpen?: boolean;
  connectionType?: string;
  showPinnedOnly?: boolean;
}

function SchemaNode({ schemaName, connectionId, searchTerm, defaultOpen, connectionType, showPinnedOnly }: SchemaNodeProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen || false);
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [contextMenu, setContextMenu] = useState<{
    table: string;
    position: { x: number; y: number };
  } | null>(null);
  const [dataTools, setDataTools] = useState<null | { mode: 'export' | 'import'; format: 'csv' | 'json' | 'sql'; schema: string; table: string }>(null);

  // Definition Modal State
  const [defModal, setDefModal] = useState<{ open: boolean; name: string; type: 'view' | 'function' }>({ open: false, name: '', type: 'view' });

  const navigate = useNavigate();
  const location = useLocation();
  const { isPinned, togglePin } = usePinnedTables(connectionId);

  // Fetch Logic
  const shouldFetch = isOpen || !!searchTerm;
  const { data: tables = [], isLoading: loadingTables } = useTables(connectionId, shouldFetch ? schemaName : undefined);
  const { data: views = [], isLoading: loadingViews } = useViews(connectionId, shouldFetch ? schemaName : undefined);
  const { data: functions = [], isLoading: loadingFunctions } = useFunctions(connectionId, shouldFetch ? schemaName : undefined);

  // Determine Loading
  const loading = loadingTables || loadingViews || loadingFunctions;
  const hasLoaded = !loading;

  // Filter Logic
  const filterItem = (name: string) => !searchTerm || name.toLowerCase().includes(searchTerm.toLowerCase());

  const filteredTables = (tables as TableInfo[])
    .filter(t => filterItem(t.name) && (!showPinnedOnly || isPinned(schemaName, t.name)))
    .sort((a, b) => {
      const aPin = isPinned(schemaName, a.name);
      const bPin = isPinned(schemaName, b.name);
      if (aPin !== bPin) return aPin ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

  const filteredViews = (views as ViewInfo[]).filter(v => filterItem(v.name));
  const filteredFunctions = (functions as FunctionInfo[]).filter(f => filterItem(f.name));

  // If showing pinned only, don't show schema if no pinned tables (and no searched items if searching)
  const hasItems = filteredTables.length > 0 || filteredViews.length > 0 || filteredFunctions.length > 0;

  // Should show logic
  const shouldShow = hasItems || (searchTerm && schemaName.toLowerCase().includes(searchTerm.toLowerCase()));
  // Tab / Navigation Logic
  let tabContext: any;
  try { tabContext = useTabContext(); } catch { tabContext = null; }
  const shouldUseTabs = location.pathname.includes('/query') && tabContext;

  const handleTableClick = (table: TableInfo) => {
    if (shouldUseTabs && tabContext) {
      tabContext.openTableInTab(schemaName, table.name, true);
    } else {
      navigate(`/workspace/${connectionId}/query`, {
        state: { openTable: { schema: schemaName, table: table.name } }
      });
    }
  };

  const handleObjectClick = (name: string, type: 'view' | 'function') => {
    setDefModal({ open: true, name, type });
  };

  const handleContextMenu = (e: React.MouseEvent, tableName: string) => {
    e.preventDefault(); e.stopPropagation();
    setContextMenu({ table: tableName, position: { x: e.clientX, y: e.clientY } });
  };

  const handleDropSchemaClick = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (connectionType === 'sqlite' && schemaName === 'main') {
      showToast('Cannot detach main database', 'error'); return;
    }
    const msg = connectionType === 'sqlite' ? `Detach attached database "${schemaName}"?` : `Drop schema "${schemaName}"?`;
    if (!confirm(msg)) return;
    try {
      if (connectionType === 'sqlite') {
        await connectionApi.deleteSqliteAttachment(connectionId, schemaName);
        showToast(`Detached '${schemaName}'`, 'success');
      } else {
        const confirmName = prompt(`To drop schema "${schemaName}", type its name to confirm:`);
        if (confirmName !== schemaName) return;
        await connectionApi.dropSchema(connectionId, schemaName);
        showToast(`Schema '${schemaName}' dropped`, 'success');
      }
      await queryClient.invalidateQueries({ queryKey: ['schemas', connectionId] });
      await queryClient.invalidateQueries({ queryKey: ['tables', connectionId] });
    } catch (err: any) {
      showToast('Failed to drop/detach schema', 'error');
    }
  };

  // Auto-expand
  useEffect(() => {
    if (searchTerm && hasItems && !isOpen) setIsOpen(true);
  }, [searchTerm, hasItems]);

  // Visibility Logic
  // If searching, hide if no matches found
  if (searchTerm && !shouldShow && hasLoaded) return null;

  // If showing pinned only, hide if no pinned tables found (only after loading to be sure)
  if (showPinnedOnly && hasLoaded && filteredTables.length === 0) return null;

  // Otherwise, always show the schema folder (even if empty, allow user to open)
  // This fixes the issue where clicking a schema made it disappear because it was "empty" before loading finished or if genuinely empty


  return (
    <Collapsible.Root open={isOpen} onOpenChange={setIsOpen}>
      <Collapsible.Trigger className="flex items-center gap-1.5 w-full px-3 py-1.5 hover:bg-bg-2 text-sm text-text-primary group select-none transition-colors">
        <div className={`transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}>
          <ChevronRight size={12} className="text-text-secondary" />
        </div>
        <Database size={14} className="text-accent/80" />
        <span className="truncate font-medium flex-1 text-left">{schemaName}</span>
        {!(connectionType === 'sqlite' && schemaName === 'main') && (
          <span className="opacity-0 group-hover:opacity-100 transition-opacity text-text-secondary hover:text-red-400"
            onClick={handleDropSchemaClick}>
            <Trash2 size={14} />
          </span>
        )}
      </Collapsible.Trigger>

      <Collapsible.Content className="ml-2 border-l border-border/50 overflow-hidden data-[state=closed]:animate-slideUp data-[state=open]:animate-slideDown">
        {loading ? (
          <div className="pl-6 py-1 text-[10px] text-text-secondary">Loading objects...</div>
        ) : !hasItems ? (
          <div className="pl-6 py-1 text-[10px] text-text-secondary">Empty schema</div>
        ) : (
          <>
            {/* Tables Folder */}
            {filteredTables.length > 0 && (
              <ObjectFolder title="Tables" icon={<Table size={12} className="text-blue-400" />} count={filteredTables.length} defaultOpen={true}>
                {filteredTables.map(table => {
                  const tablePinned = isPinned(schemaName, table.name);
                  return (
                    <div key={table.name}
                      onClick={() => handleTableClick(table)}
                      onContextMenu={(e) => handleContextMenu(e, table.name)}
                      className="flex items-center gap-2 pl-9 pr-2 py-1 hover:bg-bg-2 rounded-r-md text-sm text-text-secondary hover:text-text-primary cursor-pointer transition-colors group"
                    >
                      <Table size={13} className="flex-shrink-0 opacity-70" />
                      <span className="truncate flex-1">{table.name}</span>
                      {tablePinned && <Pin size={12} className="flex-shrink-0 text-accent opacity-60" />}
                    </div>
                  )
                })}
              </ObjectFolder>
            )}

            {/* Views Folder */}
            {filteredViews.length > 0 && (
              <ObjectFolder title="Views" icon={<Eye size={12} className="text-purple-400" />} count={filteredViews.length}>
                {filteredViews.map(view => (
                  <div key={view.name}
                    onClick={() => handleObjectClick(view.name, 'view')}
                    className="flex items-center gap-2 pl-9 pr-2 py-1 hover:bg-bg-2 rounded-r-md text-sm text-text-secondary hover:text-text-primary cursor-pointer transition-colors"
                  >
                    <Eye size={13} className="flex-shrink-0 opacity-70" />
                    <span className="truncate">{view.name}</span>
                  </div>
                ))}
              </ObjectFolder>
            )}

            {/* Functions Folder */}
            {filteredFunctions.length > 0 && (
              <ObjectFolder title="Functions" icon={<FileCode size={12} className="text-orange-400" />} count={filteredFunctions.length}>
                {filteredFunctions.map(func => (
                  <div key={func.name}
                    onClick={() => handleObjectClick(func.name, 'function')}
                    className="flex items-center gap-2 pl-9 pr-2 py-1 hover:bg-bg-2 rounded-r-md text-sm text-text-secondary hover:text-text-primary cursor-pointer transition-colors"
                  >
                    <Code size={13} className="flex-shrink-0 opacity-70" />
                    <span className="truncate">{func.name}</span>
                  </div>
                ))}
              </ObjectFolder>
            )}
          </>
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
          onOpenExport={(format) => setDataTools({ mode: 'export', format, schema: schemaName, table: contextMenu.table })}
          onOpenImport={(format) => setDataTools({ mode: 'import', format, schema: schemaName, table: contextMenu.table })}
        />
      )}

      {dataTools && (
        <DataToolsModal
          key={`${connectionId}:${dataTools.schema}.${dataTools.table}:${dataTools.mode}:${dataTools.format}`}
          isOpen onClose={() => setDataTools(null)}
          initialMode={dataTools.mode}
          initialExportFormat={dataTools.mode === 'export' ? dataTools.format : undefined}
          initialImportFormat={dataTools.mode === 'import' ? dataTools.format : undefined}
          connectionId={connectionId} schema={dataTools.schema} table={dataTools.table}
        />
      )}

      <ObjectDefinitionModal
        isOpen={defModal.open}
        onClose={() => setDefModal({ ...defModal, open: false })}
        connectionId={connectionId}
        schema={schemaName}
        objectName={defModal.name}
        type={defModal.type}
      />
    </Collapsible.Root>
  );
}

export default function SchemaTree({ searchTerm, showPinnedOnly }: { searchTerm?: string; showPinnedOnly?: boolean }) {
  const { connectionId } = useParams();
  const { data: schemas = [], isLoading: loading } = useSchemas(connectionId);
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [createDbOpen, setCreateDbOpen] = useState(false);
  const [sqliteToolsOpen, setSqliteToolsOpen] = useState(false);
  const [createSchemaOpen, setCreateSchemaOpen] = useState(false);
  const { connections } = useConnectionStore();
  const connectionType = useMemo(
    () => connections.find((c) => c.id === connectionId)?.type,
    [connections, connectionId],
  );

  if (loading) return <div className="p-4 text-xs text-text-secondary text-center">Loading schemas...</div>;

  const handleOpenCreateDatabase = () => {
    if (!connectionId) return;
    setCreateDbOpen(true);
  };

  const handleCreateSchema = async (name: string) => {
    if (!connectionId) return;
    if (connectionType === 'sqlite') return;

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
          {connectionType !== 'sqlite' ? (
            <>
              <button
                onClick={handleOpenCreateDatabase}
                className="p-1 rounded hover:bg-bg-2 text-text-secondary hover:text-text-primary transition-colors"
                title="Create database"
              >
                <Database size={14} />
              </button>
              <button
                onClick={() => setCreateSchemaOpen(true)}
                className="p-1 rounded hover:bg-bg-2 text-text-secondary hover:text-text-primary transition-colors"
                title="Create schema"
              >
                <Plus size={14} />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={async () => {
                  if (!connectionId) return;
                  try {
                    const selected = await invoke<string | null>('pick_sqlite_db_file');
                    if (!selected) return;
                    const base = selected.split(/[\\/]/).pop() || 'attached';
                    const noExt = base.replace(/\.[^.]+$/, '');
                    const suggested = (noExt || 'attached')
                      .replace(/[^a-zA-Z0-9_]/g, '_')
                      .replace(/^(\d)/, '_$1');
                    const name = (prompt('Attach as schema name:', suggested) || '').trim();
                    if (!name) return;
                    await connectionApi.createSqliteAttachment(connectionId, {
                      name,
                      file_path: selected,
                      read_only: false,
                    });
                    await queryClient.invalidateQueries({ queryKey: ['schemas', connectionId] });
                    await queryClient.invalidateQueries({ queryKey: ['tables', connectionId] });
                    showToast(`Attached '${name}'`, 'success');
                  } catch (err: any) {
                    console.error('Failed to attach database', err);
                    showToast(
                      err?.response?.data?.message || err?.response?.data || 'Failed to attach database',
                      'error',
                    );
                  }
                }}
                className="p-1 rounded hover:bg-bg-2 text-text-secondary hover:text-text-primary transition-colors"
                title="Attach database"
              >
                <Plus size={14} />
              </button>
              {connectionId && (
                <button
                  onClick={() => setSqliteToolsOpen(true)}
                  className="p-1 rounded hover:bg-bg-2 text-text-secondary hover:text-text-primary transition-colors"
                  title="SQLite tools"
                >
                  <Wrench size={14} />
                </button>
              )}
            </>
          )}
        </div>
      </div>
      {schemas.map((schema: any) => {
        const schemaName = typeof schema === 'string' ? schema : schema.name;
        return (
          <SchemaNode
            key={schemaName}
            schemaName={schemaName}
            connectionId={connectionId!}
            searchTerm={searchTerm}
            defaultOpen={schemas.length === 1}
            connectionType={connectionType}
            showPinnedOnly={showPinnedOnly}
          />
        );
      })}

      {createDbOpen && (
        <CreateDatabaseModal
          open={createDbOpen}
          onOpenChange={setCreateDbOpen}
          connectionId={connectionId!}
          onCreated={async () => {
            await queryClient.invalidateQueries({ queryKey: ['databases', connectionId] });
          }}
        />
      )}

      {sqliteToolsOpen && (
        <SqliteToolsModal
          isOpen={sqliteToolsOpen}
          onClose={() => setSqliteToolsOpen(false)}
          connectionId={connectionId!}
        />
      )}

      <CreateSchemaModal
        isOpen={createSchemaOpen}
        onClose={() => setCreateSchemaOpen(false)}
        onSubmit={handleCreateSchema}
      />
    </div>
  );
}
