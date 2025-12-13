import ReactJson from 'react-json-view';
import { useSettingsStore } from '../store/settingsStore';
import { computeExplainInsights } from '../utils/explainInsights';

interface ExecutionPlanViewProps {
    plan: any;
    loading?: boolean;
    error?: string | null;
}

export default function ExecutionPlanView({ plan, loading, error }: ExecutionPlanViewProps) {
    const { theme } = useSettingsStore();

    const isDark = theme === 'dark';

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full text-text-secondary">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mr-2"></div>
                Generating execution plan...
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 text-error">
                <h3 className="font-bold mb-2">Error generating plan</h3>
                <pre className="whitespace-pre-wrap font-mono text-sm bg-bg-2 p-2 rounded">
                    {error}
                </pre>
            </div>
        );
    }

    if (!plan) {
        return (
            <div className="flex items-center justify-center h-full text-text-secondary">
                No execution plan available. Run "Explain" to see the plan.
            </div>
        );
    }

    const insights = computeExplainInsights(plan);

    return (
        <div className="h-full overflow-auto p-4 bg-bg-1">
            {insights.engine === 'postgres' && (
                <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div className="p-3 rounded border border-border bg-bg-0">
                        <div className="text-[10px] uppercase tracking-wider text-text-secondary">Planning</div>
                        <div className="text-sm font-semibold text-text-primary">
                            {insights.planningTimeMs !== undefined ? `${insights.planningTimeMs.toFixed(2)} ms` : '—'}
                        </div>
                    </div>
                    <div className="p-3 rounded border border-border bg-bg-0">
                        <div className="text-[10px] uppercase tracking-wider text-text-secondary">Execution</div>
                        <div className="text-sm font-semibold text-text-primary">
                            {insights.executionTimeMs !== undefined ? `${insights.executionTimeMs.toFixed(2)} ms` : '—'}
                        </div>
                    </div>
                    <div className="p-3 rounded border border-border bg-bg-0">
                        <div className="text-[10px] uppercase tracking-wider text-text-secondary">Rows</div>
                        <div className="text-sm font-semibold text-text-primary">
                            {insights.actualRows !== undefined ? `${insights.actualRows}` : insights.planRows !== undefined ? `${insights.planRows} (est)` : '—'}
                        </div>
                    </div>
                    <div className="p-3 rounded border border-border bg-bg-0">
                        <div className="text-[10px] uppercase tracking-wider text-text-secondary">Index / Seq Scan</div>
                        <div className="text-sm font-semibold text-text-primary">
                            {insights.hasIndexScan ? 'Index' : 'No index'} / {insights.hasSeqScan ? 'Seq' : 'No seq'}
                        </div>
                    </div>
                    {insights.buffers && (
                        <div className="col-span-2 md:col-span-4 p-3 rounded border border-border bg-bg-0">
                            <div className="text-[10px] uppercase tracking-wider text-text-secondary mb-1">Buffers</div>
                            <div className="text-xs text-text-secondary flex flex-wrap gap-x-4 gap-y-1">
                                {insights.buffers.sharedHit !== undefined && <span>{`shared hit: ${insights.buffers.sharedHit}`}</span>}
                                {insights.buffers.sharedRead !== undefined && <span>{`shared read: ${insights.buffers.sharedRead}`}</span>}
                                {insights.buffers.sharedDirtied !== undefined && <span>{`shared dirtied: ${insights.buffers.sharedDirtied}`}</span>}
                                {insights.buffers.sharedWritten !== undefined && <span>{`shared written: ${insights.buffers.sharedWritten}`}</span>}
                                {insights.buffers.tempRead !== undefined && <span>{`temp read: ${insights.buffers.tempRead}`}</span>}
                                {insights.buffers.tempWritten !== undefined && <span>{`temp written: ${insights.buffers.tempWritten}`}</span>}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {insights.engine === 'postgres' && insights.hotspots.length > 0 && (
                <div className="mb-4">
                    <div className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Hotspots</div>
                    <div className="grid gap-2">
                        {insights.hotspots.map((h, idx) => (
                            <div key={idx} className="p-3 rounded border border-border bg-bg-0">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="text-sm font-medium text-text-primary truncate">
                                            {h.nodeType || 'Node'}
                                            {h.relation ? ` • ${h.relation}` : ''}
                                            {h.index ? ` • ${h.index}` : ''}
                                        </div>
                                        <div className="text-xs text-text-secondary">
                                            {h.actualRows !== undefined ? `rows: ${h.actualRows}` : h.planRows !== undefined ? `rows est: ${h.planRows}` : ''}
                                        </div>
                                    </div>
                                    <div className="text-xs font-mono text-text-secondary flex-shrink-0">
                                        {h.actualTotalTime !== undefined ? `${h.actualTotalTime.toFixed(2)} ms` : h.totalCost !== undefined ? `cost: ${h.totalCost}` : ''}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="text-sm font-mono">
                {/* If plan is simple text/string, display as pre */}
                {typeof plan === 'string' ? (
                    <pre className="whitespace-pre-wrap">{plan}</pre>
                ) : (
                    /* Use ReactJson for structured JSON plans (Postgres) */
                    <ReactJson
                        src={plan}
                        theme={isDark ? 'monokai' : 'rjv-default'}
                        style={{ backgroundColor: 'transparent' }}
                        name={false}
                        displayDataTypes={false}
                        enableClipboard={true}
                        collapsed={2}
                    />
                )}
            </div>
        </div>
    );
}
