import React, { useState } from 'react';
import { useLogStore, LogEntry } from '../store/logStore';
import { Trash2, ChevronRight, ChevronDown } from 'lucide-react';
import Select from './ui/Select';

export const LogViewer: React.FC = () => {
    const { logs, clearLogs, maxLogs, setMaxLogs } = useLogStore();
    const [filter, setFilter] = useState<'all' | 'request' | 'response' | 'error'>('all');

    const filteredLogs = logs.filter(log => {
        if (filter === 'all') return true;
        return log.type === filter;
    });

    return (
        <div className="h-full flex flex-col bg-bg-0">
            {/* Header */}
            <div className="flex items-start flex-col px-3 py-2 bg-bg-1 border-b border-border">
                <div className="mb-2">
                    <span className="text-xs mb-3 font-medium text-text-secondary">
                        Network Logs ({filteredLogs.length})
                    </span>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-2 py-0.5 text-[10px] rounded transition-colors ${filter === 'all'
                                ? 'bg-accent text-white'
                                : 'bg-bg-2 text-text-secondary hover:text-text-primary'
                                }`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setFilter('request')}
                            className={`px-2 py-0.5 text-[10px] rounded transition-colors ${filter === 'request'
                                ? 'bg-blue-500 text-white'
                                : 'bg-bg-2 text-text-secondary hover:text-text-primary'
                                }`}
                        >
                            Request
                        </button>
                        <button
                            onClick={() => setFilter('response')}
                            className={`px-2 py-0.5 text-[10px] rounded transition-colors ${filter === 'response'
                                ? 'bg-green-500 text-white'
                                : 'bg-bg-2 text-text-secondary hover:text-text-primary'
                                }`}
                        >
                            Response
                        </button>
                        <button
                            onClick={() => setFilter('error')}
                            className={`px-2 py-0.5 text-[10px] rounded transition-colors ${filter === 'error'
                                ? 'bg-red-500 text-white'
                                : 'bg-bg-2 text-text-secondary hover:text-text-primary'
                                }`}
                        >
                            Error
                        </button>
                    </div>
                </div>
                <div className="flex items-center gap-2 mb-3">
                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-text-secondary">Limit:</span>
                        <Select
                            value={String(maxLogs)}
                            onChange={(val) => setMaxLogs(Number(val))}
                            options={[
                                { value: '50', label: '50' },
                                { value: '100', label: '100' },
                                { value: '200', label: '200' },
                                { value: '500', label: '500' },
                            ]}
                            size="sm"
                            className="w-20"
                        />
                    </div>
                    <button
                        onClick={clearLogs}
                        className="p-1 hover:bg-bg-2 rounded text-text-secondary hover:text-text-primary transition-colors"
                        title="Clear logs"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>

            {/* Log List */}
            <div className="flex-1 overflow-y-auto">
                {filteredLogs.length === 0 ? (
                    <div className="text-text-secondary text-center mt-10 text-xs">
                        No logs yet...
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {filteredLogs.map((log) => (
                            <LogItem key={log.id} log={log} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const LogItem: React.FC<{ log: LogEntry }> = ({ log }) => {
    const [expanded, setExpanded] = useState(false);

    const getTypeStyles = () => {
        switch (log.type) {
            case 'error':
                return 'bg-red-500/10 border-l-2 border-l-red-500';
            case 'response':
                return log.status && log.status >= 400
                    ? 'bg-red-500/10 border-l-2 border-l-red-500'
                    : 'bg-green-500/10 border-l-2 border-l-green-500';
            case 'request':
                return 'bg-blue-500/10 border-l-2 border-l-blue-500';
            default:
                return 'bg-bg-1 border-l-2 border-l-border';
        }
    };

    const getMethodColor = () => {
        if (log.type === 'error' || (log.status && log.status >= 400)) return 'text-red-400';
        if (log.status && log.status >= 200 && log.status < 300) return 'text-green-400';
        if (log.type === 'request') return 'text-blue-400';
        return 'text-text-secondary';
    };

    const hasDetails = log.data || log.url;

    return (
        <div className={`p-2 ${getTypeStyles()}`}>
            <div
                className={`flex items-start gap-2 ${hasDetails ? 'cursor-pointer' : ''}`}
                onClick={() => hasDetails && setExpanded(!expanded)}
            >
                {hasDetails && (
                    <div className="text-text-secondary mt-0.5">
                        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    </div>
                )}
                {!hasDetails && <div className="w-3" />}

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs">
                        <span className="text-text-secondary text-[10px] font-mono">
                            {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        {log.method && (
                            <span className={`font-bold text-[10px] font-mono ${getMethodColor()}`}>
                                {log.method}
                            </span>
                        )}
                        {log.status && (
                            <span className={`font-mono text-[10px] ${getMethodColor()}`}>
                                {log.status}
                            </span>
                        )}
                        {log.url && (
                            <span className="text-text-secondary text-[10px] font-mono truncate">
                                {log.url}
                            </span>
                        )}
                    </div>
                    <div className="text-xs text-text-primary mt-0.5">
                        {log.message}
                    </div>
                </div>
            </div>

            {expanded && (
                <div className="mt-2 ml-5 space-y-2">
                    {log.url && (
                        <div className="bg-bg-2 p-2 rounded">
                            <div className="text-[10px] font-semibold text-text-secondary mb-1">URL</div>
                            <div className="text-[10px] font-mono text-text-primary break-all">{log.url}</div>
                        </div>
                    )}

                    {log.data && (
                        <div className="bg-bg-2 p-2 rounded">
                            <div className="text-[10px] font-semibold text-text-secondary mb-1">
                                {log.type === 'request' ? 'Request Payload' :
                                    log.type === 'error' ? 'Error Details' : 'Response Data'}
                            </div>
                            <pre className="text-[10px] font-mono text-text-primary overflow-x-auto whitespace-pre-wrap max-h-60 overflow-y-auto">
                                {typeof log.data === 'string'
                                    ? log.data
                                    : JSON.stringify(log.data, null, 2)}
                            </pre>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};


