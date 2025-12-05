import React, { useEffect, useRef, useState } from 'react';
import { useLogStore, LogEntry } from '../store/logStore';
import { ChevronDown, ChevronUp, Trash2, Activity } from 'lucide-react';

export const LogViewer: React.FC = () => {
    const { logs, isOpen, toggleOpen, clearLogs } = useLogStore();
    const endRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when new logs arrive (if open)
    useEffect(() => {
        if (isOpen && endRef.current) {
            endRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs, isOpen]);

    if (!isOpen) {
        return (
            <div className="fixed bottom-0 right-4 z-50">
                <button
                    onClick={toggleOpen}
                    className="bg-[#1e1e1e] border border-[#3a3a3a] border-b-0 text-gray-300 px-4 py-2 rounded-t-lg shadow-lg flex items-center gap-2 hover:bg-[#2a2a2a] transition-colors text-xs font-mono"
                >
                    <Activity className="w-3 h-3 text-blue-400" />
                    Console ({logs.length})
                    <ChevronUp className="w-3 h-3" />
                </button>
            </div>
        );
    }

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 h-[300px] bg-[#1e1e1e] border-t border-[#3a3a3a] shadow-2xl flex flex-col font-mono text-xs">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-[#3a3a3a]">
                <div className="flex items-center gap-2 text-gray-300">
                    <Activity className="w-4 h-4 text-blue-400" />
                    <span className="font-medium">Network Logs</span>
                    <span className="bg-[#3a3a3a] px-2 py-0.5 rounded-full text-[10px] text-gray-400">
                        {logs.length}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={clearLogs}
                        className="p-1.5 hover:bg-[#3a3a3a] rounded text-gray-400 hover:text-white transition-colors"
                        title="Clear logs"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={toggleOpen}
                        className="p-1.5 hover:bg-[#3a3a3a] rounded text-gray-400 hover:text-white transition-colors"
                    >
                        <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Log List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#1e1e1e]">
                {logs.length === 0 ? (
                    <div className="text-gray-600 text-center mt-10 italic">No logs yet...</div>
                ) : (
                    logs.slice().reverse().map((log) => (
                        <LogItem key={log.id} log={log} />
                    ))
                )}
                <div ref={endRef} />
            </div>
        </div>
    );
};

const LogItem: React.FC<{ log: LogEntry }> = ({ log }) => {
    const [expanded, setExpanded] = useState(false);

    // Status color
    const getStatusColor = () => {
        if (log.type === 'error' || (log.status && log.status >= 400)) return 'text-red-400';
        if (log.status && log.status >= 200 && log.status < 300) return 'text-green-400';
        return 'text-blue-400';
    };

    return (
        <div className="border-b border-[#2a2a2a] pb-2 last:border-0">
            <div
                className="flex items-start gap-2 cursor-pointer hover:bg-[#252526] p-1 rounded"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="text-gray-500 w-[70px] shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString()}
                </div>
                <div className={`w-[60px] font-bold shrink-0 ${getStatusColor()}`}>
                    {log.method || 'LOG'}
                </div>
                <div className="flex-1 truncate text-gray-300" title={log.message}>
                    {log.message}
                </div>
                {log.data && (
                    <div className="text-gray-600 shrink-0 text-[10px]">
                        {expanded ? '▲' : '▼'}
                    </div>
                )}
            </div>

            {expanded && log.data && (
                <div className="mt-2 ml-[80px] bg-[#121212] p-2 rounded overflow-x-auto">
                    <pre className="text-gray-400 whitespace-pre-wrap">
                        {JSON.stringify(log.data, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
};


