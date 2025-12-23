
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TableStats, StorageBloatInfo, FkOrphanInfo } from '../../types/table';
import { useConnectionStore } from '../../store/connectionStore';
import api from '../../services/api';
import { Loader2, AlertTriangle, ShieldCheck, Database, FileText, Activity } from 'lucide-react';

interface TableHealthDashboardProps {
  schema: string;
  table: string;
  onClose: () => void;
}

export default function TableHealthDashboard({ schema, table, onClose }: TableHealthDashboardProps) {
  const { activeConnectionId } = useConnectionStore();
  const [checkingOrphans, setCheckingOrphans] = useState(false);
  const [orphans, setOrphans] = useState<FkOrphanInfo[] | null>(null);

  const { data: stats, isLoading: statsLoading } = useQuery<TableStats>({
    queryKey: ['table-stats', activeConnectionId, schema, table],
    queryFn: async () => {
      const res = await api.get(`/api/connections/${activeConnectionId}/table-stats`, {
        params: { schema, table },
      });
      return res.data;
    },
    enabled: !!activeConnectionId,
  });

  const { data: bloat, isLoading: bloatLoading } = useQuery<StorageBloatInfo>({
    queryKey: ['storage-info', activeConnectionId, schema, table],
    queryFn: async () => {
      const res = await api.get(`/api/connections/${activeConnectionId}/storage-info`, {
        params: { schema, table },
      });
      return res.data;
    },
    enabled: !!activeConnectionId,
  });

  const runOrphanCheck = async () => {
    if (!activeConnectionId) return;
    setCheckingOrphans(true);
    try {
      const res = await api.get<FkOrphanInfo[]>(`/api/connections/${activeConnectionId}/health/orphans`, {
        params: { schema, table },
      });
      setOrphans(res.data);
    } catch (err) {
      console.error("Failed to check orphans", err);
    } finally {
      setCheckingOrphans(false);
    }
  };

  const formatBytes = (bytes: number | null | undefined) => {
    if (bytes === null || bytes === undefined) return 'N/A';
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const Card = ({ title, icon, children, className }: any) => (
    <div className={`p-4 rounded-lg border border-border-default bg-background-layer-1 ${className}`}>
      <div className="flex items-center gap-2 mb-2 text-text-secondary/80">
        {icon}
        <span className="font-medium text-sm">{title}</span>
      </div>
      <div className="text-2xl font-semibold text-text-primary">
        {children}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] bg-background-base flex flex-col animate-in fade-in duration-200">
      <div className="flex items-center justify-between p-4 border-b border-border-default bg-bg-1">
         <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-accent-primary" />
            <h2 className="text-lg font-semibold">Table Health: {schema}.{table}</h2>
         </div>
         <button onClick={onClose} className="p-2 hover:bg-bg-2 rounded-md transition-colors text-text-secondary hover:text-text-primary">
            Close
         </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 container mx-auto max-w-7xl">
        
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card title="Row Count" icon={<Database className="w-4 h-4" />}>
                {statsLoading ? <Loader2 className="w-5 h-5 animate-spin"/> : (stats?.row_count?.toLocaleString() ?? 'N/A')}
            </Card>
            <Card title="Total Size" icon={<FileText className="w-4 h-4" />}>
                {statsLoading ? <Loader2 className="w-5 h-5 animate-spin"/> : formatBytes(stats?.total_size)}
            </Card>
             <Card title="Bloat Percentage" icon={<AlertTriangle className="w-4 h-4" />}>
                {bloatLoading ? <Loader2 className="w-5 h-5 animate-spin"/> : (bloat?.dead_tuple_pct !== null && bloat?.dead_tuple_pct !== undefined ? `${bloat.dead_tuple_pct.toFixed(2)}%` : 'N/A')}
            </Card>
            <Card title="Health Status" icon={<ShieldCheck className="w-4 h-4" />}>
                <span className="text-status-success">Good</span>
            </Card>
        </div>

        {/* Detailed Info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Storage Details */}
            <div className="border border-border-default rounded-lg p-4 bg-background-layer-1">
                <h3 className="font-medium mb-4">Storage Breakdown</h3>
                <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                        <span className="text-text-secondary">Table Size</span>
                        <span>{formatBytes(stats?.table_size)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-text-secondary">Index Size</span>
                        <span>{formatBytes(stats?.index_size)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-text-secondary">Live Tuples</span>
                        <span>{bloat?.live_tuples?.toLocaleString() ?? 'N/A'}</span>
                    </div>
                     <div className="flex justify-between">
                        <span className="text-text-secondary">Dead Tuples</span>
                        <span>{bloat?.dead_tuples?.toLocaleString() ?? 'N/A'}</span>
                    </div>
                </div>
            </div>

            {/* Maintenance Info */}
            <div className="border border-border-default rounded-lg p-4 bg-background-layer-1">
                <h3 className="font-medium mb-4">Maintenance</h3>
                <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                        <span className="text-text-secondary">Last Vacuum</span>
                        <span>{bloat?.last_vacuum ?? 'Never'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-text-secondary">Last Auto-Vacuum</span>
                        <span>{bloat?.last_autovacuum ?? 'Never'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-text-secondary">Last Analyze</span>
                        <span>{bloat?.last_analyze ?? 'Never'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-text-secondary">Last Auto-Analyze</span>
                        <span>{bloat?.last_autoanalyze ?? 'Never'}</span>
                    </div>
                </div>
            </div>
        </div>

        {/* Orphan Check */}
        <div className="border border-border-default rounded-lg p-4 bg-background-layer-1">
             <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium">Foreign Key Integrity</h3>
                <button 
                    onClick={runOrphanCheck} 
                    disabled={checkingOrphans}
                    className="px-3 py-1.5 bg-accent-primary text-white rounded text-sm font-medium hover:bg-accent-primary/90 disabled:opacity-50 flex items-center gap-2"
                >
                    {checkingOrphans && <Loader2 className="w-3 h-3 animate-spin" />}
                    {checkingOrphans ? 'Checking...' : 'Check now'}
                </button>
             </div>
             
             {!orphans && !checkingOrphans && (
                 <div className="text-text-secondary text-sm italic">
                     Click "Check now" to verify foreign key integrity. This may take a while for large tables.
                 </div>
             )}

             {orphans && (
                 <div className="space-y-2">
                     {orphans.length === 0 ? (
                         <div className="p-3 bg-status-success/10 text-status-success rounded text-sm flex items-center gap-2">
                             <ShieldCheck className="w-4 h-4" />
                             No orphan rows detected. All foreign keys are valid.
                         </div>
                     ) : (
                         <div className="space-y-2">
                             <div className="p-3 bg-status-error/10 text-status-error rounded text-sm flex items-center gap-2">
                                 <AlertTriangle className="w-4 h-4" />
                                 {orphans.length} foreign key constraints have orphan rows.
                             </div>
                             <div className="overflow-x-auto">
                                 <table className="w-full text-sm text-left">
                                     <thead className="text-text-secondary border-b border-border-default">
                                         <tr>
                                             <th className="py-2">Constraint</th>
                                             <th className="py-2">Reference</th>
                                             <th className="py-2">Orphans</th>
                                         </tr>
                                     </thead>
                                     <tbody>
                                         {orphans.map((issue) => (
                                             <tr key={issue.constraint_name} className="border-b border-border-default/50">
                                                 <td className="py-2 font-mono">{issue.constraint_name}</td>
                                                 <td className="py-2">{issue.referenced_table} ({issue.foreign_key_columns.join(', ')})</td>
                                                 <td className="py-2 text-status-error font-medium">{issue.orphan_count}</td>
                                             </tr>
                                         ))}
                                     </tbody>
                                 </table>
                             </div>
                         </div>
                     )}
                 </div>
             )}
        </div>
      </div>
    </div>
  );
}

