
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  AlertOctagon,
  Clock,
  Database,
  Monitor,
  RefreshCw,
  Search,
  User,
  X
} from 'lucide-react';
import { sessionApi, SessionInfo } from '../../services/sessionApi';

interface ActivityMonitorProps {
  connectionId: string;
  onClose: () => void;
}

const ActivityMonitor: React.FC<ActivityMonitorProps> = ({ connectionId, onClose }) => {
  const [filter, setFilter] = useState('');
  const [terminatingPid, setTerminatingPid] = useState<number | null>(null);

  const { data: sessions, isLoading, refetch } = useQuery({
    queryKey: ['sessions', connectionId],
    queryFn: () => sessionApi.getSessions(connectionId),
    refetchInterval: 5000, 
  });

  const handleKillSession = async (pid: number) => {
    if (!confirm(`Are you sure you want to terminate session ${pid}? This action cannot be undone.`)) {
        return;
    }
    setTerminatingPid(pid);
    try {
      await sessionApi.killSession(connectionId, pid);
      await refetch();
    } catch (error) {
      console.error('Failed to kill session:', error);
      alert('Failed to terminate session');
    } finally {
      setTerminatingPid(null);
    }
  };

  const filteredSessions = sessions?.filter(s => {
      const search = filter.toLowerCase();
      return (
          (s.user_name?.toLowerCase() || '').includes(search) ||
          (s.application_name?.toLowerCase() || '').includes(search) ||
          (s.query?.toLowerCase() || '').includes(search) ||
          (s.state?.toLowerCase() || '').includes(search) ||
          s.pid.toString().includes(search)
      );
  }) || [];

  const getDuration = (start: string | null) => {
      if (!start) return '-';
      try {
          const startTime = new Date(start).getTime();
          const now = new Date().getTime();
          const diff = Math.max(0, now - startTime); // ms
          
          if (diff < 1000) return 'just now';
          const seconds = Math.floor(diff / 1000);
          if (seconds < 60) return `${seconds}s`;
          const minutes = Math.floor(seconds / 60);
          if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
          const hours = Math.floor(minutes / 60);
          return `${hours}h ${minutes % 60}m`;
      } catch (e) {
          return '-';
      }
  };

  const getStateColor = (state: string | null) => {
      switch (state) {
          case 'active': return 'text-green-500 bg-green-500/10';
          case 'idle': return 'text-text-tertiary bg-text-tertiary/10';
          case 'idle in transaction': return 'text-orange-500 bg-orange-500/10';
          case 'idle in transaction (aborted)': return 'text-red-500 bg-red-500/10';
          case 'fastpath function call': return 'text-blue-500 bg-blue-500/10';
          default: return 'text-text-secondary bg-bg-2';
      }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-6xl h-[85vh] bg-bg-1 rounded-xl shadow-2xl overflow-hidden relative border border-border-light flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-border-light flex justify-between items-center bg-bg-0 shrink-0">
            <div>
                <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                    <Monitor className="text-accent" size={20} />
                    Server Activity Monitor
                </h2>
                <p className="text-xs text-text-tertiary mt-0.5">
                    View active sessions, monitor performance, and manage connections.
                </p>
            </div>
            <div className="flex gap-3 items-center">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" size={14} />
                    <input 
                        type="text" 
                        placeholder="Filter sessions..." 
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="pl-9 pr-4 py-1.5 bg-bg-2 border border-border-light rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent w-64 transition-all"
                    />
                </div>
                <div className="h-6 w-px bg-border-light" />
                <button 
                    onClick={() => refetch()}
                    className="p-2 hover:bg-bg-2 rounded-lg text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
                    disabled={isLoading}
                    title="Refresh Data"
                >
                    <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
                </button>
                <button 
                    onClick={onClose}
                    className="p-2 hover:bg-bg-2 rounded-lg text-text-secondary hover:text-text-primary transition-colors"
                >
                    <X size={20} />
                </button>
            </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-bg-1">
            <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-bg-2 text-text-secondary uppercase text-xs font-semibold tracking-wider sticky top-0 z-10 shadow-sm">
                    <tr>
                        <th className="px-6 py-3 w-24">PID</th>
                        <th className="px-6 py-3 w-32">User</th>
                        <th className="px-6 py-3 w-32">App</th>
                        <th className="px-6 py-3 w-40">State</th>
                        <th className="px-6 py-3 w-32">Duration</th>
                        <th className="px-6 py-3">Latest Query</th>
                        <th className="px-6 py-3 w-20 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border-light">
                    {isLoading && !sessions ? (
                       <tr>
                           <td colSpan={7} className="px-6 py-12 text-center text-text-tertiary">
                               <div className="flex justify-center mb-2"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent"></div></div>
                               Loading sessions...
                           </td>
                       </tr>
                    ) : filteredSessions.length === 0 ? (
                        <tr>
                            <td colSpan={7} className="px-6 py-12 text-center text-text-tertiary">
                                No active sessions found matching your criteria.
                            </td>
                        </tr>
                    ) : (
                        filteredSessions.map((session) => (
                            <tr key={session.pid} className="hover:bg-bg-2/50 transition-colors group">
                                <td className="px-6 py-3 font-mono text-text-secondary">{session.pid}</td>
                                <td className="px-6 py-3 text-text-primary font-medium">
                                    <div className="flex items-center gap-2">
                                        <User size={12} className="text-text-tertiary" />
                                        {session.user_name || '-'}
                                    </div>
                                </td>
                                <td className="px-6 py-3 text-text-secondary truncate max-w-[150px]" title={session.application_name || ''}>
                                    {session.application_name || '-'}
                                </td>
                                <td className="px-6 py-3">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border border-transparent ${getStateColor(session.state)}`}>
                                        {session.state || 'unknown'}
                                    </span>
                                </td>
                                <td className="px-6 py-3 font-mono text-text-secondary">
                                    <div className="flex items-center gap-1.5" title={`Started: ${session.query_start || session.backend_start}`}>
                                        <Clock size={12} className="text-text-tertiary" />
                                        {getDuration(session.query_start || session.backend_start)}
                                    </div>
                                </td>
                                <td className="px-6 py-3 text-text-secondary font-mono text-xs max-w-md truncate group-hover:whitespace-normal group-hover:break-words group-hover:overflow-visible group-hover:z-20 group-hover:bg-bg-0 group-hover:absolute group-hover:shadow-lg group-hover:border group-hover:border-border-light group-hover:rounded-lg group-hover:p-3 group-hover:w-96 transition-all duration-0 delay-150">
                                    {session.query || <span className="text-text-disabled italic">No query</span>}
                                </td>
                                <td className="px-6 py-3 text-right">
                                    <button
                                        onClick={() => handleKillSession(session.pid)}
                                        disabled={terminatingPid === session.pid}
                                        className="p-1.5 text-text-tertiary hover:text-red-500 hover:bg-red-500/10 rounded transition-colors disabled:opacity-50"
                                        title="Terminate Session"
                                    >
                                        <AlertOctagon size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
        
        {/* Footer Stats */}
        <div className="px-6 py-2 bg-bg-2/30 border-t border-border-light text-xs text-text-tertiary flex gap-4">
             <span>Total Sessions: <span className="text-text-primary font-mono">{sessions?.length || 0}</span></span>
             <span>Active: <span className="text-text-primary font-mono">{sessions?.filter(s => s.state === 'active').length || 0}</span></span>
             <span>Idle: <span className="text-text-primary font-mono">{sessions?.filter(s => s.state?.includes('idle')).length || 0}</span></span>
        </div>
      </div>
    </div>
  );
};

export default ActivityMonitor;
