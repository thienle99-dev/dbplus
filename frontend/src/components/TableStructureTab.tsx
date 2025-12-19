import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { Database } from 'lucide-react';
import { TableColumn, TableStructureTabProps } from '../types';

interface ExtendedTableStructureTabProps extends TableStructureTabProps {
    isCouchbase?: boolean;
}

export default function TableStructureTab({ schema: schemaProp, table: tableProp, isCouchbase = false, database }: ExtendedTableStructureTabProps) {
    const params = useParams();
    const schema = schemaProp || params.schema;
    const table = tableProp || params.table;
    const connectionId = params.connectionId;
    const [columns, setColumns] = useState<TableColumn[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!connectionId || !schema || !table) return;

        const fetchColumns = async () => {
            setLoading(true);
            try {
                const config = database ? { headers: { 'x-dbplus-database': database } } : {};
                const response = await api.get(
                    `/api/connections/${connectionId}/columns?schema=${schema}&table=${table}`,
                    config
                );
                setColumns(response.data);
            } catch (err) {
                console.error('Failed to fetch columns:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchColumns();
    }, [connectionId, schema, table, database]);

    if (loading) {
        return <div className="p-8 text-text-secondary">Loading structure...</div>;
    }

    if (!schema || !table) {
        return <div className="p-8 text-text-secondary">Select a table to view structure</div>;
    }

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b border-border bg-bg-1">
                <h3 className="text-sm font-medium text-text-primary flex items-center gap-2">
                    <Database size={16} />
                    {isCouchbase ? 'Collection' : 'Table'} Structure: {schema}.{table}
                </h3>
            </div>

            <div className="flex-1 overflow-auto">
                <table className="w-full border-collapse text-sm">
                    <thead className="bg-bg-1 sticky top-0 z-10">
                        <tr>
                            <th className="border-b border-r border-border px-4 py-2 text-left font-medium text-text-secondary w-8">#</th>
                            <th className="border-b border-r border-border px-4 py-2 text-left font-medium text-text-secondary">{isCouchbase ? 'Field Name' : 'Column Name'}</th>
                            <th className="border-b border-r border-border px-4 py-2 text-left font-medium text-text-secondary">Data Type</th>
                            <th className="border-b border-r border-border px-4 py-2 text-left font-medium text-text-secondary">Nullable</th>
                            <th className="border-b border-r border-border px-4 py-2 text-left font-medium text-text-secondary">Default</th>
                            <th className="border-b border-r border-border px-4 py-2 text-left font-medium text-text-secondary">Key</th>
                        </tr>
                    </thead>
                    <tbody>
                        {columns.map((col, index) => (
                            <tr key={col.name} className="hover:bg-bg-1/50">
                                <td className="border-b border-r border-border px-4 py-2 text-text-secondary">{index + 1}</td>
                                <td className="border-b border-r border-border px-4 py-2 text-text-primary font-medium">{col.name}</td>
                                <td className="border-b border-r border-border px-4 py-2 text-text-primary">{col.data_type}</td>
                                <td className="border-b border-r border-border px-4 py-2 text-text-primary">
                                    {col.is_nullable ? (
                                        <span className="text-green-500">YES</span>
                                    ) : (
                                        <span className="text-red-500">NO</span>
                                    )}
                                </td>
                                <td className="border-b border-r border-border px-4 py-2 text-text-secondary">
                                    {col.default_value || <span className="italic">NULL</span>}
                                </td>
                                <td className="border-b border-r border-border px-4 py-2">
                                    {(col.is_primary_key || (isCouchbase && col.name === 'id')) && (
                                        <span title="Primary Key" className="text-yellow-500 text-sm">🔑</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {columns.length === 0 && (
                    <div className="p-8 text-center text-text-secondary">No {isCouchbase ? 'fields' : 'columns'} found</div>
                )}
            </div>
        </div>
    );
}
