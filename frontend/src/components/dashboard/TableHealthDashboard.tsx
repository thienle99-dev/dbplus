
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  Database,
  HardDrive,
  RefreshCw,
  ShieldAlert,
  Trash2,
  Wind,
  X
} from 'lucide-react';
import { connectionApi } from '../../services/connectionApi';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/Tabs';
import { formatBytes } from '../../utils/format';

interface TableHealthDashboardProps {
  connectionId: string;
  schema: string;
  table: string;
  onClose: () => void;
}

const TableHealthDashboard: React.FC<TableHealthDashboardProps> = ({ connectionId, schema, table, onClose }) => {
  const [activeTab, setActiveTab] = useState('storage');

  // Fetch Storage Info
  const { data: storageInfo, isLoading: loadingStorage, refetch: refetchStorage } = useQuery({
    queryKey: ['storageInfo', connectionId, schema, table],
    queryFn: () => connectionApi.getStorageBloatInfo(connectionId, schema, table),
  });

  // Fetch Orphans (Manual trigger usually better, but we can use enabled: false)
  const { data: orphans, isLoading: loadingOrphans, refetch: scanOrphans, isFetched: orphansFetched } = useQuery({
    queryKey: ['orphans', connectionId, schema, table],
    queryFn: () => connectionApi.getFkOrphans(connectionId, schema, table),
    enabled: false, // User must trigger scan
  });

  // Calculate health score (simple heuristic)
  const deadPct = storageInfo?.dead_tuple_pct || 0;
  const healthScore = Math.max(0, 100 - deadPct);
  
  let healthColor = 'text-success';
  if (healthScore < 80) healthColor = 'text-warning';
  if (healthScore < 50) healthColor = 'text-error';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-5xl h-[85vh] bg-bg-1 rounded-xl shadow-2xl overflow-hidden relative border border-border-light flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-border-light flex justify-between items-center bg-bg-0 shrink-0">
            <div>
            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <Activity className="text-accent" size={20} />
                Table Health: <span className="text-text-secondary font-medium">{schema}.{table}</span>
            </h2>
            <p className="text-xs text-text-tertiary mt-0.5">
                Monitor storage usage, bloat, and referential integrity.
            </p>
            </div>
            <div className="flex gap-2 items-center">
                <button 
                    onClick={() => { refetchStorage(); if(orphansFetched) scanOrphans(); }}
                    className="p-2 hover:bg-bg-2 rounded-lg text-text-secondary hover:text-text-primary transition-colors"
                    title="Refresh Health Data"
                >
                    <RefreshCw size={18} />
                </button>
                <div className="w-px h-6 bg-border-light mx-1" />
                <button 
                    onClick={onClose}
                    className="p-2 hover:bg-bg-2 rounded-lg text-text-secondary hover:text-text-primary transition-colors"
                >
                    <X size={20} />
                </button>
            </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
            {loadingStorage ? (
                <div className="flex-1 flex flex-col items-center justify-center">
                    <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-text-secondary font-medium">Analyzing table storage...</p>
                </div>
            ) : (
                <Tabs defaultValue="storage" value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                     <div className="px-6 pt-4 shrink-0 border-b border-border-light bg-bg-1">
                        <TabsList className="bg-bg-2/50 p-1 w-fit">
                            <TabsTrigger value="storage" className="flex items-center gap-2">
                                <Database size={14} />
                                Storage & Bloat
                            </TabsTrigger>
                            <TabsTrigger value="integrity" className="flex items-center gap-2">
                                <ShieldAlert size={14} />
                                Integrity & Orphans
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-bg-1">
                        <TabsContent value="storage" className="mt-0 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-6">
                            {storageInfo && (
                                <>
                                    {/* Top Stats Cards */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="bg-bg-0 p-5 rounded-xl border border-border-light shadow-sm">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="p-2.5 bg-blue-500/10 text-blue-500 rounded-lg">
                                                    <HardDrive size={24} />
                                                </div>
                                                <span className="text-xs font-bold uppercase text-text-tertiary tracking-wider bg-bg-2 px-2 py-1 rounded">Size</span>
                                            </div>
                                            <div className="text-3xl font-bold text-text-primary tracking-tight">
                                                {formatBytes(storageInfo.total_size)}
                                            </div>
                                            <div className="flex gap-3 mt-3 text-xs text-text-secondary font-medium">
                                                <span>Table: <span className="text-text-primary">{formatBytes(storageInfo.table_size)}</span></span>
                                                <span className="text-border-light">•</span>
                                                <span>Index: <span className="text-text-primary">{formatBytes(storageInfo.index_size)}</span></span>
                                            </div>
                                        </div>

                                        <div className="bg-bg-0 p-5 rounded-xl border border-border-light shadow-sm">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className={`p-2.5 rounded-lg ${healthScore > 80 ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'}`}>
                                                    <Activity size={24} />
                                                </div>
                                                <span className="text-xs font-bold uppercase text-text-tertiary tracking-wider bg-bg-2 px-2 py-1 rounded">Health Score</span>
                                            </div>
                                            <div className={`text-3xl font-bold tracking-tight ${healthColor}`}>
                                                {healthScore.toFixed(0)}<span className="text-lg text-text-tertiary ml-1">/100</span>
                                            </div>
                                            <div className="mt-3 w-full bg-bg-2 rounded-full h-2 overflow-hidden">
                                                <div 
                                                    className={`h-full rounded-full transition-all duration-1000 ${healthScore > 80 ? 'bg-green-500' : 'bg-orange-500'}`} 
                                                    style={{ width: `${healthScore}%` }}
                                                />
                                            </div>
                                        </div>

                                        <div className="bg-bg-0 p-5 rounded-xl border border-border-light shadow-sm">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="p-2.5 bg-red-500/10 text-red-500 rounded-lg">
                                                    <Trash2 size={24} />
                                                </div>
                                                <span className="text-xs font-bold uppercase text-text-tertiary tracking-wider bg-bg-2 px-2 py-1 rounded">Dead Tuples</span>
                                            </div>
                                            <div className="text-3xl font-bold text-text-primary tracking-tight">
                                                {storageInfo.dead_tuples?.toLocaleString() ?? 'N/A'}
                                            </div>
                                            <div className="mt-3 text-xs text-text-secondary font-medium">
                                                {deadPct > 0 ? (
                                                    <span className="text-error">{deadPct.toFixed(2)}% of total rows are dead</span>
                                                ) : (
                                                    <span className="text-success flex items-center gap-1">Table is clean</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Vacuum Stats */}
                                    <div className="bg-bg-0 rounded-xl border border-border-light shadow-sm overflow-hidden">
                                        <div className="px-5 py-4 border-b border-border-light bg-bg-2/30 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Wind size={18} className="text-text-secondary" />
                                                <h3 className="text-sm font-bold text-text-primary">Maintenance Activity</h3>
                                            </div>
                                            <span className="text-xs text-text-tertiary">PostgreSQL Vacuum & Analyze Stats</span>
                                        </div>
                                        <div className="divide-y divide-border-light">
                                            <div className="grid grid-cols-2 p-5 gap-8 hover:bg-bg-2/20 transition-colors">
                                                <div className="space-y-1">
                                                    <div className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">Last Vacuum</div>
                                                    <div className="text-base font-medium text-text-primary tabular-nums">
                                                        {storageInfo.last_vacuum || <span className="text-text-disabled">Never</span>}
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">Last Auto-Vacuum</div>
                                                    <div className="text-base font-medium text-text-primary tabular-nums">
                                                        {storageInfo.last_autovacuum || <span className="text-text-disabled">Never</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 p-5 gap-8 hover:bg-bg-2/20 transition-colors">
                                                <div className="space-y-1">
                                                    <div className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">Last Analyze</div>
                                                    <div className="text-base font-medium text-text-primary tabular-nums">
                                                        {storageInfo.last_analyze || <span className="text-text-disabled">Never</span>}
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">Last Auto-Analyze</div>
                                                    <div className="text-base font-medium text-text-primary tabular-nums">
                                                        {storageInfo.last_autoanalyze || <span className="text-text-disabled">Never</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/10 text-xs text-text-secondary flex gap-3">
                                        <div className="shrink-0 pt-0.5"><Database size={16} className="text-blue-500"/></div>
                                        <div>
                                            <p className="font-semibold text-blue-500 mb-1">About Table Bloat</p>
                                            In PostgreSQL, updates mark old rows as dead rather than removing them immediately. 
                                            Vacuuming reclaims this space. High bloat (\u003e20%) can degrade performance and waste disk space.
                                        </div>
                                    </div>
                                </>
                            )}
                        </TabsContent>

                        <TabsContent value="integrity" className="mt-0 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-6">
                            <div className="bg-bg-0 border border-border-light p-6 rounded-xl flex flex-col md:flex-row gap-6 items-start md:items-center shadow-sm">
                                <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500 shrink-0">
                                    <ShieldAlert size={32} />
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-lg font-bold text-text-primary mb-1">Referential Integrity Scan</h4>
                                    <p className="text-sm text-text-secondary max-w-2xl leading-relaxed">
                                        This tool scans all foreign keys defined on this table to ensure they point to valid existing rows in the referenced tables. 
                                        <br/><span className="text-orange-500 font-medium">Note:</span> This operation performs a full table scan and may be resource-intensive on very large tables.
                                    </p>
                                </div>
                                <div className="shrink-0">
                                    <button
                                        onClick={() => scanOrphans()}
                                        disabled={loadingOrphans}
                                        className="flex items-center gap-2 px-6 py-3 bg-accent hover:bg-accent-hover text-white rounded-xl font-semibold shadow-lg shadow-accent/20 transition-all active:scale-95 disabled:opacity-70 disabled:pointer-events-none"
                                    >
                                        {loadingOrphans ? <RefreshCw size={18} className="animate-spin" /> : <RefreshCw size={18} />}
                                        {orphansFetched ? 'Rescan Integrity' : 'Run Full Scan'}
                                    </button>
                                </div>
                            </div>

                            {orphansFetched && (
                                <div className="bg-bg-0 border border-border-light rounded-xl overflow-hidden shadow-sm animate-in slide-in-from-bottom-4 duration-500 fill-mode-backwards">
                                    <div className="px-6 py-4 border-b border-border-light bg-bg-2/30">
                                        <h3 className="font-bold text-text-primary">Scan Results</h3>
                                    </div>
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-bg-2 text-text-secondary uppercase text-xs font-semibold tracking-wider">
                                            <tr>
                                                <th className="px-6 py-3 w-32">Status</th>
                                                <th className="px-6 py-3">Constraint Name</th>
                                                <th className="px-6 py-3">Foreign Key Info</th>
                                                <th className="px-6 py-3 text-right">Orphan Count</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border-light">
                                            {orphans && orphans.length > 0 ? (
                                                orphans.map((o) => (
                                                    <tr key={o.constraint_name} className="hover:bg-bg-1 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 text-red-500 text-xs font-bold border border-red-500/20">
                                                                <AlertTriangle size={12} fill="currentColor" />
                                                                FAILED
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 font-semibold text-text-primary">{o.constraint_name}</td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-col gap-0.5">
                                                                <span className="text-text-secondary">Referenced Table: <span className="text-text-primary font-medium">{o.referenced_table}</span></span>
                                                                <span className="font-mono text-xs text-text-tertiary bg-bg-2 px-1.5 py-0.5 rounded w-fit">{o.foreign_key_columns.join(', ')}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <span className="font-bold text-error text-lg">{o.orphan_count.toLocaleString()}</span>
                                                            <span className="text-xs text-text-tertiary block">rows</span>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={4} className="px-6 py-12 text-center text-text-tertiary">
                                                        <div className="flex flex-col items-center gap-3">
                                                            <div className="w-16 h-16 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mb-2">
                                                                <ShieldAlert size={32} />
                                                            </div>
                                                            <h4 className="text-lg font-bold text-text-primary">Integrity Verified</h4>
                                                            <p className="max-w-md mx-auto">
                                                                No orphaned records found. All foreign keys referencing other tables are valid and referential integrity is intact.
                                                            </p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </TabsContent>
                    </div>
                </Tabs>
            )}
        </div>
      </div>
    </div>
  );
};

export default TableHealthDashboard;
