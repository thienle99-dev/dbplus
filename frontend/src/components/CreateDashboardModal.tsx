import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { X } from 'lucide-react';
import api from '../services/api';

interface CreateDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateDashboardModal({ isOpen, onClose, onSuccess }: CreateDashboardModalProps) {
  const { connectionId } = useParams();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);

    try {
      await api.post(`/api/connections/${connectionId}/dashboards`, {
        name,
        description: description || null,
      });
      onSuccess();
      onClose();
      setName('');
      setDescription('');
    } catch (err: unknown) {
      console.error(err);
      setError('Failed to create dashboard');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-bg-1 rounded-lg shadow-xl w-[500px] border border-border">
        <div className="flex justify-between items-center p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-text-primary">Create Dashboard</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded text-sm">
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-bg-2 border border-border rounded px-3 py-2 text-text-primary focus:border-accent outline-none"
              placeholder="e.g. Sales Overview"
              autoFocus
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-bg-2 border border-border rounded px-3 py-2 text-text-primary focus:border-accent outline-none h-24 resize-none"
              placeholder="Describe this dashboard..."
            />
          </div>
          
          <div className="flex justify-end gap-2 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-bg-2 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="px-4 py-2 text-sm font-medium bg-accent hover:bg-blue-600 text-white rounded disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Dashboard'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
