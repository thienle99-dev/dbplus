import { useMemo } from 'react';
import { Layers, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PartitionInfo } from '../../types';

interface PartitionsSectionProps {
  connectionId: string | undefined;
  info: PartitionInfo | null;
  loading?: boolean;
  error?: string | null;
}

function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined) return 'N/A';
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

export default function PartitionsSection({ connectionId, info, loading, error }: PartitionsSectionProps) {
  const navigate = useNavigate();

  const rows = useMemo(() => {
    const parts = info?.partitions ?? [];
    return [...parts].sort((a, b) => `${a.schema}.${a.name}`.localeCompare(`${b.schema}.${b.name}`));
  }, [info]);

  if (error) {
    return (
      <div className="text-xs text-error bg-bg-0 border border-border rounded p-3">
        {error}
      </div>
    );
  }

  if (!info) {
    return (
      <div className="text-xs text-text-secondary bg-bg-0 border border-border rounded p-3">
        {loading ? 'Loading…' : 'Partitions info not available.'}
      </div>
    );
  }

  if (!info.is_partitioned) {
    return (
      <div className="text-xs text-text-secondary bg-bg-0 border border-border rounded p-3">
        This table is not partitioned.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Layers size={14} className="text-text-secondary" />
          <div className="text-xs text-text-secondary">
            <div>
              Strategy: <span className="font-mono text-text-primary">{info.strategy || '—'}</span>
            </div>
            <div className="mt-1">
              Key: <span className="font-mono text-text-primary">{info.key || '—'}</span>
            </div>
          </div>
        </div>
        <div className="text-xs text-text-secondary">
          Partitions: <span className="font-mono text-text-primary">{rows.length}</span>
        </div>
      </div>

      <div className="overflow-auto border border-border rounded bg-bg-0">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-bg-1 border-b border-border">
            <tr>
              <th className="px-3 py-2 text-text-secondary font-semibold">Partition</th>
              <th className="px-3 py-2 text-text-secondary font-semibold">Bound</th>
              <th className="px-3 py-2 text-text-secondary font-semibold">Total</th>
              <th className="px-3 py-2 text-text-secondary font-semibold">Table</th>
              <th className="px-3 py-2 text-text-secondary font-semibold">Index</th>
              <th className="px-3 py-2 text-text-secondary font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={`${p.schema}.${p.name}`} className="border-t border-border">
                <td className="px-3 py-2 font-mono text-text-primary">{p.schema}.{p.name}</td>
                <td className="px-3 py-2 text-text-secondary font-mono whitespace-pre-wrap break-words">
                  {p.bound || '—'}
                </td>
                <td className="px-3 py-2 text-text-secondary font-mono">{formatBytes(p.total_size)}</td>
                <td className="px-3 py-2 text-text-secondary font-mono">{formatBytes(p.table_size)}</td>
                <td className="px-3 py-2 text-text-secondary font-mono">{formatBytes(p.index_size)}</td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    disabled={!connectionId}
                    onClick={() => {
                      if (!connectionId) return;
                      navigate(`/workspace/${connectionId}/tables/${encodeURIComponent(p.schema)}/${encodeURIComponent(p.name)}`);
                    }}
                    className="inline-flex items-center gap-1 px-2 py-1 text-[10px] md:text-xs bg-bg-2 hover:bg-bg-3 text-text-secondary hover:text-text-primary rounded border border-border disabled:opacity-50"
                    title="Open partition"
                  >
                    <ExternalLink size={14} />
                    Open
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr className="border-t border-border">
                <td className="px-3 py-3 text-text-secondary" colSpan={6}>
                  No partitions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

