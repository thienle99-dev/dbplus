import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { Database, Search, X } from 'lucide-react';
import { TableColumn, TableStructureTabProps } from '../types';

export default function TableStructureTab({ schema: schemaProp, table: tableProp }: TableStructureTabProps) {
    const params = useParams();
    const schema = schemaProp || params.schema;
    const table = tableProp || params.table;
    const connectionId = params.connectionId;
    const [columns, setColumns] = useState<TableColumn[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (!connectionId || !schema || !table) return;

        const fetchColumns = async () => {
            setLoading(true);
            try {
                const response = await api.get(
                    `/api/connections/${connectionId}/columns?schema=${schema}&table=${table}`
                );
                setColumns(response.data);
            } catch (err) {
                console.error('Failed to fetch columns:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchColumns();
    }, [connectionId, schema, table]);

    if (loading) {
        return <div className="p-8 text-text-secondary">Loading structure...</div>;
    }

    if (!schema || !table) {
        return <div className="p-8 text-text-secondary">Select a table to view structure</div>;
    }

    return (
        <div className="flex flex-col h-full bg-bg-0">
            <div className="p-2.5 border-b border-border-light bg-bg-1/50 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-text-primary flex items-center gap-2.5">
                        <div className="p-1 rounded-md bg-accent/10 text-accent">
                            <Database size={14} />
                        </div>
                        <span>Table Structure: <span className="text-accent">{schema}.{table}</span></span>
                    </h3>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" size={13} />
                        <input
                            type="text"
                            placeholder="Filter columns..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8 pr-8 py-1 bg-bg-2 border border-border-light rounded-md text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent w-48 transition-all"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary"
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar">
                <table className="w-full border-collapse text-[12px]">
                    <thead className="bg-bg-1/80 sticky top-0 z-10 backdrop-blur-md">
                        <tr>
                            <th className="border-b border-border-light px-3 py-2 text-left font-semibold text-text-tertiary uppercase tracking-wider text-[10px] w-12">#</th>
                            <th className="border-b border-border-light px-3 py-2 text-left font-semibold text-text-tertiary uppercase tracking-wider text-[10px]">Column Name</th>
                            <th className="border-b border-border-light px-3 py-2 text-left font-semibold text-text-tertiary uppercase tracking-wider text-[10px]">Data Type</th>
                            <th className="border-b border-border-light px-3 py-2 text-left font-semibold text-text-tertiary uppercase tracking-wider text-[10px]">Nullable</th>
                            <th className="border-b border-border-light px-3 py-2 text-left font-semibold text-text-tertiary uppercase tracking-wider text-[10px]">Default</th>
                            <th className="border-b border-border-light px-3 py-2 text-left font-semibold text-text-tertiary uppercase tracking-wider text-[10px]">Key</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border-light/50">
                        {columns.filter(col => 
                            col.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            col.data_type.toLowerCase().includes(searchTerm.toLowerCase())
                        ).map((col, index) => (
                            <tr key={col.name} className="hover:bg-bg-1/50 transition-colors group">
                                <td className="px-3 py-2 text-text-tertiary font-mono">{index + 1}</td>
                                <td className="px-3 py-2 text-text-primary font-medium group-hover:text-accent transition-colors">{col.name}</td>
                                <td className="px-3 py-2">
                                    <code className="px-1.5 py-0.5 rounded bg-bg-2 text-accent font-mono text-[11px] border border-border-light/50">{col.data_type}</code>
                                </td>
                                <td className="px-3 py-2">
                                    {col.is_nullable ? (
                                        <span className="text-[10px] font-bold text-success/80 bg-success/10 px-1.5 py-0.5 rounded">YES</span>
                                    ) : (
                                        <span className="text-[10px] font-bold text-error/80 bg-error/10 px-1.5 py-0.5 rounded">NO</span>
                                    )}
                                </td>
                                <td className="px-3 py-2 text-text-secondary font-mono">
                                    {col.default_value ? <span className="text-text-primary">{col.default_value}</span> : <span className="text-text-tertiary opacity-40 italic">NULL</span>}
                                </td>
                                <td className="px-3 py-2">
                                    {col.is_primary_key && (
                                        <span className="text-[9px] font-bold bg-accent/20 text-accent px-2 py-0.5 rounded shadow-sm border border-accent/20">PRIMARY</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {columns.length === 0 && (
                    <div className="flex flex-col items-center justify-center p-12 text-center">
                        <div className="w-12 h-12 rounded-full bg-bg-2 flex items-center justify-center mb-4 border border-border-light text-text-tertiary">
                            <Database size={24} />
                        </div>
                        <p className="text-text-secondary font-medium uppercase tracking-widest text-[10px]">No columns found</p>
                    </div>
                )}
            </div>
        </div>
    );
}
