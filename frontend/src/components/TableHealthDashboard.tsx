
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  Database,
  HardDrive,
  RefreshCw,
  ShieldAlert,
  Trash2,
  Wind
} from 'lucide-react';
import { connectionApi } from '../services/connectionApi';
import Tabs from './ui/Tabs';
import { formatBytes } from '../utils/format';

interface TableHealthDashboardProps {
  connectionId: string;
  schema: string;
  table: string;
}

const TableHealthDashboard: React.FC<TableHealthDashboardProps> = ({ connectionId, schema, table }) => {
  const [activeTab, setActiveTab] = useState<'storage' | 'integrity'>('storage');

  // Fetch Storage Info
  const { data: storageInfo, isLoading: loadingStorage, refetch: refetchStorage } = useQuery({
    queryKey: ['storageInfo', connectionId, schema, table],
    queryFn: () => connectionApi.getStorageBloatInfo(connectionId, schema, table),
  });

  // Fetch Orphans (Manual trigger usually better, but we can auto-fetch for now or use enabled: false)
  const { data: orphans, isLoading: loadingOrphans, refetch: scanOrphans, isFetched: orphansFetched } = useQuery({
    queryKey: ['orphans', connectionId, schema, table],
    queryFn: () => connectionApi.getFkOrphans(connectionId, schema, table),
    enabled: false, // User must trigger scan
  });

  if (loadingStorage) {
    return (
        <div className="flex items-center justify-center p-12">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
    );
  }

  // Calculate health score (simple heuristic)
  const deadPct = storageInfo?.dead_tuple_pct || 0;
  const healthScore = Math.max(0, 100 - deadPct);
  
  let healthColor = 'text-success';
  if (healthScore < 80) healthColor = 'text-warning';
  if (healthScore < 50) healthColor = 'text-error';

  return (
    <div className="flex flex-col h-full bg-bg-1 rounded-xl border border-border-light overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border-light flex justify-between items-center bg-bg-0">
        <div>
          <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
            <Activity className="text-accent" size={20} />
            Table Health: <span className="text-text-secondary font-medium">{schema}.{table}</span>
          </h2>
          <p className="text-xs text-text-tertiary mt-0.5">
            Monitor storage usage, bloat, and referential integrity.
          </p>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={() => refetchStorage()}
                className="p-2 hover:bg-bg-2 rounded-lg text-text-secondary hover:text-text-primary transition-colors"
                title="Refresh Health Data"
            >
                <RefreshCw size={16} />
            </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-1 overflow-auto p-6">
        <Tabs
          tabs={[
            { id: 'storage', label: 'Storage & Bloat', icon: <Database size={14} /> },
            { id: 'integrity', label: 'Integrity & Orphans', icon: <ShieldAlert size={14} /> },
          ]}
          activeTab={activeTab}
          onChange={(id) => setActiveTab(id as any)}
          variant="line"
        />

        <div className="mt-6">
            {activeTab === 'storage' && storageInfo && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {/* Top Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-bg-0 p-4 rounded-xl border border-border-light shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                                <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg">
                                    <HardDrive size={20} />
                                </div>
                                <span className="text-xs font-semibold uppercase text-text-tertiary tracking-wider">Total Size</span>
                            </div>
                            <div className="text-2xl font-bold text-text-primary">
                                {formatBytes(storageInfo.total_size)}
                            </div>
                            <div className="flex gap-3 mt-2 text-xs text-text-secondary">
                                <span>Table: {formatBytes(storageInfo.table_size)}</span>
                                <span className="w-px h-3 bg-border" />
                                <span>Index: {formatBytes(storageInfo.index_size)}</span>
                            </div>
                        </div>

                        <div className="bg-bg-0 p-4 rounded-xl border border-border-light shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                                <div className={`p-2 rounded-lg ${healthScore > 80 ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'}`}>
                                    <Activity size={20} />
                                </div>
                                <span className="text-xs font-semibold uppercase text-text-tertiary tracking-wider">Health Score</span>
                            </div>
                            <div className={`text-2xl font-bold ${healthColor}`}>
                                {healthScore.toFixed(0)}/100
                            </div>
                            <div className="mt-2 w-full bg-bg-2 rounded-full h-1.5 overflow-hidden">
                                <div 
                                    className={`h-full rounded-full ${healthScore > 80 ? 'bg-green-500' : 'bg-orange-500'}`} 
                                    style={{ width: `${healthScore}%` }}
                                />
                            </div>
                        </div>

                        <div className="bg-bg-0 p-4 rounded-xl border border-border-light shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                                <div className="p-2 bg-red-500/10 text-red-500 rounded-lg">
                                    <Trash2 size={20} />
                                </div>
                                <span className="text-xs font-semibold uppercase text-text-tertiary tracking-wider">Dead Tuples</span>
                            </div>
                            <div className="text-2xl font-bold text-text-primary">
                                {storageInfo.dead_tuples?.toLocaleString() ?? 'N/A'}
                            </div>
                            <div className="mt-1 text-xs text-text-secondary">
                                {deadPct > 0 ? `${deadPct.toFixed(2)}% of total rows` : 'Clean'}
                            </div>
                        </div>
                    </div>

                    {/* Vacuum Stats */}
                    <div className="bg-bg-0 rounded-xl border border-border-light shadow-sm overflow-hidden">
                        <div className="px-4 py-3 border-b border-border-light bg-bg-2/50 flex items-center gap-2">
                            <Wind size={16} className="text-text-secondary" />
                            <h3 className="text-sm font-semibold text-text-primary">Maintenance Activity</h3>
                        </div>
                        <div className="divide-y divide-border-light">
                            <div className="grid grid-cols-2 p-4 gap-4 hover:bg-bg-2/30 transition-colors">
                                <div>
                                    <div className="text-xs text-text-tertiary mb-1">Last Vacuum</div>
                                    <div className="text-sm font-medium text-text-primary">
                                        {storageInfo.last_vacuum || 'Never'}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs text-text-tertiary mb-1">Last Auto-Vacuum</div>
                                    <div className="text-sm font-medium text-text-primary">
                                        {storageInfo.last_autovacuum || 'Never'}
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 p-4 gap-4 hover:bg-bg-2/30 transition-colors">
                                <div>
                                    <div className="text-xs text-text-tertiary mb-1">Last Analyze</div>
                                    <div className="text-sm font-medium text-text-primary">
                                        {storageInfo.last_analyze || 'Never'}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs text-text-tertiary mb-1">Last Auto-Analyze</div>
                                    <div className="text-sm font-medium text-text-primary">
                                        {storageInfo.last_autoanalyze || 'Never'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'integrity' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="bg-blue-500/5 border border-blue-500/20 p-4 rounded-xl flex gap-3 text-sm text-text-secondary">
                        <div className="p-2 bg-blue-500/10 rounded-lg h-fit text-blue-500">
                            <ShieldAlert size={18} />
                        </div>
                        <div>
                            <h4 className="font-semibold text-text-primary mb-1">Full Scan Required</h4>
                            <p>
                                Checking for orphaned records (foreign keys pointing to non-existent rows) requires a table scan.
                                This may be slow on very large tables.
                            </p>
                        </div>
                        <div className="ml-auto flex items-center">
                            <button
                                onClick={() => scanOrphans()}
                                disabled={loadingOrphans}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium shadow-lg shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-70 disabled:pointer-events-none"
                            >
                                {loadingOrphans ? <RefreshCw size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                                {orphansFetched ? 'Rescan' : 'Start Scan'}
                            </button>
                        </div>
                    </div>

                    {orphansFetched && (
                        <div className="bg-bg-0 border border-border-light rounded-xl overflow-hidden shadow-sm">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-bg-2 text-text-secondary uppercase text-xs font-semibold">
                                    <tr>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3">Constraint</th>
                                        <th className="px-4 py-3">Columns</th>
                                        <th className="px-4 py-3">Referenced Table</th>
                                        <th className="px-4 py-3 text-right">Orphan Count</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border-light">
                                    {orphans && orphans.length > 0 ? (
                                        orphans.map((o) => (
                                            <tr key={o.constraint_name} className="hover:bg-bg-1 transition-colors">
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2 text-error font-medium">
                                                        <AlertTriangle size={14} />
                                                        Failed
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 font-medium text-text-primary">{o.constraint_name}</td>
                                                <td className="px-4 py-3 font-mono text-xs text-text-secondary">{o.foreign_key_columns.join(', ')}</td>
                                                <td className="px-4 py-3 text-text-secondary">{o.referenced_table}</td>
                                                <td className="px-4 py-3 text-right font-bold text-error">{o.orphan_count.toLocaleString()}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-8 text-center text-text-tertiary">
                                                <div className="flex flex-col items-center gap-2">
                                                    <ShieldAlert size={32} className="text-success opacity-50" />
                                                    <p>No orphaned records found. Referential integrity is intact.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default TableHealthDashboard;
