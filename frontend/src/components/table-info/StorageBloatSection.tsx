import { useMemo, useState } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';
import api from '../../services/api';
import { StorageBloatInfo } from '../../types';
import { extractApiErrorDetails } from '../../utils/apiError';
import { useToast } from '../../context/ToastContext';

interface StorageBloatSectionProps {
  connectionId: string | undefined;
  schema: string;
  table: string;
  info: StorageBloatInfo | null;
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
}

function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined) return 'N/A';
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return 'N/A';
  return num.toLocaleString();
}

function formatPct(num: number | null | undefined): string {
  if (num === null || num === undefined) return 'N/A';
  return `${num.toFixed(2)}%`;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return 'N/A';
  try {
    return new Date(dateStr).toLocaleString();
  } catch {
    return String(dateStr);
  }
}

function quoteIdent(s: string) {
  return `"${s.replace(/"/g, '""')}"`;
}

export default function StorageBloatSection({
  connectionId,
  schema,
  table,
  info,
  loading,
  error,
  onRefresh,
}: StorageBloatSectionProps) {
  const { showToast } = useToast();
  const [running, setRunning] = useState<'vacuum' | 'analyze' | null>(null);

  const deadPct = info?.dead_tuple_pct ?? null;
  const warning = useMemo(() => {
    if (deadPct === null || deadPct === undefined) return false;
    return deadPct >= 20;
  }, [deadPct]);

  const runAnalyze = async () => {
    if (!connectionId) return;
    setRunning('analyze');
    try {
      const sql =
        schema === 'main'
          ? `ANALYZE ${quoteIdent(table)};`
          : `ANALYZE ${quoteIdent(schema)}.${quoteIdent(table)};`;
      await api.post(`/api/connections/${connectionId}/execute`, { query: sql });
      showToast('ANALYZE completed', 'success');
      onRefresh?.();
    } catch (err: any) {
      showToast(extractApiErrorDetails(err).message || 'ANALYZE failed', 'error');
    } finally {
      setRunning(null);
    }
  };

  const runVacuum = async () => {
    if (!connectionId) return;
    setRunning('vacuum');
    try {
      const sql =
        schema === 'main'
          ? `VACUUM (ANALYZE, VERBOSE) ${quoteIdent(table)};`
          : `VACUUM (ANALYZE, VERBOSE) ${quoteIdent(schema)}.${quoteIdent(table)};`;
      await api.post(`/api/connections/${connectionId}/execute`, { query: sql });
      showToast('VACUUM completed', 'success');
      onRefresh?.();
    } catch (err: any) {
      showToast(extractApiErrorDetails(err).message || 'VACUUM failed', 'error');
    } finally {
      setRunning(null);
    }
  };

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
        {loading ? 'Loading…' : 'Storage/bloat info not available for this database.'}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          {warning && <AlertTriangle size={14} className="text-yellow-400" />}
          <span>
            Dead tuples ratio: <span className="font-mono text-text-primary">{formatPct(info.dead_tuple_pct)}</span>
          </span>
          <span className="text-text-secondary">•</span>
          <span>
            dead/live: <span className="font-mono text-text-primary">{formatNumber(info.dead_tuples)}/{formatNumber(info.live_tuples)}</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            disabled={!onRefresh || !!loading || running !== null}
            className="p-1.5 text-text-secondary hover:text-text-primary rounded hover:bg-bg-2 border border-border disabled:opacity-50"
            title="Refresh"
            aria-label="Refresh"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            type="button"
            onClick={runAnalyze}
            disabled={!connectionId || running !== null}
            className="px-2 py-1 text-xs bg-bg-2 hover:bg-bg-3 text-text-secondary hover:text-text-primary rounded border border-border disabled:opacity-50"
            title="Run ANALYZE"
          >
            ANALYZE
          </button>
          <button
            type="button"
            onClick={runVacuum}
            disabled={!connectionId || running !== null}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded border border-red-500/30 disabled:opacity-50"
            title="Run VACUUM (ANALYZE)"
          >
            <Trash2 size={14} />
            VACUUM
          </button>
        </div>
      </div>

      {warning && (
        <div className="text-xs text-yellow-300 bg-yellow-500/10 border border-yellow-500/30 rounded p-3">
          High dead tuple ratio detected. Consider running VACUUM (ANALYZE) during maintenance window.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        <div className="bg-bg-0 border border-border rounded p-3">
          <div className="text-[10px] text-text-secondary uppercase font-medium">Table size</div>
          <div className="text-sm font-semibold text-text-primary font-mono">{formatBytes(info.table_size)}</div>
        </div>
        <div className="bg-bg-0 border border-border rounded p-3">
          <div className="text-[10px] text-text-secondary uppercase font-medium">Index size</div>
          <div className="text-sm font-semibold text-text-primary font-mono">{formatBytes(info.index_size)}</div>
        </div>
        <div className="bg-bg-0 border border-border rounded p-3">
          <div className="text-[10px] text-text-secondary uppercase font-medium">Total size</div>
          <div className="text-sm font-semibold text-text-primary font-mono">{formatBytes(info.total_size)}</div>
        </div>

        <div className="bg-bg-0 border border-border rounded p-3">
          <div className="text-[10px] text-text-secondary uppercase font-medium">Last vacuum</div>
          <div className="text-xs font-mono text-text-primary">{formatDate(info.last_vacuum)}</div>
        </div>
        <div className="bg-bg-0 border border-border rounded p-3">
          <div className="text-[10px] text-text-secondary uppercase font-medium">Last autovacuum</div>
          <div className="text-xs font-mono text-text-primary">{formatDate(info.last_autovacuum)}</div>
        </div>
        <div className="bg-bg-0 border border-border rounded p-3">
          <div className="text-[10px] text-text-secondary uppercase font-medium">Last analyze</div>
          <div className="text-xs font-mono text-text-primary">{formatDate(info.last_analyze)}</div>
        </div>
      </div>
    </div>
  );
}

