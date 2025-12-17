import { ChevronRight, Plus, Minus, AlertTriangle } from 'lucide-react';

interface DiffViewerProps {
    diffResult: any;
}

export default function DiffViewer({ diffResult }: DiffViewerProps) {
    if (!diffResult || !diffResult.diffs) {
        return null;
    }

    const { diffs, stats } = diffResult;

    return (
        <div className="space-y-4">
            {/* Stats Summary */}
            <div className="grid grid-cols-4 gap-3">
                <StatCard
                    label="Tables Added"
                    value={stats.tables_added || 0}
                    color="green"
                />
                <StatCard
                    label="Tables Dropped"
                    value={stats.tables_dropped || 0}
                    color="red"
                />
                <StatCard
                    label="Columns Added"
                    value={stats.columns_added || 0}
                    color="green"
                />
                <StatCard
                    label="Columns Dropped"
                    value={stats.columns_dropped || 0}
                    color="red"
                />
            </div>

            {/* Diff List */}
            <div className="space-y-2">
                {diffs.map((diff: any, idx: number) => (
                    <DiffItem key={idx} diff={diff} />
                ))}
            </div>
        </div>
    );
}

function StatCard({ label, value, color }: { label: string; value: number; color: 'green' | 'red' | 'yellow' }) {
    const colorClasses = {
        green: 'text-green-500 bg-green-500/10 border-green-500/20',
        red: 'text-red-500 bg-red-500/10 border-red-500/20',
        yellow: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20',
    };

    return (
        <div className={`p-3 rounded-lg border ${colorClasses[color]}`}>
            <div className={`text-2xl font-bold ${colorClasses[color].split(' ')[0]}`}>
                {value}
            </div>
            <div className="text-xs text-text-tertiary mt-1">{label}</div>
        </div>
    );
}

function DiffItem({ diff }: { diff: any }) {
    const { type } = diff;

    if (type === 'TableAdded') {
        return (
            <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3">
                <div className="flex items-center gap-2 text-sm font-medium text-green-500 mb-2">
                    <Plus size={16} />
                    <span>Table Added: {diff.table.name}</span>
                </div>
                <div className="pl-6 space-y-1">
                    {diff.table.columns.map((col: any, idx: number) => (
                        <div key={idx} className="text-xs text-text-secondary">
                            + {col.name} ({col.data_type})
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (type === 'TableDropped') {
        return (
            <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                <div className="flex items-center gap-2 text-sm font-medium text-red-500">
                    <Minus size={16} />
                    <AlertTriangle size={14} />
                    <span>Table Dropped: {diff.table_name}</span>
                    <span className="text-xs">(Destructive)</span>
                </div>
            </div>
        );
    }

    if (type === 'TableModified') {
        return (
            <div className="bg-bg-1 border border-border rounded-lg p-3">
                <div className="flex items-center gap-2 text-sm font-medium text-text-primary mb-2">
                    <ChevronRight size={16} />
                    <span>Table Modified: {diff.table_name}</span>
                </div>
                <div className="pl-6 space-y-1">
                    {diff.changes.map((change: any, idx: number) => (
                        <ChangeItem key={idx} change={change} />
                    ))}
                </div>
            </div>
        );
    }

    return null;
}

function ChangeItem({ change }: { change: any }) {
    const { type } = change;

    if (type === 'ColumnAdded') {
        return (
            <div className="flex items-center gap-2 text-xs text-green-500">
                <Plus size={12} />
                <span>
                    {change.column.name} ({change.column.data_type})
                    {!change.column.is_nullable && ' NOT NULL'}
                </span>
            </div>
        );
    }

    if (type === 'ColumnDropped') {
        return (
            <div className="flex items-center gap-2 text-xs text-red-500">
                <Minus size={12} />
                <AlertTriangle size={10} />
                <span>{change.column_name} (Destructive)</span>
            </div>
        );
    }

    if (type === 'ColumnModified') {
        return (
            <div className="text-xs text-yellow-500">
                <div className="flex items-center gap-2">
                    <AlertTriangle size={12} />
                    <span>Modified: {change.column_name}</span>
                </div>
                <div className="pl-5 mt-1 space-y-0.5 text-text-tertiary">
                    {change.changes.map((c: any, idx: number) => (
                        <div key={idx}>
                            {c.type === 'DataTypeChanged' && (
                                <span>Type: {c.old} → {c.new}</span>
                            )}
                            {c.type === 'NullabilityChanged' && (
                                <span>Nullable: {c.old ? 'YES' : 'NO'} → {c.new ? 'YES' : 'NO'}</span>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return null;
}
