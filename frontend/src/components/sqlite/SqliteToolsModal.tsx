import { useMemo, useState } from 'react';
import { X, Play, ShieldCheck, Trash2, Activity } from 'lucide-react';
import ReactJson from 'react-json-view';
import api from '../../services/api';
import { extractApiErrorDetails } from '../../utils/apiError';
import { useToast } from '../../context/ToastContext';

interface SqliteToolsModalProps {
  isOpen: boolean;
  onClose: () => void;
  connectionId: string;
}

export default function SqliteToolsModal({ isOpen, onClose, connectionId }: SqliteToolsModalProps) {
  const { showToast } = useToast();
  const [sql, setSql] = useState<string>('PRAGMA journal_mode;');
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const actions = useMemo(
    () => [
      { key: 'integrity', label: 'Integrity Check', icon: ShieldCheck, query: 'PRAGMA integrity_check;' },
      { key: 'vacuum', label: 'VACUUM', icon: Trash2, query: 'VACUUM;' },
      { key: 'analyze', label: 'ANALYZE', icon: Activity, query: 'ANALYZE;' },
      { key: 'optimize', label: 'Optimize', icon: Play, query: 'PRAGMA optimize;' },
    ],
    [],
  );

  if (!isOpen) return null;

  const run = async (query: string) => {
    setIsRunning(true);
    setError(null);
    try {
      const res = await api.post(`/api/connections/${connectionId}/execute`, { query });
      setResult(res.data);
      showToast('SQLite command executed', 'success');
    } catch (err: any) {
      const msg = extractApiErrorDetails(err).message || 'Command failed';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative bg-[#1e1e1e] rounded-xl shadow-2xl w-full max-w-3xl mx-4 border border-white/10">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="text-sm font-medium text-white">SQLite Tools</div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded hover:bg-white/5 text-gray-300 flex items-center justify-center"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            {actions.map((a) => {
              const Icon = a.icon;
              return (
                <button
                  key={a.key}
                  type="button"
                  disabled={isRunning}
                  onClick={() => run(a.query)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-xs bg-[#121212] hover:bg-[#1a1a1a] text-gray-200 rounded border border-[#2a2a2a] disabled:opacity-50"
                  title={a.query}
                >
                  <Icon size={14} />
                  {a.label}
                </button>
              );
            })}
          </div>

          <div className="space-y-2">
            <div className="text-xs text-gray-400">PRAGMA / SQL</div>
            <textarea
              value={sql}
              onChange={(e) => setSql(e.target.value)}
              rows={4}
              spellCheck={false}
              className="w-full px-3 py-2 bg-[#121212] border border-[#2a2a2a] rounded text-gray-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="flex justify-end">
              <button
                type="button"
                disabled={isRunning || !sql.trim()}
                onClick={() => run(sql)}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded disabled:opacity-50"
              >
                <Play size={14} />
                Run
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded text-red-300 text-xs">
              {error}
            </div>
          )}

          {result && (
            <div className="p-3 bg-[#121212] border border-[#2a2a2a] rounded">
              <ReactJson
                src={result}
                name={false}
                collapsed={2}
                enableClipboard={false}
                displayDataTypes={false}
                displayObjectSize={false}
                theme="monokai"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

