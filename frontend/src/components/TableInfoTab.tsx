import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { Info, Database } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import ConstraintsSection from './ConstraintsSection';
import TableStatistics from './TableStatistics';
import ColumnsDetailsTable from './ColumnsDetailsTable';
import SqlDefinitionView from './table-info/SqlDefinitionView';
import IndexesSection from './table-info/IndexesSection';
import TableMetadata from './table-info/TableMetadata';
import { generateSqlDefinition } from '../utils/sqlGenerator';
import {
    TableColumn,
    IndexInfo,
    TableConstraints,
    TableStats,
    TableInfoTabProps
} from '../types';


export default function TableInfoTab({ schema: schemaProp, table: tableProp }: TableInfoTabProps) {
    const params = useParams();
    const schema = schemaProp || params.schema;
    const table = tableProp || params.table;
    const connectionId = params.connectionId;
    const [indexes, setIndexes] = useState<IndexInfo[]>([]);
    const [columns, setColumns] = useState<TableColumn[]>([]);
    const [loading, setLoading] = useState(false);
    const [constraints, setConstraints] = useState<TableConstraints | null>(null);
    const [statistics, setStatistics] = useState<TableStats | null>(null);
    const [loadingStatistics, setLoadingStatistics] = useState(false);
    const { showToast } = useToast();

    const fetchIndexes = async () => {
        try {
            const response = await api.get(
                `/api/connections/${connectionId}/indexes?schema=${schema}&table=${table}`
            );
            setIndexes(response.data);
        } catch (err) {
            console.error('Failed to fetch indexes:', err);
            setIndexes([]);
        }
    };

    const fetchConstraints = async () => {
        try {
            const response = await api.get(
                `/api/connections/${connectionId}/constraints?schema=${schema}&table=${table}`
            );
            setConstraints(response.data);
        } catch (err) {
            console.error('Failed to fetch constraints:', err);
            setConstraints({ foreign_keys: [], check_constraints: [], unique_constraints: [] });
        }
    };

    const fetchStatistics = async () => {
        setLoadingStatistics(true);
        try {
            const response = await api.get(
                `/api/connections/${connectionId}/table-stats?schema=${schema}&table=${table}`
            );
            console.log('[DEBUG] Table stats response:', response.data);
            console.log('[DEBUG] row_count value:', response.data.row_count, 'type:', typeof response.data.row_count);
            setStatistics(response.data);
        } catch (err) {
            console.error('Failed to fetch statistics:', err);
            setStatistics({
                row_count: null,
                table_size: null,
                index_size: null,
                total_size: null,
                created_at: null,
                last_modified: null,
            });
        } finally {
            setLoadingStatistics(false);
        }
    };

    const fetchTableInfo = async () => {
        setLoading(true);
        try {
            // Fetch columns for SQL definition
            const response = await api.get(
                `/api/connections/${connectionId}/columns?schema=${schema}&table=${table}`
            );

            const fetchedColumns = response.data;
            setColumns(fetchedColumns);

            // Fetch indexes from backend (replaced client-side inference)
            fetchIndexes();

            // Fetch constraints
            fetchConstraints();

            // Fetch statistics
            fetchStatistics();
        } catch (err) {
            console.error('Failed to fetch table info:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!connectionId || !schema || !table) return;
        fetchTableInfo();
    }, [connectionId, schema, table]);

    const sqlDefinition = generateSqlDefinition(schema || '', table || '', columns, indexes, constraints);


    const handleIndexCreated = (newIndex: IndexInfo) => {
        setIndexes([...indexes, newIndex]);
        fetchIndexes();
    };

    if (loading) {
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
                            onRefresh={fetchTableInfo}
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
                                setLoadingStatistics(true);
                                try {
                                    const response = await api.get(
                                        `/api/connections/${connectionId}/table-stats?schema=${schema}&table=${table}`
                                    );
                                    setStatistics(response.data);
                                    showToast('Statistics refreshed', 'success');
                                } catch (err) {
                                    console.error('Failed to refresh statistics:', err);
                                    showToast('Failed to refresh statistics', 'error');
                                } finally {
                                    setLoadingStatistics(false);
                                }
                            }}
                            loading={loadingStatistics}
                        />
                    </div>
                )}

                <TableMetadata schema={schema || ''} table={table || ''} />
            </div>
        </div>
    );
}
