import { useState } from 'react';
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

  if (!isOpen) return null;

  // New states for individual tools
  const [isVacuuming, setIsVacuuming] = useState(false);
  const [vacuumMessage, setVacuumMessage] = useState<string | null>(null);
  const [isCheckpointing, setIsCheckpointing] = useState(false);
  const [checkpointMessage, setCheckpointMessage] = useState<string | null>(null);
  const [pragmaCommand, setPragmaCommand] = useState('');
  const [isRunPragma, setIsRunPragma] = useState(false);
  const [pragmaResult, setPragmaResult] = useState<string | null>(null);

  const handleVacuum = async () => {
    setIsVacuuming(true);
    setVacuumMessage(null);
    try {
      await api.post(`/api/connections/${connectionId}/execute`, { query: 'VACUUM;' });
      setVacuumMessage('VACUUM completed successfully.');
      showToast('VACUUM completed', 'success');
    } catch (err: any) {
      const msg = extractApiErrorDetails(err).message || 'VACUUM failed';
      setVacuumMessage(`Error: ${msg}`);
      showToast(msg, 'error');
    } finally {
      setIsVacuuming(false);
    }
  };

  const handleCheckpoint = async () => {
    setIsCheckpointing(true);
    setCheckpointMessage(null);
    try {
      await api.post(`/api/connections/${connectionId}/execute`, { query: 'PRAGMA wal_checkpoint(TRUNCATE);' });
      setCheckpointMessage('WAL Checkpoint completed successfully.');
      showToast('WAL Checkpoint completed', 'success');
    } catch (err: any) {
      const msg = extractApiErrorDetails(err).message || 'WAL Checkpoint failed';
      setCheckpointMessage(`Error: ${msg}`);
      showToast(msg, 'error');
    } finally {
      setIsCheckpointing(false);
    }
  };

  const handlePragmaRun = async () => {
    if (!pragmaCommand.trim()) return;
    setIsRunPragma(true);
    setPragmaResult(null);
    try {
      const query = `PRAGMA ${pragmaCommand.trim()};`;
      const res = await api.post(`/api/connections/${connectionId}/execute`, { query });
      setPragmaResult(JSON.stringify(res.data, null, 2));
      showToast('Pragma command executed', 'success');
    } catch (err: any) {
      const msg = extractApiErrorDetails(err).message || 'Pragma command failed';
      setPragmaResult(`Error: ${msg}`);
      showToast(msg, 'error');
    } finally {
      setIsRunPragma(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative bg-bg-1 rounded-xl shadow-2xl w-full max-w-3xl mx-4 border border-border-default">
        <div className="flex items-center justify-between p-4 border-b border-border-default">
          <h3 className="text-lg font-medium text-text-primary flex items-center gap-2">
            <span className="text-accent">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
            </span>
            SQLite Tools
          </h3>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-text-secondary">Vacuum Database</label>
              <button
                onClick={handleVacuum}
                disabled={isVacuuming || !!vacuumMessage}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-xs bg-bg-2 hover:bg-bg-3 text-text-primary rounded border border-border-default disabled:opacity-50"
              >
                {isVacuuming ? (
                  <>
                    <span className="animate-spin">⟳</span>
                    Running...
                  </>
                ) : vacuumMessage ? (
                  <span>Done</span>
                ) : (
                  <span>Run VACUUM</span>
                )}
              </button>
            </div>
            <p className="text-xs text-text-muted mb-2">
              Rebuilds the database file, repacking it into a minimal amount of disk space.
            </p>
            {vacuumMessage && (
              <div className="text-xs text-success bg-success/10 px-2 py-1 rounded inline-block">
                {vacuumMessage}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-border-default">
             <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-text-secondary">Checkpoint WAL</label>
              <button
                 onClick={handleCheckpoint}
                 disabled={isCheckpointing || !!checkpointMessage}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-xs bg-bg-2 hover:bg-bg-3 text-text-primary rounded border border-border-default disabled:opacity-50"
              >
                {isCheckpointing ? (
                   <>
                    <span className="animate-spin">⟳</span>
                    Running...
                   </>
                ) : checkpointMessage ? (
                   <span>Done</span>
                ) : (
                   <span>Run Checkpoint</span>
                )}
              </button>
             </div>
             <p className="text-xs text-text-muted mb-2">
               Transfers transactions from the write-ahead log to the database file.
             </p>
             {checkpointMessage && (
               <div className="text-xs text-success bg-success/10 px-2 py-1 rounded inline-block">
                 {checkpointMessage}
               </div>
             )}
          </div>
          
           <div className="pt-4 border-t border-border-default">
            <label className="block text-sm font-medium text-text-secondary mb-2">Pragma Command</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={pragmaCommand}
                onChange={(e) => setPragmaCommand(e.target.value)}
                placeholder="e.g. journal_mode"
                className="w-full px-3 py-2 bg-bg-0 border border-border-default rounded text-text-primary text-xs font-mono focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                onKeyDown={(e) => e.key === 'Enter' && handlePragmaRun()}
              />
              <button
                 onClick={handlePragmaRun}
                 disabled={isRunPragma || !pragmaCommand.trim()}
                 className="px-3 py-2 bg-accent text-white text-xs font-medium rounded hover:bg-accent/90 disabled:opacity-50 whitespace-nowrap"
              >
                Run
              </button>
            </div>
             {pragmaResult && (
            <div className="mt-2 text-xs font-mono overflow-x-auto">
             <div className="mb-1 text-text-muted">Result:</div>
            <div className="p-3 bg-bg-0 border border-border-default rounded">
                <pre className="text-text-primary whitespace-pre-wrap">{pragmaResult}</pre>
            </div>
            </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}
