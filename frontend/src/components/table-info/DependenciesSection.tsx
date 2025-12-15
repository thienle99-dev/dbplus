import { Link2, Code2, Eye } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import type { TableDependencies } from '../../types';

interface DependenciesSectionProps {
    dependencies: TableDependencies | null;
    loading?: boolean;
    error?: string | null;
}

export default function DependenciesSection({ dependencies, loading, error }: DependenciesSectionProps) {
    const { connectionId } = useParams();
    const navigate = useNavigate();

    const openRelation = (schema: string, table: string) => {
        navigate(`/connections/${connectionId}/query?schema=${schema}&table=${table}`);
    };

    if (error) {
        return (
            <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded p-3">
                {error}
            </div>
        );
    }

    if (!dependencies) {
        return <div className="text-xs text-text-secondary">{loading ? 'Loading…' : 'No data.'}</div>;
    }

    const isEmpty =
        dependencies.views.length === 0 &&
        dependencies.routines.length === 0 &&
        dependencies.referencing_foreign_keys.length === 0;

    return (
        <div className="space-y-3 md:space-y-4">
            {dependencies.referencing_foreign_keys.length > 0 && (
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Link2 size={12} className="md:w-3.5 md:h-3.5 text-blue-500" />
                        <h5 className="text-[10px] md:text-xs font-medium text-text-secondary uppercase">
                            Referencing Tables ({dependencies.referencing_foreign_keys.length})
                        </h5>
                    </div>
                    <div className="space-y-2">
                        {dependencies.referencing_foreign_keys.map((fk) => (
                            <div key={`${fk.schema}.${fk.table}.${fk.constraint_name}`} className="bg-bg-1 border border-border rounded p-2 md:p-3">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[10px] md:text-xs font-mono text-text-primary font-medium break-all">
                                            {fk.schema}.{fk.table}
                                        </div>
                                        <div className="text-[9px] md:text-[10px] text-text-secondary mt-1">
                                            <div className="font-mono break-all">{fk.constraint_name}</div>
                                            <div className="mt-1">
                                                <span className="font-mono text-accent">{fk.columns.join(', ')}</span>
                                                <span> → </span>
                                                <span className="font-mono">{fk.referenced_columns.join(', ')}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => openRelation(fk.schema, fk.table)}
                                        className="flex items-center gap-1 px-2 py-1 text-[9px] md:text-[10px] bg-accent hover:bg-blue-600 text-white rounded transition-colors whitespace-nowrap"
                                        title={`Go to ${fk.schema}.${fk.table}`}
                                    >
                                        <Link2 size={10} />
                                        Go to table
                                    </button>
                                </div>
                                <div className="flex gap-2 text-[9px] md:text-[10px]">
                                    <span className="px-1.5 py-0.5 bg-bg-2 text-text-secondary rounded">
                                        ON DELETE: {fk.on_delete}
                                    </span>
                                    <span className="px-1.5 py-0.5 bg-bg-2 text-text-secondary rounded">
                                        ON UPDATE: {fk.on_update}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {dependencies.views.length > 0 && (
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Eye size={12} className="md:w-3.5 md:h-3.5 text-purple-500" />
                        <h5 className="text-[10px] md:text-xs font-medium text-text-secondary uppercase">
                            Views ({dependencies.views.length})
                        </h5>
                    </div>
                    <div className="space-y-2">
                        {dependencies.views.map((v) => (
                            <div key={`${v.schema}.${v.name}.${v.kind}`} className="bg-bg-1 border border-border rounded p-2 md:p-3">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="min-w-0">
                                        <div className="text-[10px] md:text-xs font-mono text-text-primary font-medium break-all">
                                            {v.schema}.{v.name}
                                        </div>
                                        <div className="text-[9px] md:text-[10px] text-text-secondary mt-1">
                                            {v.kind}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => openRelation(v.schema, v.name)}
                                        className="flex items-center gap-1 px-2 py-1 text-[9px] md:text-[10px] bg-bg-2 hover:bg-bg-3 text-text-secondary hover:text-text-primary rounded border border-border whitespace-nowrap"
                                        title={`Open ${v.schema}.${v.name}`}
                                    >
                                        <Link2 size={10} />
                                        Open
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {dependencies.routines.length > 0 && (
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Code2 size={12} className="md:w-3.5 md:h-3.5 text-green-500" />
                        <h5 className="text-[10px] md:text-xs font-medium text-text-secondary uppercase">
                            Routines ({dependencies.routines.length})
                        </h5>
                    </div>
                    <div className="space-y-2">
                        {dependencies.routines.map((fn) => {
                            const signature = `${fn.schema}.${fn.name}(${fn.arguments})`;
                            return (
                                <div key={`${fn.schema}.${fn.name}.${fn.arguments}.${fn.kind}`} className="bg-bg-1 border border-border rounded p-2 md:p-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <div className="text-[10px] md:text-xs font-mono text-text-primary font-medium break-all">
                                                {signature}
                                            </div>
                                            <div className="text-[9px] md:text-[10px] text-text-secondary mt-1">{fn.kind}</div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                try {
                                                    await navigator.clipboard.writeText(signature);
                                                } catch {
                                                    // ignore
                                                }
                                            }}
                                            className="flex items-center gap-1 px-2 py-1 text-[9px] md:text-[10px] bg-bg-2 hover:bg-bg-3 text-text-secondary hover:text-text-primary rounded border border-border whitespace-nowrap"
                                            title="Copy signature"
                                        >
                                            Copy
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {isEmpty && <div className="text-center py-6 text-text-secondary text-xs">No dependencies found</div>}
        </div>
    );
}

