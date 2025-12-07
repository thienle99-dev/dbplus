import { useState } from 'react';
import { X } from 'lucide-react';
import api from '../services/api';
import { useParams } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { SaveQueryModalProps } from '../types';

export default function SaveQueryModal({ isOpen, onClose, sql, onSave }: SaveQueryModalProps) {
  const { connectionId } = useParams();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post(`/api/connections/${connectionId}/saved-queries`, {
        name,
        description,
        sql,
        tags: []
      });
      showToast('Query saved successfully', 'success');
      onSave(name, description);
      onClose();
    } catch (err: unknown) {
      showToast('Failed to save query', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-bg-1 rounded-lg shadow-xl w-96 border border-border">
        <div className="flex justify-between items-center p-4 border-b border-border">
          <h3 className="font-semibold text-text-primary">Save Query</h3>
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
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
