import { useMemo } from 'react';
import { Link2, AlertCircle, Shield } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { ForeignKey, CheckConstraint, UniqueConstraint } from '../types';


interface ConstraintsSectionProps {
    foreignKeys: ForeignKey[];
    checkConstraints: CheckConstraint[];
    uniqueConstraints: UniqueConstraint[];
}

export default function ConstraintsSection({
    foreignKeys,
    checkConstraints,
    uniqueConstraints,
}: ConstraintsSectionProps) {
    const { connectionId } = useParams();
    const navigate = useNavigate();

    // Group foreign keys by constraint name
    const groupedForeignKeys = useMemo(() => {
        const groups = new Map<string, ForeignKey[]>();
        foreignKeys.forEach((fk) => {
            if (!groups.has(fk.constraint_name)) {
                groups.set(fk.constraint_name, []);
            }
            groups.get(fk.constraint_name)!.push(fk);
        });
        return Array.from(groups.entries());
    }, [foreignKeys]);

    const handleNavigateToTable = (schema: string, table: string) => {
        navigate(`/connections/${connectionId}/query?schema=${schema}&table=${table}`);
    };

    return (
        <div className="space-y-3 md:space-y-4">
            {/* Foreign Keys */}
            {groupedForeignKeys.length > 0 && (
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Link2 size={12} className="md:w-3.5 md:h-3.5 text-blue-500" />
                        <h5 className="text-[10px] md:text-xs font-medium text-text-secondary uppercase">
                            Foreign Keys ({groupedForeignKeys.length})
                        </h5>
                    </div>
                    <div className="space-y-2">
                        {groupedForeignKeys.map(([constraintName, fks]) => (
                            <div
                                key={constraintName}
                                className="bg-bg-1 border border-border rounded p-2 md:p-3"
                            >
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[10px] md:text-xs font-mono text-text-primary font-medium break-all">
                                            {constraintName}
                                        </div>
                                        <div className="text-[9px] md:text-[10px] text-text-secondary mt-1">
                                            {fks.map((fk, idx) => (
                                                <div key={idx} className="flex items-center gap-1 flex-wrap">
                                                    <span className="font-mono text-accent">{fk.column_name}</span>
                                                    <span>→</span>
                                                    <span className="font-mono">
                                                        {fk.foreign_schema}.{fk.foreign_table}({fk.foreign_column})
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleNavigateToTable(fks[0].foreign_schema, fks[0].foreign_table)}
                                        className="flex items-center gap-1 px-2 py-1 text-[9px] md:text-[10px] bg-accent hover:bg-blue-600 text-white rounded transition-colors whitespace-nowrap"
                                        title={`Go to ${fks[0].foreign_schema}.${fks[0].foreign_table}`}
                                    >
                                        <Link2 size={10} />
                                        Go to table
                                    </button>
                                </div>
                                <div className="flex gap-2 text-[9px] md:text-[10px]">
                                    <span className="px-1.5 py-0.5 bg-bg-2 text-text-secondary rounded">
                                        ON DELETE: {fks[0].delete_rule}
                                    </span>
                                    <span className="px-1.5 py-0.5 bg-bg-2 text-text-secondary rounded">
                                        ON UPDATE: {fks[0].update_rule}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Check Constraints */}
            {checkConstraints.length > 0 && (
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <AlertCircle size={12} className="md:w-3.5 md:h-3.5 text-orange-500" />
                        <h5 className="text-[10px] md:text-xs font-medium text-text-secondary uppercase">
                            Check Constraints ({checkConstraints.length})
                        </h5>
                    </div>
                    <div className="space-y-2">
                        {checkConstraints.map((check) => (
                            <div
                                key={check.constraint_name}
                                className="bg-bg-1 border border-border rounded p-2 md:p-3"
                            >
                                <div className="text-[10px] md:text-xs font-mono text-text-primary font-medium break-all mb-1">
                                    {check.constraint_name}
                                </div>
                                <div className="text-[9px] md:text-[10px] font-mono text-text-secondary bg-bg-0 p-1.5 rounded break-all">
                                    {check.check_clause}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Unique Constraints */}
            {uniqueConstraints.length > 0 && (
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Shield size={12} className="md:w-3.5 md:h-3.5 text-green-500" />
                        <h5 className="text-[10px] md:text-xs font-medium text-text-secondary uppercase">
                            Unique Constraints ({uniqueConstraints.length})
                        </h5>
                    </div>
                    <div className="space-y-2">
                        {uniqueConstraints.map((unique) => (
                            <div
                                key={unique.constraint_name}
                                className="bg-bg-1 border border-border rounded p-2 md:p-3"
                            >
                                <div className="text-[10px] md:text-xs font-mono text-text-primary font-medium break-all mb-1">
                                    {unique.constraint_name}
                                </div>
                                <div className="text-[9px] md:text-[10px] text-text-secondary">
                                    Columns: <span className="font-mono text-accent">{unique.columns.join(', ')}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Empty state */}
            {groupedForeignKeys.length === 0 && checkConstraints.length === 0 && uniqueConstraints.length === 0 && (
                <div className="text-center py-6 text-text-secondary text-xs">
                    No constraints found
                </div>
            )}
        </div>
    );
}
