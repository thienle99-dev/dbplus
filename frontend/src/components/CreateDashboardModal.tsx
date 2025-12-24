import { useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { CreateDashboardModalProps } from '../types';
import Modal from './ui/Modal';
import Input from './ui/Input';
import Button from './ui/Button';

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

  const footer = (
    <div className="flex justify-end gap-2">
      <Button
        variant="secondary"
        onClick={onClose}
      >
        Cancel
      </Button>
      <Button
        variant="primary"
        onClick={() => handleSubmit({ preventDefault: () => { } } as any)}
        disabled={loading || !name.trim()}
        isLoading={loading}
      >
        Create Dashboard
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Dashboard"
      size="md"
      footer={footer}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded text-sm">
            {error}
          </div>
        )}

        <div>
          <Input
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Sales Overview"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Description (Optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-text-primary focus:border-accent outline-none h-24 resize-none shadow-inner"
            placeholder="Describe this dashboard..."
          />
        </div>
      </form>
    </Modal>
  );
}
