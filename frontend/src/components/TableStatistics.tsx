import { BarChart3, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { TableStatisticsProps } from '../types';

function formatBytes(bytes: number | null): string {
    if (bytes === null || bytes === undefined) return 'N/A';
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

function formatNumber(num: number | null): string {
    if (num === null || num === undefined) return 'N/A';
    if (num === -1) return 'Loading...'; // -1 indicates loading or unavailable
    if (num < 0) return 'N/A'; // Other negative values
    return num.toLocaleString();
}

function formatDate(dateStr: string | null): string {
    if (!dateStr) return 'N/A';
    try {
        const date = new Date(dateStr);
        return date.toLocaleString();
    } catch {
        return dateStr;
    }
}

export default function TableStatistics({ statistics, onRefresh, loading }: TableStatisticsProps) {
    const [refreshing, setRefreshing] = useState(false);

    const handleRefresh = async () => {
        setRefreshing(true);
        await onRefresh();
        setTimeout(() => setRefreshing(false), 500);
    };

    const stats = [
        { label: 'Total Rows', value: formatNumber(statistics.row_count), icon: '📊' },
        { label: 'Table Size', value: formatBytes(statistics.table_size), icon: '💾' },
        { label: 'Index Size', value: formatBytes(statistics.index_size), icon: '🔍' },
        { label: 'Total Size', value: formatBytes(statistics.total_size), icon: '📦' },
        { label: 'Last Modified', value: formatDate(statistics.last_modified), icon: '🕐' },
    ];

    return (
        <div>
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <BarChart3 size={12} className="md:w-3.5 md:h-3.5 text-text-secondary" />
                    <h4 className="text-[10px] md:text-xs font-medium text-text-secondary uppercase">
                        Table Statistics
                    </h4>
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={loading || refreshing}
                    className="flex items-center gap-1 px-2 py-1 text-[10px] md:text-xs bg-bg-2 hover:bg-bg-3 text-text-secondary hover:text-text-primary rounded transition-colors disabled:opacity-50"
                    title="Refresh statistics"
                >
                    <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3">
                {stats.map((stat) => (
                    <div
                        key={stat.label}
                        className="bg-bg-1 border border-border rounded p-2 md:p-3"
                    >
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-base md:text-lg">{stat.icon}</span>
                            <div className="text-[9px] md:text-[10px] text-text-secondary uppercase font-medium">
                                {stat.label}
                            </div>
                        </div>
                        <div className="text-sm md:text-base font-semibold text-text-primary font-mono">
                            {stat.value}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
