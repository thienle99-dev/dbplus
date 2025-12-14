import { useEffect, useMemo, useState } from 'react';
import { FolderPlus, X } from 'lucide-react';
import api from '../services/api';
import { useParams } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { SaveQueryModalProps } from '../types';
import { useCreateSavedQueryFolder, useSavedQueryFolders } from '../hooks/useQuery';

export default function SaveQueryModal({ isOpen, onClose, sql, initial, mode = 'create', onSaved }: SaveQueryModalProps) {
  const { connectionId } = useParams();
  const [name, setName] = useState(initial?.name || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [tagsText, setTagsText] = useState((initial?.tags || []).join(', '));
  const [folderId, setFolderId] = useState<string>(initial?.folder_id || '');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const { data: folders = [] } = useSavedQueryFolders(connectionId);
  const createFolder = useCreateSavedQueryFolder(connectionId);

  const tags = useMemo(() => {
    const raw = tagsText
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);
    return Array.from(new Set(raw));
  }, [tagsText]);

  useEffect(() => {
    if (!isOpen) return;
    setName(initial?.name || '');
    setDescription(initial?.description || '');
    setTagsText((initial?.tags || []).join(', '));
    setFolderId(initial?.folder_id || '');
  }, [isOpen, initial?.name, initial?.description, initial?.folder_id, (initial?.tags || []).join(',')]);

  if (!isOpen) return null;

  const handleCreateFolder = async () => {
    const folderName = prompt('Folder name');
    if (!folderName?.trim()) return;
    try {
      const created = await createFolder.mutateAsync({ name: folderName.trim() });
      setFolderId(created.id);
    } catch {
      showToast('Failed to create folder', 'error');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!connectionId) throw new Error('Missing connection id');

      if (mode === 'edit' && initial?.id) {
        const { data } = await api.put(`/api/connections/${connectionId}/saved-queries/${initial.id}`, {
          name,
          description,
          sql,
          tags,
          folder_id: folderId || null,
          metadata: initial.metadata ?? null,
        });
        showToast('Query updated successfully', 'success');
        onSaved({ id: data.id, name: data.name });
      } else {
        const { data } = await api.post(`/api/connections/${connectionId}/saved-queries`, {
          name,
          description,
          sql,
          tags,
          folder_id: folderId || null,
          metadata: initial?.metadata ?? null,
        });
        showToast('Query saved successfully', 'success');
        onSaved({ id: data.id, name: data.name });
      }

      onClose();
    } catch (err: unknown) {
      showToast(mode === 'edit' ? 'Failed to update query' : 'Failed to save query', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-bg-1 rounded-lg shadow-xl w-96 border border-border">
        <div className="flex justify-between items-center p-4 border-b border-border">
          <h3 className="font-semibold text-text-primary">{mode === 'edit' ? 'Edit Saved Query' : 'Save Query'}</h3>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSave} className="p-4 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-bg-2 border border-border rounded px-3 py-2 text-sm text-text-primary focus:border-accent outline-none"
              placeholder="My Query"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-bg-2 border border-border rounded px-3 py-2 text-sm text-text-primary focus:border-accent outline-none h-20 resize-none"
              placeholder="What does this query do?"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-text-secondary">Folder</label>
              <button
                type="button"
                onClick={handleCreateFolder}
                className="flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary"
                title="Create folder"
              >
                <FolderPlus size={14} />
                New
              </button>
            </div>
            <select
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
              className="w-full bg-bg-2 border border-border rounded px-3 py-2 text-sm text-text-primary focus:border-accent outline-none"
            >
              <option value="">No folder</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Tags</label>
            <input
              type="text"
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              className="w-full bg-bg-2 border border-border rounded px-3 py-2 text-sm text-text-primary focus:border-accent outline-none"
              placeholder="e.g. reporting, weekly, revenue"
            />
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-2 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? (mode === 'edit' ? 'Updating...' : 'Saving...') : (mode === 'edit' ? 'Update' : 'Save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
