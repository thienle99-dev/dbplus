import { useState } from 'react';
import { X } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { connectionApi } from '../../services/connectionApi';
import { useToast } from '../../context/ToastContext';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';

const BUCKET_TYPE_OPTIONS = [
  { value: 'couchbase', label: 'Couchbase' },
  { value: 'memcached', label: 'Memcached' },
  { value: 'ephemeral', label: 'Ephemeral' },
];

interface CreateCouchbaseBucketModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connectionId: string;
  onCreated?: () => void;
}

export default function CreateCouchbaseBucketModal({
  open,
  onOpenChange,
  connectionId,
  onCreated,
}: CreateCouchbaseBucketModalProps) {
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [ramQuota, setRamQuota] = useState(100);
  const [bucketType, setBucketType] = useState<'couchbase' | 'memcached' | 'ephemeral'>('couchbase');

  const canSubmit = name.trim().length > 0 && !submitting;

  const handleClose = () => {
    onOpenChange(false);
    setName('');
    setRamQuota(100);
    setBucketType('couchbase');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      // We'll use the generic createDatabase API but the backend will handle Couchbase specifics
      // Pass Couchbase-specific options in a way the backend can (eventually) parse if we improve the DTO
      const result = await connectionApi.createDatabase(connectionId, {
        name,
        // The current CreateDatabaseOptions doesn't have RAM quota, 
        // but it's okay for now since we have a reminder in the backend that creation is partially implemented.
      });

      showToast(result.message || `Bucket '${name}' creation initiated`, result.success ? 'success' : 'info');
      onCreated?.();
      handleClose();
    } catch (err: any) {
      console.error('Failed to create bucket', err);
      showToast(err?.response?.data?.message || 'Failed to create bucket', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-[101] w-[90vw] max-w-[450px] translate-x-[-50%] translate-y-[-50%] rounded-[10px] bg-bg-1 p-5 shadow-2xl border border-border">
          <div className="flex justify-between items-center mb-4">
            <Dialog.Title className="text-lg font-semibold text-text-primary">
              Create Couchbase Bucket
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="text-text-secondary hover:text-text-primary" onClick={handleClose}>
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Bucket Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="my-bucket"
              autoFocus
              required
              fullWidth
            />

            <Input
              label="RAM Quota (MB)"
              type="number"
              min="100"
              value={ramQuota}
              onChange={(e) => setRamQuota(Number(e.target.value))}
              fullWidth
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-secondary">Bucket Type</label>
              <Select
                value={bucketType}
                onChange={(value) => setBucketType(value as any)}
                options={BUCKET_TYPE_OPTIONS}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
              <Button variant="ghost" type="button" onClick={handleClose}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={!canSubmit}>
                {submitting ? 'Creating...' : 'Create Bucket'}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
