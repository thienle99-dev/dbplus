import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { connectionApi } from '../../services/connectionApi';
import { CreateDatabaseOptions, CreateDatabaseRequest } from '../../types';
import { useToast } from '../../context/ToastContext';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      showToast(err?.response?.data?.message || err?.response?.data || 'Failed to create database', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm data-[state=open]:animate-overlayShow" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-[101] max-h-[85vh] w-[90vw] max-w-[560px] translate-x-[-50%] translate-y-[-50%] rounded-[10px] bg-bg-1 p-5 shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] focus:outline-none data-[state=open]:animate-contentShow border border-border">
          <div className="flex justify-between items-center mb-4">
            <Dialog.Title className="text-lg font-semibold text-text-primary">
              Create Database
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="text-text-secondary hover:text-text-primary" aria-label="Close" onClick={handleClose}>
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-text-secondary">Name</label>
              <input
                className="bg-bg-0 border border-border rounded px-3 py-2 text-text-primary focus:border-accent focus:outline-none"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                placeholder="my_new_db"
                required
              />
            </div>

            <button
              type="button"
              className="text-xs text-text-secondary hover:text-text-primary self-start"
              onClick={() => setShowAdvanced((v) => !v)}
            >
              {showAdvanced ? 'Hide advanced options' : 'Show advanced options'}
            </button>

            {showAdvanced && (
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-text-secondary">Owner</label>
                  <input
                    className="bg-bg-0 border border-border rounded px-3 py-2 text-text-primary focus:border-accent focus:outline-none"
                    value={options.owner || ''}
                    onChange={(e) => setOptions((o) => ({ ...o, owner: e.target.value }))}
                    placeholder="postgres"
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium text-text-secondary">Template</label>
                  <input
                    className="bg-bg-0 border border-border rounded px-3 py-2 text-text-primary focus:border-accent focus:outline-none"
                    value={options.template || ''}
                    onChange={(e) => setOptions((o) => ({ ...o, template: e.target.value }))}
                    placeholder="template0"
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium text-text-secondary">Encoding</label>
                  <select
                    className="bg-bg-0 border border-border rounded px-3 py-2 text-text-primary focus:border-accent focus:outline-none"
                    value={options.encoding || ''}
                    onChange={(e) => setOptions((o) => ({ ...o, encoding: e.target.value || undefined }))}
                  >
                    <option value="">Default</option>
                    {ENCODINGS.map((enc) => (
                      <option key={enc} value={enc}>{enc}</option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium text-text-secondary">Tablespace</label>
                  <input
                    className="bg-bg-0 border border-border rounded px-3 py-2 text-text-primary focus:border-accent focus:outline-none"
                    value={options.tablespace || ''}
                    onChange={(e) => setOptions((o) => ({ ...o, tablespace: e.target.value }))}
                    placeholder="pg_default"
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium text-text-secondary">LC_COLLATE</label>
                  <input
                    className="bg-bg-0 border border-border rounded px-3 py-2 text-text-primary focus:border-accent focus:outline-none"
                    value={options.lcCollate || ''}
                    onChange={(e) => setOptions((o) => ({ ...o, lcCollate: e.target.value }))}
                    placeholder="en_US.UTF-8"
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium text-text-secondary">LC_CTYPE</label>
                  <input
                    className="bg-bg-0 border border-border rounded px-3 py-2 text-text-primary focus:border-accent focus:outline-none"
                    value={options.lcCtype || ''}
                    onChange={(e) => setOptions((o) => ({ ...o, lcCtype: e.target.value }))}
                    placeholder="en_US.UTF-8"
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium text-text-secondary">Connection limit</label>
                  <input
                    type="number"
                    className="bg-bg-0 border border-border rounded px-3 py-2 text-text-primary focus:border-accent focus:outline-none"
                    value={options.connectionLimit ?? -1}
                    onChange={(e) => setOptions((o) => ({ ...o, connectionLimit: Number(e.target.value) }))}
                  />
                  <div className="text-[11px] text-text-secondary">Use -1 for no limit</div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-text-secondary">Flags</label>
                  <label className="flex items-center gap-2 text-sm text-text-primary">
                    <input
                      type="checkbox"
                      checked={options.allowConnections ?? true}
                      onChange={(e) => setOptions((o) => ({ ...o, allowConnections: e.target.checked }))}
                    />
                    Allow connections
                  </label>
                  <label className="flex items-center gap-2 text-sm text-text-primary">
                    <input
                      type="checkbox"
                      checked={options.isTemplate ?? false}
                      onChange={(e) => setOptions((o) => ({ ...o, isTemplate: e.target.checked }))}
                    />
                    Is template
                  </label>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                className="h-9 px-4 bg-bg-2 border border-border text-text-secondary rounded text-sm hover:bg-bg-3 transition-colors"
                onClick={handleClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                className="h-9 px-4 bg-accent text-white rounded text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {submitting ? 'Creating…' : 'Create'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
