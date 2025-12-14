import { useMemo, useState } from 'react';
import { Eye, Zap, Copy } from 'lucide-react';
import { TriggerInfo } from '../../types';
import Modal from '../ui/Modal';
import { useToast } from '../../context/ToastContext';

interface TriggersSectionProps {
  triggers: TriggerInfo[];
  loading?: boolean;
}

function statusBadge(enabled: string) {
  const v = enabled.toLowerCase();
  if (v === 'enabled' || v === 'always') return 'bg-green-500/15 text-green-400 border-green-500/30';
  if (v === 'disabled') return 'bg-red-500/15 text-red-400 border-red-500/30';
  if (v === 'replica') return 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30';
  return 'bg-bg-2 text-text-secondary border-border';
}

export default function TriggersSection({ triggers, loading }: TriggersSectionProps) {
  const [selected, setSelected] = useState<TriggerInfo | null>(null);
  const { showToast } = useToast();

  const sorted = useMemo(() => [...triggers].sort((a, b) => a.name.localeCompare(b.name)), [triggers]);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Zap size={12} className="md:w-3.5 md:h-3.5 text-text-secondary" />
          <h4 className="text-[10px] md:text-xs font-medium text-text-secondary uppercase">
            Triggers {sorted.length ? `(${sorted.length})` : ''}
          </h4>
        </div>
        {loading && <div className="text-[10px] text-text-secondary">Loading…</div>}
      </div>

      {sorted.length === 0 ? (
        <div className="text-xs text-text-secondary bg-bg-0 border border-border rounded p-3">
          No triggers found for this table.
        </div>
      ) : (
        <div className="grid gap-2">
          {sorted.map((t) => (
            <div key={t.name} className="p-3 rounded border border-border bg-bg-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="text-sm font-medium text-text-primary truncate">{t.name}</div>
                    <span className={`text-[10px] px-2 py-0.5 rounded border ${statusBadge(t.enabled)}`}>
                      {t.enabled}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded border border-border bg-bg-2 text-text-secondary">
                      {t.timing}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded border border-border bg-bg-2 text-text-secondary">
                      {t.level}
                    </span>
                    {t.events?.length > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded border border-border bg-bg-2 text-text-secondary">
                        {t.events.join(', ')}
                      </span>
                    )}
                  </div>

                  {(t.function_name || t.function_schema) && (
                    <div className="mt-1 text-xs text-text-secondary font-mono truncate">
                      {t.function_schema ? `${t.function_schema}.` : ''}
                      {t.function_name || ''}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setSelected(t)}
                  className="flex items-center gap-1 px-2 py-1 text-[10px] md:text-xs bg-bg-2 hover:bg-bg-3 text-text-secondary hover:text-text-primary rounded transition-colors border border-border"
                  title="View definition"
                >
                  <Eye size={12} />
                  View
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `Trigger: ${selected.name}` : 'Trigger'}
        size="xl"
      >
        {selected && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs text-text-secondary">
                <span className="font-semibold">{selected.timing}</span>
                {selected.events?.length ? ` • ${selected.events.join(', ')}` : ''}
                {selected.function_name ? ` • function: ${selected.function_schema ? `${selected.function_schema}.` : ''}${selected.function_name}` : ''}
              </div>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(selected.definition || '');
                  showToast('Trigger definition copied', 'success');
                }}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-bg-2 hover:bg-bg-3 text-text-secondary hover:text-text-primary rounded border border-border"
                title="Copy definition"
              >
                <Copy size={14} />
                Copy
              </button>
            </div>

            <pre className="whitespace-pre-wrap break-words text-xs font-mono bg-bg-0 border border-border rounded p-3 text-text-primary max-h-[55vh] overflow-auto">
              {selected.definition || ''}
            </pre>
          </div>
        )}
      </Modal>
    </div>
  );
}

