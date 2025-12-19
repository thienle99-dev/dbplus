export type PlanHotspot = {
  nodeType?: string;
  relation?: string;
  index?: string;
  actualTotalTime?: number;
  actualRows?: number;
  planRows?: number;
  totalCost?: number;
};

export type ExplainInsights = {
  engine: 'postgres' | 'sqlite' | 'couchbase' | 'unknown';
  planningTimeMs?: number;
  executionTimeMs?: number;
  totalCost?: number;
  planRows?: number;
  actualRows?: number;
  actualTotalTimeMs?: number;
  nodeTypeCounts: Record<string, number>;
  hasSeqScan: boolean;
  hasIndexScan: boolean;
  hotspots: PlanHotspot[];
  buffers?: {
    sharedHit?: number;
    sharedRead?: number;
    sharedDirtied?: number;
    sharedWritten?: number;
    localHit?: number;
    localRead?: number;
    localDirtied?: number;
    localWritten?: number;
    tempRead?: number;
    tempWritten?: number;
  };
};

function num(v: any): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  return undefined;
}

function add(a?: number, b?: number) {
  return (a ?? 0) + (b ?? 0);
}

function isObject(v: any): v is Record<string, any> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function collectPostgresPlanNodes(planNode: any, out: any[] = []) {
  if (!isObject(planNode)) return out;
  out.push(planNode);
  const children = planNode.Plans;
  if (Array.isArray(children)) {
    for (const c of children) collectPostgresPlanNodes(c, out);
  }
  return out;
}

function detectEngine(plan: any): ExplainInsights['engine'] {
  if (Array.isArray(plan) && plan.length && isObject(plan[0]) && isObject(plan[0].Plan)) return 'postgres';
  if (Array.isArray(plan) && plan.length && isObject(plan[0]) && isObject(plan[0].plan)) return 'couchbase';
  if (Array.isArray(plan) && plan.length && isObject(plan[0]) && typeof plan[0].detail === 'string') return 'sqlite';
  if (typeof plan === 'string') return 'unknown';
  return 'unknown';
}

export function computeExplainInsights(plan: any): ExplainInsights {
  const engine = detectEngine(plan);
  const base: ExplainInsights = {
    engine,
    nodeTypeCounts: {},
    hasSeqScan: false,
    hasIndexScan: false,
    hotspots: [],
  };

  if (engine !== 'postgres') return base;
  const rootObj = plan?.[0];
  const rootPlan = rootObj?.Plan;
  const nodes = collectPostgresPlanNodes(rootPlan, []);

  const buffers: NonNullable<ExplainInsights['buffers']> = {};
  const hotspots: PlanHotspot[] = [];

  for (const n of nodes) {
    const nodeType = typeof n['Node Type'] === 'string' ? (n['Node Type'] as string) : undefined;
    if (nodeType) {
      base.nodeTypeCounts[nodeType] = (base.nodeTypeCounts[nodeType] ?? 0) + 1;
      if (nodeType.includes('Seq Scan')) base.hasSeqScan = true;
      if (nodeType.includes('Index Scan') || nodeType.includes('Index Only Scan') || nodeType.includes('Bitmap Index Scan')) {
        base.hasIndexScan = true;
      }
    }

    const buf = n.Buffers;
    if (isObject(buf)) {
      const shared = buf.Shared;
      const local = buf.Local;
      const temp = buf.Temp;
      if (isObject(shared)) {
        buffers.sharedHit = add(buffers.sharedHit, num(shared['Hit Blocks']));
        buffers.sharedRead = add(buffers.sharedRead, num(shared['Read Blocks']));
        buffers.sharedDirtied = add(buffers.sharedDirtied, num(shared['Dirtied Blocks']));
        buffers.sharedWritten = add(buffers.sharedWritten, num(shared['Written Blocks']));
      }
      if (isObject(local)) {
        buffers.localHit = add(buffers.localHit, num(local['Hit Blocks']));
        buffers.localRead = add(buffers.localRead, num(local['Read Blocks']));
        buffers.localDirtied = add(buffers.localDirtied, num(local['Dirtied Blocks']));
        buffers.localWritten = add(buffers.localWritten, num(local['Written Blocks']));
      }
      if (isObject(temp)) {
        buffers.tempRead = add(buffers.tempRead, num(temp['Read Blocks']));
        buffers.tempWritten = add(buffers.tempWritten, num(temp['Written Blocks']));
      }
    }

    hotspots.push({
      nodeType,
      relation: typeof n['Relation Name'] === 'string' ? n['Relation Name'] : undefined,
      index: typeof n['Index Name'] === 'string' ? n['Index Name'] : undefined,
      actualTotalTime: num(n['Actual Total Time']),
      actualRows: num(n['Actual Rows']),
      planRows: num(n['Plan Rows']),
      totalCost: num(n['Total Cost']),
    });
  }

  base.planningTimeMs = num(rootObj?.['Planning Time']);
  base.executionTimeMs = num(rootObj?.['Execution Time']);
  base.totalCost = num(rootPlan?.['Total Cost']);
  base.planRows = num(rootPlan?.['Plan Rows']);
  base.actualRows = num(rootPlan?.['Actual Rows']);
  base.actualTotalTimeMs = num(rootPlan?.['Actual Total Time']);

  // keep only meaningful hotspots
  base.hotspots = hotspots
    .filter((h) => (h.actualTotalTime ?? 0) > 0 || (h.totalCost ?? 0) > 0)
    .sort((a, b) => (b.actualTotalTime ?? b.totalCost ?? 0) - (a.actualTotalTime ?? a.totalCost ?? 0))
    .slice(0, 8);

  if (Object.keys(buffers).length) base.buffers = buffers;
  return base;
}

