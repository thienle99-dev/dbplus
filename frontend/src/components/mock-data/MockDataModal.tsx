import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Sparkles, Database, FileCode, Play, Loader2, Settings2 } from 'lucide-react';
import { TableColumn } from '../../types';
import api from '../../services/api';
import { useColumns } from '../../hooks/useDatabase';

interface MockDataModalProps {
    isOpen: boolean;
    onClose: () => void;
    connectionId: string;
    schema: string;
    table: string;
    columns?: TableColumn[];
}

type MockDataType = 
    | 'Auto' | 'Email' | 'Name' | 'FirstName' | 'LastName' 
    | 'Address' | 'City' | 'Country' | 'Phone' | 'Company' 
    | 'Date' | 'Integer' | 'Boolean' | 'UUID' | 'Text' 
    | 'Custom';

interface ColumnRule {
    column_name: string;
    data_type: MockDataType | { kind: 'Custom', values: string[] } | { kind: 'Integer', min: number, max: number };
    is_unique: boolean;
    is_nullable: boolean;
    null_probability: number;
}

// Simplified for UI binding, we'll transform before sending
interface UiColumnRule {
    column_name: string;
    type: string; // Key of MockDataType
    min?: number;
    max?: number;
    custom_values?: string; // comma separated
    is_unique: boolean;
    is_nullable: boolean;
    null_percent: number;
}

export const MockDataModal: React.FC<MockDataModalProps> = ({
    isOpen, onClose, connectionId, schema, table, columns: initialColumns
}) => {
    const [rowCount, setRowCount] = useState<number>(100);
    const [rules, setRules] = useState<UiColumnRule[]>([]);
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { data: fetchedColumns } = useColumns(connectionId, schema, table);
    const columns = initialColumns || fetchedColumns || [];

    // Init rules from columns
    useEffect(() => {
        if (columns.length > 0) {
            setRules(columns.map(col => ({
                column_name: col.name,
                type: inferType(col),
                is_unique: col.is_primary_key || false,
                is_nullable: col.is_nullable,
                null_percent: 0,
                min: 0,
                max: 1000
            })));
        }
    }, [columns]);

    const inferType = (col: TableColumn): string => {
        const name = col.name.toLowerCase();
        const type = col.data_type.toLowerCase();

        if (name.includes('email')) return 'Email';
        if (name.includes('phone')) return 'Phone';
        if (name.includes('name')) return 'Name';
        if (name.includes('city')) return 'City';
        if (name.includes('country')) return 'Country';
        if (name.includes('address')) return 'Address';
        if (type.includes('int')) return 'Integer';
        if (type.includes('bool')) return 'Boolean';
        if (type.includes('uuid')) return 'UUID';
        if (type.includes('date') || type.includes('time')) return 'Date';
        
        return 'Auto';
    }

    const handlePreview = async () => {
        setLoading(true);
        setError(null);
        try {
            const config = buildConfig(10); // Preview 10 rows
            const res = await api.post('/mock/preview', {
                connection_id: connectionId,
                config
            });
            if (res.data.success) {
                setPreviewData(res.data.data);
            } else {
                setError(res.data.error);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to generate preview');
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadSql = async () => {
        setLoading(true);
        setError(null);
        try {
            const config = buildConfig(rowCount);
            const res = await api.post('/mock/sql', {
                connection_id: connectionId,
                config
            });
            
            if (res.data.success) {
                // Trigger download
                const blob = new Blob([res.data.sql], { type: 'text/plain' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `mock_data_${table}.sql`;
                a.click();
            } else {
                setError(res.data.error);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to generate SQL');
        } finally {
            setLoading(false);
        }
    };

    const buildConfig = (count: number) => {
        return {
            table_name: table,
            count: count,
            rules: rules.map(r => {
                let data_type: any = r.type;
                if (r.type === 'Integer') {
                    data_type = { Integer: { min: r.min || 0, max: r.max || 1000 } };
                } else if (r.type === 'Custom') {
                    data_type = { Custom: { values: r.custom_values?.split(',').map(s => s.trim()) || [] } };
                }
                
                return {
                    column_name: r.column_name,
                    data_type: data_type,
                    is_unique: r.is_unique,
                    is_nullable: r.is_nullable,
                    null_probability: r.null_percent / 100.0
                };
            })
        };
    };

    return (
        <Dialog.Root open={isOpen} onOpenChange={onClose}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
                <Dialog.Content className="fixed top-[5%] left-[5%] right-[5%] bottom-[5%] bg-background border border-border rounded-lg shadow-xl z-50 flex flex-col animate-in fade-in zoom-in-95 duration-200">
                    
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-border">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <Sparkles className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <Dialog.Title className="text-lg font-semibold text-text-primary">
                                    Mock Data Studio
                                </Dialog.Title>
                                <Dialog.Description className="text-sm text-text-secondary">
                                    Generate realistic data for {schema}.{table}
                                </Dialog.Description>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-background-secondary rounded-lg transition-colors">
                            <X className="w-5 h-5 text-text-secondary" />
                        </button>
                    </div>

                    <div className="flex-1 flex overflow-hidden">
                        {/* Left Panel: Configuration */}
                        <div className="w-1/3 border-r border-border flex flex-col bg-background-secondary/30">
                            <div className="p-4 border-b border-border space-y-4">
                                <div>
                                    <label className="text-xs font-medium text-text-secondary uppercase mb-1 block">Row Count</label>
                                    <input 
                                        type="number" 
                                        value={rowCount}
                                        onChange={(e) => setRowCount(parseInt(e.target.value) || 0)}
                                        className="w-full px-3 py-2 bg-input-background border border-border rounded-md focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                                        min="1"
                                        max="10000"
                                    />
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {rules.map((rule, idx) => (
                                    <div key={rule.column_name} className="p-3 bg-background border border-border rounded-lg space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium text-sm text-text-primary">{rule.column_name}</span>
                                            {rule.is_nullable && (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-text-secondary">Null %</span>
                                                    <input 
                                                        type="number" 
                                                        className="w-12 px-1 py-0.5 text-xs bg-input-background border border-border rounded"
                                                        value={rule.null_percent}
                                                        onChange={(e) => {
                                                            const newRules = [...rules];
                                                            newRules[idx].null_percent = parseFloat(e.target.value);
                                                            setRules(newRules);
                                                        }}
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="col-span-2">
                                                <select 
                                                    className="w-full px-2 py-1.5 text-sm bg-input-background border border-border rounded focus:border-primary outline-none"
                                                    value={rule.type}
                                                    onChange={(e) => {
                                                        const newRules = [...rules];
                                                        newRules[idx].type = e.target.value;
                                                        setRules(newRules);
                                                    }}
                                                >
                                                    <option value="Auto">Auto Detect</option>
                                                    <option value="Email">Email</option>
                                                    <option value="Name">Full Name</option>
                                                    <option value="FirstName">First Name</option>
                                                    <option value="LastName">Last Name</option>
                                                    <option value="Address">Address</option>
                                                    <option value="City">City</option>
                                                    <option value="Country">Country</option>
                                                    <option value="Phone">Phone Number</option>
                                                    <option value="Company">Company</option>
                                                    <option value="Date">Date</option>
                                                    <option value="Boolean">Boolean</option>
                                                    <option value="Integer">Number Range</option>
                                                    <option value="UUID">UUID</option>
                                                    <option value="Text">Sentence</option>
                                                    <option value="Custom">Custom List</option>
                                                </select>
                                            </div>

                                            {rule.type === 'Integer' && (
                                                <>
                                                    <input 
                                                        type="number" placeholder="Min"
                                                        value={rule.min}
                                                        className="px-2 py-1 text-sm bg-input-background border border-border rounded"
                                                        onChange={(e) => {
                                                             const newRules = [...rules];
                                                             newRules[idx].min = parseInt(e.target.value);
                                                             setRules(newRules);
                                                        }}
                                                    />
                                                    <input 
                                                        type="number" placeholder="Max"
                                                        value={rule.max}
                                                        className="px-2 py-1 text-sm bg-input-background border border-border rounded"
                                                        onChange={(e) => {
                                                             const newRules = [...rules];
                                                             newRules[idx].max = parseInt(e.target.value);
                                                             setRules(newRules);
                                                        }}
                                                    />
                                                </>
                                            )}

                                            {rule.type === 'Custom' && (
                                                <input 
                                                    type="text" placeholder="val1, val2..."
                                                    value={rule.custom_values}
                                                    className="col-span-2 px-2 py-1 text-sm bg-input-background border border-border rounded"
                                                    onChange={(e) => {
                                                         const newRules = [...rules];
                                                         newRules[idx].custom_values = e.target.value;
                                                         setRules(newRules);
                                                    }}
                                                />
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="checkbox" 
                                                id={`unique-${idx}`}
                                                checked={rule.is_unique}
                                                onChange={(e) => {
                                                     const newRules = [...rules];
                                                     newRules[idx].is_unique = e.target.checked;
                                                     setRules(newRules);
                                                }}
                                                className="rounded border-border bg-input-background text-primary focus:ring-primary"
                                            />
                                            <label htmlFor={`unique-${idx}`} className="text-xs text-text-secondary select-none cursor-pointer">Ensure Unique</label>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Right Panel: Preview */}
                        <div className="flex-1 flex flex-col bg-background">
                            <div className="p-4 border-b border-border flex items-center justify-between bg-background-secondary/10">
                                <h3 className="font-medium text-text-primary flex items-center gap-2">
                                    <Settings2 className="w-4 h-4" />
                                    Data Preview
                                </h3>
                                <button 
                                    onClick={handlePreview}
                                    disabled={loading}
                                    className="px-3 py-1.5 bg-background border border-border hover:border-primary text-text-primary text-sm rounded-md flex items-center gap-2 transition-all"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                                    Generate Preview
                                </button>
                            </div>

                            <div className="flex-1 overflow-auto p-4">
                                {error && (
                                    <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg mb-4 text-sm">
                                        {error}
                                    </div>
                                )}
                                
                                {previewData.length > 0 ? (
                                    <div className="border border-border rounded-lg overflow-hidden">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-background-secondary text-text-secondary font-medium">
                                                <tr>
                                                    {Object.keys(previewData[0]).map(key => (
                                                        <th key={key} className="px-4 py-2 border-b border-border whitespace-nowrap">{key}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border">
                                                {previewData.map((row, i) => (
                                                    <tr key={i} className="hover:bg-background-secondary/50">
                                                        {Object.values(row).map((val: any, j) => (
                                                            <td key={j} className="px-4 py-2 whitespace-nowrap text-text-primary font-mono text-xs">
                                                                {val === null ? <span className="text-text-disabled">NULL</span> : String(val)}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-text-disabled space-y-2">
                                        <Settings2 className="w-12 h-12 opacity-20" />
                                        <p>Configure rules and click "Generate Preview"</p>
                                    </div>
                                )}
                            </div>

                            {/* Footer Actions */}
                            <div className="p-4 border-t border-border flex justify-end gap-3 bg-background-secondary/10">
                                <button 
                                    onClick={handleDownloadSql}
                                    disabled={loading}
                                    className="px-4 py-2 bg-primary text-white hover:bg-primary-hover rounded-md text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCode className="w-4 h-4" />}
                                    Download Insert SQL
                                </button>
                            </div>
                        </div>
                    </div>

                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};
