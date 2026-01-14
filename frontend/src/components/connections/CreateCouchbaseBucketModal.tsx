import { useState } from 'react';
import { Database } from 'lucide-react';
import { connectionApi } from '../../services/connectionApi';
import { useToast } from '../../context/ToastContext';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Modal from '../ui/Modal';

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
      const result = await connectionApi.createDatabase(connectionId, {
        name,
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

  const footer = (
    <div className="flex items-center justify-end gap-2">
      <Button variant="secondary" onClick={handleClose}>
        Cancel
      </Button>
      <Button variant="primary" onClick={handleSubmit} disabled={!canSubmit} isLoading={submitting}>
        Create Bucket
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={open}
      onClose={handleClose}
      title={
        <div className="flex items-center gap-2">
          <Database size={20} className="text-accent" />
          <span>Create Couchbase Bucket</span>
        </div>
      }
      size="md"
      footer={footer}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-2 pb-32">
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
          helperText="Minimum 100MB required per bucket."
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-secondary">Bucket Type</label>
          <Select
            value={bucketType}
            onChange={(value) => setBucketType(value as any)}
            options={BUCKET_TYPE_OPTIONS}
          />
        </div>
      </form>
    </Modal>
  );
}
