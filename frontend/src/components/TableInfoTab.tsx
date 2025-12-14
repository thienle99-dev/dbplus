import { useParams } from 'react-router-dom';
import { Info, Database } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import ConstraintsSection from './ConstraintsSection';
import TableStatistics from './TableStatistics';
import ColumnsDetailsTable from './ColumnsDetailsTable';
import SqlDefinitionView from './table-info/SqlDefinitionView';
import IndexesSection from './table-info/IndexesSection';
import TableMetadata from './table-info/TableMetadata';
import TriggersSection from './table-info/TriggersSection';
import { generateSqlDefinition } from '../utils/sqlGenerator';
import {
    TableInfoTabProps
} from '../types';
import {
    useColumns,
    useIndexes,
    useConstraints,
    useTableStats,
    useTriggers
} from '../hooks/useDatabase';

export default function TableInfoTab({ schema: schemaProp, table: tableProp }: TableInfoTabProps) {
    const params = useParams();
    const schema = schemaProp || params.schema;
    const table = tableProp || params.table;
    const connectionId = params.connectionId;
    const { showToast } = useToast();

    // Data Fetching Hooks
    const columnsQuery = useColumns(connectionId, schema, table);
    const indexesQuery = useIndexes(connectionId, schema, table);
    const constraintsQuery = useConstraints(connectionId, schema, table);
    const statsQuery = useTableStats(connectionId, schema, table);
    const triggersQuery = useTriggers(connectionId, schema, table);

    const isLoading =
        columnsQuery.isLoading ||
        indexesQuery.isLoading ||
        constraintsQuery.isLoading ||
        statsQuery.isLoading ||
        triggersQuery.isLoading;

    const columns = columnsQuery.data || [];
    const indexes = indexesQuery.data || [];
    const constraints = constraintsQuery.data || null;
    const statistics = statsQuery.data || null;
    const triggers = triggersQuery.data || [];

    const sqlDefinition = generateSqlDefinition(schema || '', table || '', columns, indexes, constraints);

    const handleIndexCreated = () => {
        indexesQuery.refetch();
    };

    const handleRefreshAll = () => {
        columnsQuery.refetch();
        indexesQuery.refetch();
        constraintsQuery.refetch();
        statsQuery.refetch();
        triggersQuery.refetch();
    };

    if (isLoading && !columns.length) { // Show loading only if no data at all
        return <div className="p-8 text-text-secondary">Loading table info...</div>;
    }

    if (!schema || !table) {
        return <div className="p-8 text-text-secondary">Select a table to view info</div>;
    }

    return (
        <div className="flex flex-col h-full overflow-auto">
            <div className="p-3 md:p-4 border-b border-border bg-bg-1">
                <h3 className="text-xs md:text-sm font-medium text-text-primary flex items-center gap-2">
                    <Info size={14} className="md:w-4 md:h-4" />
                    <span className="truncate">Table Information: {schema}.{table}</span>
                </h3>
            </div>

            <div className="flex-1 p-3 md:p-4 space-y-3 md:space-y-4">
                <SqlDefinitionView
                    schema={schema || ''}
                    table={table || ''}
                    columns={columns}
                    indexes={indexes}
                    constraints={constraints}
                    sqlDefinition={sqlDefinition}
                />

                <IndexesSection
                    schema={schema || ''}
                    table={table || ''}
                    columns={columns}
                    indexes={indexes}
                    onIndexCreated={handleIndexCreated}
                />

                {/* Columns Details */}
                {columns.length > 0 && constraints && (
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Database size={12} className="md:w-3.5 md:h-3.5 text-text-secondary" />
                            <h4 className="text-[10px] md:text-xs font-medium text-text-secondary uppercase">
                                Columns ({columns.length})
                            </h4>
                        </div>
                        <ColumnsDetailsTable
                            columns={columns}
                            foreignKeys={constraints.foreign_keys}
                            indexes={indexes}
                            onRefresh={handleRefreshAll}
                        />
                    </div>
                )}

                {/* Constraints */}
                {constraints && (
                    <div>
                        <ConstraintsSection
                            foreignKeys={constraints.foreign_keys}
                            checkConstraints={constraints.check_constraints}
                            uniqueConstraints={constraints.unique_constraints}
                        />
                    </div>
                )}

                {/* Table Statistics */}
                {statistics && (
                    <div>
                        <TableStatistics
                            statistics={statistics}
                            onRefresh={async () => {
                                await statsQuery.refetch();
                                showToast('Statistics refreshed', 'success');
                            }}
                            loading={statsQuery.isFetching}
                        />
                    </div>
                )}

                <TriggersSection triggers={triggers} loading={triggersQuery.isFetching} />

                <TableMetadata schema={schema || ''} table={table || ''} />
            </div>
        </div>
    );
}
