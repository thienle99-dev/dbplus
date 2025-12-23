import { useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronDown, ChevronRight, Download, FolderPlus, Pencil, Plus, Search, Trash2, Upload, BarChart3 } from 'lucide-react';
import {
  useCreateSavedQueryFolder,
  useDeleteSavedQuery,
  useDeleteSavedQueryFolder,
  useSavedQueries,
  useSavedQueryFolders,
  useUpdateSavedQueryFolder
} from '../hooks/useQuery';
import SaveQueryModal from './SaveQueryModal';
import { SavedQuery } from '../types';
import api from '../services/api';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '../context/ToastContext';
import { useDialog } from '../context/DialogContext';

export default function SavedQueriesList({
  onSelectQuery,
  embedded = false,
  searchTerm = ''
}: {
  onSelectQuery: (sql: string, metadata?: Record<string, any>, name?: string, id?: string) => void;
  embedded?: boolean;
  searchTerm?: string;
}) {
  const { connectionId } = useParams();
  const navigate = useNavigate();
  const [localSearch, setLocalSearch] = useState('');
  const [collapsedFolderIds, setCollapsedFolderIds] = useState<Set<string>>(new Set());
  const [editingQuery, setEditingQuery] = useState<SavedQuery | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const dialog = useDialog();

  // Custom Hooks
  const { data: queries = [], isLoading: loading } = useSavedQueries(connectionId);
  const { data: folders = [] } = useSavedQueryFolders(connectionId);
  const deleteSavedQuery = useDeleteSavedQuery(connectionId);
  const createFolder = useCreateSavedQueryFolder(connectionId);
  const updateFolder = useUpdateSavedQueryFolder(connectionId);
  const deleteFolder = useDeleteSavedQueryFolder(connectionId);

  // Use either global search term (if embedded) or local search
  const activeSearch = embedded ? searchTerm : localSearch;

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const confirmed = await dialog.confirm({
      title: 'Delete Saved Query',
      message: 'Are you sure you want to delete this saved query? This action cannot be undone.',
      confirmLabel: 'Delete',
      variant: 'destructive'
    });

    if (!confirmed) return;

    try {
      await deleteSavedQuery.mutateAsync(id);
    } catch (err: unknown) {
      showToast('Failed to delete query', 'error');
    }
  };

  const folderNameById = useMemo(() => {
    return new Map(folders.map(f => [f.id, f.name]));
  }, [folders]);

  const filteredQueries = useMemo(() => {
    const term = activeSearch.trim().toLowerCase();
    if (!term) return queries;
    return queries.filter(q => {
      const folderName = q.folder_id ? (folderNameById.get(q.folder_id) || '') : '';
      return (
        q.name.toLowerCase().includes(term) ||
        q.description?.toLowerCase().includes(term) ||
        q.sql?.toLowerCase().includes(term) ||
        folderName.toLowerCase().includes(term) ||
        q.tags?.some(tag => tag.toLowerCase().includes(term))
      );
    });
  }, [activeSearch, queries, folderNameById]);

  const grouped = useMemo(() => {
    const unfiled: SavedQuery[] = [];
    const byFolder = new Map<string, SavedQuery[]>();
    for (const q of filteredQueries) {
      if (!q.folder_id) {
        unfiled.push(q);
        continue;
      }
      if (!byFolder.has(q.folder_id)) byFolder.set(q.folder_id, []);
      byFolder.get(q.folder_id)!.push(q);
    }
    const orderedFolders = folders
      .filter(f => byFolder.has(f.id))
      .map(f => ({ id: f.id, name: f.name, queries: byFolder.get(f.id)! }));
    return { unfiled, folders: orderedFolders };
  }, [filteredQueries, folders]);

  const toggleFolder = (folderId: string) => {
    setCollapsedFolderIds(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  };

  const handleCreateFolder = async () => {
    const name = await dialog.prompt({
      title: 'New Folder',
      message: 'Enter a name for the new folder:',
      placeholder: 'My Queries',
      confirmLabel: 'Create'
    });
    
    if (!name?.trim()) return;
    try {
      await createFolder.mutateAsync({ name: name.trim() });
    } catch {
      showToast('Failed to create folder', 'error');
    }
  };

  const handleRenameFolder = async (folderId: string, currentName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const name = await dialog.prompt({
      title: 'Rename Folder',
      message: 'Enter a new name for the folder:',
      initialValue: currentName,
      confirmLabel: 'Rename'
    });
    
    if (!name?.trim() || name.trim() === currentName) return;
    try {
      await updateFolder.mutateAsync({ id: folderId, name: name.trim() });
    } catch {
      showToast('Failed to rename folder', 'error');
    }
  };

  const handleDeleteFolder = async (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const confirmed = await dialog.confirm({
      title: 'Delete Folder',
      message: 'Are you sure you want to delete this folder? Saved queries in it will become unfiled.',
      confirmLabel: 'Delete',
      variant: 'destructive'
    });

    if (!confirmed) return;
    try {
      await deleteFolder.mutateAsync(folderId);
    } catch {
      showToast('Failed to delete folder', 'error');
    }
  };

  const handleExport = () => {
    const payload = {
      version: 1,
      exported_at: new Date().toISOString(),
      folders: folders.map(f => ({ name: f.name })),
      queries: queries.map(q => ({
        name: q.name,
        description: q.description || null,
        sql: q.sql,
        tags: q.tags || [],
        folder: q.folder_id ? (folderNameById.get(q.folder_id) || null) : null,
        metadata: q.metadata || null,
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `saved-queries-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !connectionId) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text) as any;
      const importedFoldersFromList: string[] = Array.isArray(data?.folders)
        ? data.folders.map((f: any) => String(f?.name || '')).filter(Boolean)
        : [];
      const importedQueries: any[] = Array.isArray(data?.queries) ? data.queries : [];
      const importedFoldersFromQueries: string[] = importedQueries
        .map((q: any) => (q?.folder ? String(q.folder) : ''))
        .filter(Boolean);
      const importedFolders = Array.from(new Set([...importedFoldersFromList, ...importedFoldersFromQueries]));

      const folderIdByName = new Map<string, string>();
      for (const f of folders) folderIdByName.set(f.name, f.id);

      for (const folderName of importedFolders) {
        if (folderIdByName.has(folderName)) continue;
        const created = await createFolder.mutateAsync({ name: folderName });
        folderIdByName.set(created.name, created.id);
      }

      for (const q of importedQueries) {
        const name = String(q?.name || '').trim();
        const sql = String(q?.sql || '').trim();
        if (!name || !sql) continue;
        const description = q?.description ? String(q.description) : '';
        const tags = Array.isArray(q?.tags) ? q.tags.map((t: any) => String(t)).filter(Boolean) : [];
        const folderName = q?.folder ? String(q.folder) : '';
        const folder_id = folderName ? (folderIdByName.get(folderName) || null) : null;
        const metadata = q?.metadata ?? null;

        await api.post(`/api/connections/${connectionId}/saved-queries`, {
          name,
          description: description || null,
          sql,
          tags,
          folder_id,
          metadata,
        });
      }

      queryClient.invalidateQueries({ queryKey: ['savedQueryFolders', connectionId] });
      queryClient.invalidateQueries({ queryKey: ['savedQueries', connectionId] });
      showToast('Import completed', 'success');
    } catch (err) {
      console.error(err);
      showToast('Import failed: invalid file', 'error');
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className={`flex flex-col h-full bg-bg-1 ${!embedded ? 'border-r border-border-light w-64' : ''}`}>
      {!embedded ? (
        <div className="p-4 border-b border-border-light">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">Saved Queries</h2>
            <div className="flex items-center gap-1">
              <button
                onClick={handleCreateFolder}
                className="p-1 hover:bg-bg-2 rounded text-text-secondary hover:text-text-primary"
                title="New Folder"
              >
                <FolderPlus size={16} />
              </button>
              <button
                onClick={handleExport}
                className="p-1 hover:bg-bg-2 rounded text-text-secondary hover:text-text-primary"
                title="Export saved queries"
              >
                <Download size={16} />
              </button>
              <button
                onClick={handleImportClick}
                className="p-1 hover:bg-bg-2 rounded text-text-secondary hover:text-text-primary"
                title="Import saved queries"
              >
                <Upload size={16} />
              </button>
              <button
                onClick={() => navigate(`/workspace/${connectionId}/query`)}
                className="p-1 hover:bg-bg-2 rounded text-text-secondary hover:text-text-primary"
                title="New Query"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-2 text-text-secondary" />
            <input
              type="text"
              placeholder="Search queries..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full bg-bg-2 border border-border-light rounded text-text-primary text-sm focus:border-accent outline-none"
            />
          </div>
        </div>
      ) : (
        <div className="px-3 py-2 border-b border-border-light flex items-center justify-between">
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Saved</span>
          <div className="flex items-center gap-1">
            <button
              onClick={handleCreateFolder}
              className="p-1 hover:bg-bg-2 rounded text-text-secondary hover:text-text-primary"
              title="New Folder"
            >
              <FolderPlus size={14} />
            </button>
            <button
              onClick={handleExport}
              className="p-1 hover:bg-bg-2 rounded text-text-secondary hover:text-text-primary"
              title="Export saved queries"
            >
              <Download size={14} />
            </button>
            <button
              onClick={handleImportClick}
              className="p-1 hover:bg-bg-2 rounded text-text-secondary hover:text-text-primary"
              title="Import saved queries"
            >
              <Upload size={14} />
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-text-secondary text-sm">Loading...</div>
        ) : filteredQueries.length === 0 ? (
          <div className="p-4 text-center text-text-secondary text-sm">No saved queries found</div>
        ) : (
          <div className="divide-y divide-border-light">
            {grouped.folders.map(group => {
              const isCollapsed = collapsedFolderIds.has(group.id);
              return (
                <div key={group.id} className="border-b border-border-light">
                  <div
                    className="px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-bg-2 group"
                    onClick={() => toggleFolder(group.id)}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                      <span className="text-xs font-semibold text-text-primary truncate">{group.name}</span>
                      <span className="text-xs text-text-secondary bg-bg-2 px-1.5 py-0.5 rounded">
                        {group.queries.length}
                      </span>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleRenameFolder(group.id, group.name, e)}
                        className="p-1 hover:bg-bg-3 rounded text-text-secondary hover:text-text-primary"
                        title="Rename folder"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={(e) => handleDeleteFolder(group.id, e)}
                        className="p-1 hover:bg-error-50 hover:text-error rounded text-text-secondary"
                        title="Delete folder"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {!isCollapsed && (
                    <div className="divide-y divide-border-light">
                      {group.queries.map(query => (
                        <div
                          key={query.id}
                          className="p-3 hover:bg-bg-2 cursor-pointer group transition-colors"
                          onClick={() => onSelectQuery(query.sql, query.metadata || undefined, query.name, query.id)}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <h3 className="font-medium text-text-primary text-sm truncate pr-2 flex items-center gap-1.5">
                              {query.name}
                              {query.metadata?.chartConfig && (
                                <span title="Includes Chart" className="flex items-center">
                                  <BarChart3 size={12} className="text-accent flex-shrink-0" />
                                </span>
                              )}
                            </h3>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingQuery(query);
                                }}
                                className="p-1 hover:bg-bg-3 rounded text-text-secondary hover:text-text-primary"
                                title="Edit"
                              >
                                <Pencil size={12} />
                              </button>
                              <button
                                onClick={(e) => handleDelete(query.id, e)}
                                className="p-1 hover:bg-error-50 hover:text-error rounded text-text-secondary"
                                title="Delete"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                          {query.description && (
                            <p className="text-xs text-text-secondary line-clamp-2 mb-2">{query.description}</p>
                          )}
                          {query.tags && query.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {query.tags.map(tag => (
                                <span key={tag} className="px-1.5 py-0.5 bg-bg-3 rounded text-xs text-text-secondary">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {grouped.unfiled.length > 0 && (
              <div className="border-b border-border-light">
                <div className="px-3 py-2 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Unfiled ({grouped.unfiled.length})
                </div>
                <div className="divide-y divide-border-light">
                  {grouped.unfiled.map(query => (
                    <div
                      key={query.id}
                      className="p-3 hover:bg-bg-2 cursor-pointer group transition-colors"
                      onClick={() => onSelectQuery(query.sql, query.metadata || undefined, query.name, query.id)}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="font-medium text-text-primary text-sm truncate pr-2 flex items-center gap-1.5">
                          {query.name}
                          {query.metadata?.chartConfig && (
                            <span title="Includes Chart" className="flex items-center">
                              <BarChart3 size={12} className="text-accent flex-shrink-0" />
                            </span>
                          )}
                        </h3>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingQuery(query);
                            }}
                            className="p-1 hover:bg-bg-3 rounded text-text-secondary hover:text-text-primary"
                            title="Edit"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            onClick={(e) => handleDelete(query.id, e)}
                            className="p-1 hover:bg-error/10 hover:text-error rounded text-text-secondary"
                            title="Delete"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                      {query.description && (
                        <p className="text-xs text-text-secondary line-clamp-2 mb-2">{query.description}</p>
                      )}
                      {query.tags && query.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {query.tags.map(tag => (
                            <span key={tag} className="px-1.5 py-0.5 bg-bg-3 rounded text-xs text-text-secondary">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {editingQuery && (
        <SaveQueryModal
          isOpen={true}
          onClose={() => setEditingQuery(null)}
          sql={editingQuery.sql || ''}
          mode="edit"
          initial={{
            id: editingQuery.id,
            name: editingQuery.name,
            description: editingQuery.description,
            tags: editingQuery.tags,
            folder_id: editingQuery.folder_id,
            metadata: editingQuery.metadata,
          }}
          onSaved={async () => {
            setEditingQuery(null);
            if (connectionId) {
              queryClient.invalidateQueries({ queryKey: ['savedQueryFolders', connectionId] });
              queryClient.invalidateQueries({ queryKey: ['savedQueries', connectionId] });
            }
          }}
        />
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={handleImportFile}
      />
    </div>
  );
}
