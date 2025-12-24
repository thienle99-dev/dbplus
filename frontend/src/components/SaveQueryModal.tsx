import { useEffect, useMemo, useState } from 'react';
import { FolderPlus } from 'lucide-react';
import api from '../services/api';
import { useParams } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { useDialog } from '../context/DialogContext';
import { SaveQueryModalProps } from '../types';
import { useCreateSavedQueryFolder, useSavedQueryFolders } from '../hooks/useQuery';
import Modal from './ui/Modal';
import Input from './ui/Input';
import Button from './ui/Button';

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
  const dialog = useDialog();

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

  const handleCreateFolder = async () => {
    const folderName = await dialog.prompt({
      title: 'New Folder',
      message: 'Enter a name for the new folder:',
      placeholder: 'My Queries',
      confirmLabel: 'Create'
    });

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

  const footer = (
    <div className="flex w-full justify-end gap-2">
      <Button variant="secondary" onClick={onClose}>
        Cancel
      </Button>
      <Button
        variant="primary"
        onClick={() => handleSave({ preventDefault: () => { } } as any)}
        disabled={loading}
      >
        {loading ? (mode === 'edit' ? 'Updating...' : 'Saving...') : (mode === 'edit' ? 'Update' : 'Save')}
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'edit' ? 'Edit Saved Query' : 'Save Query'}
      size="md"
      footer={footer}
    >
      <form onSubmit={handleSave} className="flex flex-col gap-4">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Name</label>
          <Input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Query"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-xl bg-black/20 border border-white/10 px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent h-20 resize-none transition-all shadow-inner"
            placeholder="What does this query do?"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-medium text-text-secondary">Folder</label>
            <button
              type="button"
              onClick={handleCreateFolder}
              className="flex items-center gap-1 text-xs text-accent hover:text-accent/90 transition-colors"
              title="Create folder"
            >
              <FolderPlus size={14} />
              New
            </button>
          </div>
          <select
            value={folderId}
            onChange={(e) => setFolderId(e.target.value)}
            className="w-full rounded-xl bg-black/20 border border-white/10 px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all appearance-none"
          >
            <option value="" className="bg-bg-1 text-text-primary">No folder</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id} className="bg-bg-1 text-text-primary">
                {f.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Tags</label>
          <Input
            type="text"
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
            placeholder="e.g. reporting, weekly, revenue"
          />
        </div>
      </form>
    </Modal>
  );
}
