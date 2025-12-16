import { useForeignKeys } from '../hooks/useDatabase';

interface ForeignKeysTestProps {
    connectionId: string;
    schema: string;
}

export default function ForeignKeysTest({ connectionId, schema }: ForeignKeysTestProps) {
    const { data: foreignKeys = [], isLoading, error } = useForeignKeys(connectionId, schema);

    if (isLoading) return <div>Loading foreign keys...</div>;
    if (error) return <div>Error: {String(error)}</div>;

    return (
        <div className="p-4">
            <h2 className="text-lg font-bold mb-4">Foreign Keys in {schema}</h2>
            {foreignKeys.length === 0 ? (
                <p className="text-text-tertiary">No foreign keys found</p>
            ) : (
                <div className="space-y-2">
                    {foreignKeys.map((fk, idx) => (
                        <div key={idx} className="p-3 bg-bg-2 border border-border rounded">
                            <div className="font-semibold text-sm">
                                {fk.tableName}.{fk.columnName}
                            </div>
                            <div className="text-xs text-text-secondary mt-1">
                                → {fk.referencedTableName}.{fk.referencedColumnName}
                            </div>
                            <div className="text-xs text-text-tertiary mt-1">
                                ON DELETE {fk.onDelete} | ON UPDATE {fk.onUpdate}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
