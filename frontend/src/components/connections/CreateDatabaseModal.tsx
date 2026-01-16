import { useMemo, useState } from 'react';
import { connectionApi } from '../../services/connectionApi';
import { CreateDatabaseOptions, CreateDatabaseRequest } from '../../types';
import { useToast } from '../../context/ToastContext';
import { extractApiErrorDetails } from '../../utils/apiError';
import Modal from '../ui/Modal';
import Checkbox from '../ui/Checkbox';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';

interface CreateDatabaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connectionId: string;
  onCreated?: () => void;
}

const ENCODINGS = ['UTF8', 'SQL_ASCII', 'LATIN1', 'WIN1252'] as const;

export default function CreateDatabaseModal({
  open,
  onOpenChange,
  connectionId,
  onCreated,
}: CreateDatabaseModalProps) {
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [name, setName] = useState('');
  const [options, setOptions] = useState<CreateDatabaseOptions>({
    allowConnections: true,
    connectionLimit: -1,
  });

  const canSubmit = useMemo(() => name.trim().length > 0 && !submitting, [name, submitting]);

  const reset = () => {
    setName('');
    setShowAdvanced(false);
    setOptions({ allowConnections: true, connectionLimit: -1 });
  };

  const handleClose = () => {
    onOpenChange(false);
    reset();
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    const request: CreateDatabaseRequest = {
      name: trimmed,
      options: showAdvanced ? options : undefined,
    };

    setSubmitting(true);
    try {
      const result = await connectionApi.createDatabase(connectionId, request);
      showToast(result.message || `Database '${trimmed}' created`, result.success ? 'success' : 'error');
      onCreated?.();
      handleClose();
    } catch (err: any) {
      console.error('Failed to create database', err);
      const { message } = extractApiErrorDetails(err);
      showToast(message || 'Failed to create database', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const footer = (
    <div className="flex items-center justify-end gap-2 pt-2">
      <Button
        variant="secondary"
        onClick={handleClose}
      >
        Cancel
      </Button>
      <Button
        type="submit"
        disabled={!canSubmit}
        isLoading={submitting}
        onClick={() => handleSubmit()}
      >
        Create
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={open}
      onClose={handleClose}
      title="Create Database"
      footer={footer}
      size="md"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 pb-32">
        <Input
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="my_new_db"
          required
          fullWidth
        />

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAdvanced((v) => !v)}
          className="self-start text-xs h-6"
        >
          {showAdvanced ? 'Hide advanced options' : 'Show advanced options'}
        </Button>

        {showAdvanced && (
          <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
            <Input
              label="Owner"
              value={options.owner || ''}
              onChange={(e) => setOptions((o) => ({ ...o, owner: e.target.value }))}
              placeholder="postgres"
              fullWidth
            />

            <Input
              label="Template"
              value={options.template || ''}
              onChange={(e) => setOptions((o) => ({ ...o, template: e.target.value }))}
              placeholder="template0"
              fullWidth
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-secondary ml-1">Encoding</label>
              <Select
                value={options.encoding || ''}
                onChange={(value) => setOptions((o) => ({ ...o, encoding: value || undefined }))}
                options={[
                  { value: '', label: 'Default' },
                  ...ENCODINGS.map(enc => ({ value: enc, label: enc }))
                ]}
              />
            </div>

            <Input
              label="Tablespace"
              value={options.tablespace || ''}
              onChange={(e) => setOptions((o) => ({ ...o, tablespace: e.target.value }))}
              placeholder="pg_default"
              fullWidth
            />

            <Input
              label="LC_COLLATE"
              value={options.lcCollate || ''}
              onChange={(e) => setOptions((o) => ({ ...o, lcCollate: e.target.value }))}
              placeholder="en_US.UTF-8"
              fullWidth
            />

            <Input
              label="LC_CTYPE"
              value={options.lcCtype || ''}
              onChange={(e) => setOptions((o) => ({ ...o, lcCtype: e.target.value }))}
              placeholder="en_US.UTF-8"
              fullWidth
            />

            <div className="col-span-2 grid grid-cols-2 gap-4">
              <Input
                label="Connection limit"
                type="number"
                value={options.connectionLimit ?? -1}
                onChange={(e) => setOptions((o) => ({ ...o, connectionLimit: Number(e.target.value) }))}
                helperText="Use -1 for no limit"
                fullWidth
              />

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-text-secondary ml-1">Flags</label>
                <div className="flex flex-col gap-2 mt-1">
                  <Checkbox
                    checked={options.allowConnections ?? true}
                    onChange={(checked) => setOptions((o) => ({ ...o, allowConnections: checked }))}
                    label="Allow connections"
                  />
                  <Checkbox
                    checked={options.isTemplate ?? false}
                    onChange={(checked) => setOptions((o) => ({ ...o, isTemplate: checked }))}
                    label="Is template"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
}
