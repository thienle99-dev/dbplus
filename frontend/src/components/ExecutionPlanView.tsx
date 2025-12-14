import ReactJson from 'react-json-view';
import { useEffect, useMemo, useState } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import { computeExplainInsights } from '../utils/explainInsights';

interface ExecutionPlanViewProps {
    plan: any;
    loading?: boolean;
    error?: string | null;
}

function isObject(v: any): v is Record<string, any> {
    return !!v && typeof v === 'object' && !Array.isArray(v);
}

type PgPlanNode = Record<string, any> & { Plans?: PgPlanNode[] };

function getPostgresRootPlan(plan: any): PgPlanNode | null {
    const rootObj = Array.isArray(plan) ? plan?.[0] : null;
    const rootPlan = rootObj?.Plan;
    return isObject(rootPlan) ? (rootPlan as PgPlanNode) : null;
}

function collectExpandedPaths(root: PgPlanNode, maxDepth: number): Set<string> {
    const expanded = new Set<string>();
    const walk = (node: PgPlanNode, path: string, depth: number) => {
        expanded.add(path);
        if (depth >= maxDepth) return;
        const children = Array.isArray(node.Plans) ? node.Plans : [];
        for (let i = 0; i < children.length; i++) {
            walk(children[i], `${path}.${i}`, depth + 1);
        }
    };
    walk(root, '0', 0);
    return expanded;
}

function pgNodeLabel(n: PgPlanNode) {
    const nodeType = typeof n['Node Type'] === 'string' ? n['Node Type'] : 'Node';
    const relation = typeof n['Relation Name'] === 'string' ? n['Relation Name'] : undefined;
    const index = typeof n['Index Name'] === 'string' ? n['Index Name'] : undefined;
    return { nodeType, relation, index };
}

function num(v: any): number | undefined {
    return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

function PgPlanNodeRow({
    node,
    path,
    depth,
    expanded,
    isExpanded,
    onToggle,
    isHotspotNode,
}: {
    node: PgPlanNode;
    path: string;
    depth: number;
    expanded: boolean;
    isExpanded: (path: string) => boolean;
    onToggle: (path: string) => void;
    isHotspotNode: (node: PgPlanNode) => boolean;
}) {
    const children = Array.isArray(node.Plans) ? node.Plans : [];
    const hasChildren = children.length > 0;
    const { nodeType, relation, index } = pgNodeLabel(node);

    const highlight = isHotspotNode(node);

    const actualRows = num(node['Actual Rows']);
    const planRows = num(node['Plan Rows']);
    const actualTime = num(node['Actual Total Time']);
    const totalCost = num(node['Total Cost']);

    const extraKeys: Array<[string, string]> = [];
    const add = (label: string, key: string) => {
        const v = node[key];
        if (typeof v === 'string' && v.trim()) extraKeys.push([label, v]);
    };
    add('Filter', 'Filter');
    add('Index Cond', 'Index Cond');
    add('Recheck Cond', 'Recheck Cond');
    add('Hash Cond', 'Hash Cond');
    add('Join Filter', 'Join Filter');
    add('Sort Key', 'Sort Key');
    add('Group Key', 'Group Key');

    return (
        <div className="select-text">
            <div
                className={`flex items-start gap-2 rounded border border-border bg-bg-0 px-2 py-1.5 ${highlight ? 'ring-1 ring-yellow-500/60' : ''
                    }`}
                style={{ marginLeft: depth * 12 }}
            >
                <button
                    type="button"
                    onClick={() => hasChildren && onToggle(path)}
                    className={`mt-0.5 h-5 w-5 flex items-center justify-center rounded hover:bg-bg-2 ${hasChildren ? 'text-text-secondary' : 'text-border cursor-default'
                        }`}
                    aria-label={hasChildren ? (expanded ? 'Collapse node' : 'Expand node') : 'No children'}
                >
                    {hasChildren ? (expanded ? '▾' : '▸') : '·'}
                </button>

                <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                            <div className="text-sm font-medium text-text-primary truncate">
                                {nodeType}
                                {relation ? ` • ${relation}` : ''}
                                {index ? ` • ${index}` : ''}
                            </div>
                            <div className="text-xs text-text-secondary">
                                {actualRows !== undefined
                                    ? `rows: ${actualRows}`
                                    : planRows !== undefined
                                        ? `rows est: ${planRows}`
                                        : ''}
                            </div>
                        </div>
                        <div className="text-xs font-mono text-text-secondary flex-shrink-0 text-right">
                            {actualTime !== undefined ? `${actualTime.toFixed(2)} ms` : totalCost !== undefined ? `cost: ${totalCost}` : '—'}
                        </div>
                    </div>

                    {extraKeys.length > 0 && (
                        <div className="mt-1 space-y-0.5">
                            {extraKeys.slice(0, 3).map(([k, v]) => (
                                <div key={k} className="text-[11px] text-text-secondary">
                                    <span className="font-semibold">{k}:</span>{' '}
                                    <span className="font-mono break-words">{v}</span>
                                </div>
                            ))}
                            {extraKeys.length > 3 && (
                                <div className="text-[11px] text-text-secondary">
                                    +{extraKeys.length - 3} more…
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {hasChildren && expanded && (
                <div className="mt-1 space-y-1">
                    {children.map((c, i) => (
                        <PgPlanNodeRow
                            key={`${path}.${i}`}
                            node={c}
                            path={`${path}.${i}`}
                            depth={depth + 1}
                            expanded={isExpanded(`${path}.${i}`)}
                            isExpanded={isExpanded}
                            onToggle={onToggle}
                            isHotspotNode={isHotspotNode}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default function ExecutionPlanView({ plan, loading, error }: ExecutionPlanViewProps) {
    const { theme } = useSettingsStore();
    const [viewMode, setViewMode] = useState<'tree' | 'json'>('tree');
    const [expandedPaths, setExpandedPaths] = useState<Set<string>>(() => new Set<string>());

    const isDark = theme === 'dark';

    const insights = useMemo(() => (plan ? computeExplainInsights(plan) : null), [plan]);
    const engine = insights?.engine;
    const pgRoot = useMemo(
        () => (engine === 'postgres' ? getPostgresRootPlan(plan) : null),
        [engine, plan],
    );

    const pgRootKey = useMemo(() => {
        if (!pgRoot) return `${engine ?? 'unknown'}:none`;
        const nodeType = typeof pgRoot['Node Type'] === 'string' ? pgRoot['Node Type'] : '';
        const relation = typeof pgRoot['Relation Name'] === 'string' ? pgRoot['Relation Name'] : '';
        return `${engine ?? 'unknown'}:${nodeType}:${relation}:${Array.isArray(pgRoot.Plans) ? pgRoot.Plans.length : 0}`;
    }, [engine, pgRoot]);

    useEffect(() => {
        if (!pgRoot) {
            setExpandedPaths(new Set<string>());
            return;
        }
        setExpandedPaths(collectExpandedPaths(pgRoot, 2));
    }, [pgRootKey, pgRoot]);

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

    const isHotspotNode = useMemo(() => {
        if (engine !== 'postgres' || !insights) return () => false;
        const sigs = new Set(
            insights.hotspots.map((h) => `${h.nodeType ?? ''}|${h.relation ?? ''}|${h.index ?? ''}`),
        );
        return (node: PgPlanNode) => {
            const { nodeType, relation, index } = pgNodeLabel(node);
            return sigs.has(`${nodeType}|${relation ?? ''}|${index ?? ''}`);
        };
    }, [engine, insights]);

    return (
        <div className="h-full overflow-auto p-4 bg-bg-1">
            {engine === 'postgres' && insights && (
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

            {engine === 'postgres' && (
                <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                        Plan Tree
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => pgRoot && setExpandedPaths(collectExpandedPaths(pgRoot, 10))}
                            className="px-2 py-1 rounded border text-xs bg-bg-0 border-border text-text-secondary hover:text-text-primary hover:bg-bg-2"
                            disabled={!pgRoot}
                        >
                            Expand all
                        </button>
                        <button
                            type="button"
                            onClick={() => setExpandedPaths(new Set(['0']))}
                            className="px-2 py-1 rounded border text-xs bg-bg-0 border-border text-text-secondary hover:text-text-primary hover:bg-bg-2"
                            disabled={!pgRoot}
                        >
                            Collapse all
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('tree')}
                            className={`px-2 py-1 rounded border text-xs ${viewMode === 'tree'
                                    ? 'bg-bg-2 border-accent text-text-primary'
                                    : 'bg-bg-0 border-border text-text-secondary hover:text-text-primary hover:bg-bg-2'
                                }`}
                        >
                            Tree
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('json')}
                            className={`px-2 py-1 rounded border text-xs ${viewMode === 'json'
                                    ? 'bg-bg-2 border-accent text-text-primary'
                                    : 'bg-bg-0 border-border text-text-secondary hover:text-text-primary hover:bg-bg-2'
                                }`}
                        >
                            JSON
                        </button>
                    </div>
                </div>
            )}

            {engine === 'postgres' && viewMode === 'tree' && pgRoot && (
                <div className="mb-6 space-y-1">
                    <PgPlanNodeRow
                        node={pgRoot}
                        path="0"
                        depth={0}
                        expanded={expandedPaths.has('0')}
                        isExpanded={(path) => expandedPaths.has(path)}
                        onToggle={(path) => {
                            setExpandedPaths((prev) => {
                                const next = new Set(prev);
                                if (next.has(path)) next.delete(path);
                                else next.add(path);
                                return next;
                            });
                        }}
                        isHotspotNode={isHotspotNode}
                    />
                </div>
            )}

            {engine === 'postgres' && insights && insights.hotspots.length > 0 && (
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

            {(engine !== 'postgres' || viewMode === 'json') && (
                <div className="text-sm font-mono">
                    {typeof plan === 'string' ? (
                        <pre className="whitespace-pre-wrap">{plan}</pre>
                    ) : (
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
            )}
        </div>
    );
}
