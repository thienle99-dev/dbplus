import { useState, useEffect } from 'react';
import { X, GitCompare, Loader2, Database, Table } from 'lucide-react';
import Button from '../ui/Button';
import Select from '../ui/Select';
import DiffViewer from './DiffViewer';
import MigrationPreview from './MigrationPreview';
import { useSchemas, useTables } from '../../hooks/useDatabase';
import { useConnectionStore } from '../../store/connectionStore';

interface SchemaDiffModalProps {
    isOpen: boolean;
    onClose: () => void;
    connectionId: string;
}

type ComparisonMode = 'schema' | 'table';

export default function SchemaDiffModal({ isOpen, onClose, connectionId }: SchemaDiffModalProps) {
    const { connections } = useConnectionStore();
    const [comparisonMode, setComparisonMode] = useState<ComparisonMode>('schema');
    
    // Source
    const [sourceConnectionId, setSourceConnectionId] = useState(connectionId);
    const [sourceSchema, setSourceSchema] = useState('public');
    const [sourceTable, setSourceTable] = useState('');
    
    // Target
    const [targetConnectionId, setTargetConnectionId] = useState(connectionId);
    const [targetSchema, setTargetSchema] = useState('public');
    const [targetTable, setTargetTable] = useState('');
    
    const { data: sourceSchemas = [] } = useSchemas(sourceConnectionId);
    const { data: targetSchemas = [] } = useSchemas(targetConnectionId);
    const { data: sourceTables = [] } = useTables(sourceConnectionId, sourceSchema);
    const { data: targetTables = [] } = useTables(targetConnectionId, targetSchema);
    
    const [isComparing, setIsComparing] = useState(false);
    const [diffResult, setDiffResult] = useState<any>(null);
    const [isExecuting, setIsExecuting] = useState(false);

    // Set default schemas when schemas load
    useEffect(() => {
        if (sourceSchemas.length > 0 && !sourceSchema) {
            setSourceSchema(sourceSchemas[0]);
        }
        if (targetSchemas.length > 0 && !targetSchema) {
            setTargetSchema(targetSchemas[0]);
        }
    }, [sourceSchemas, targetSchemas]);

    // Set default tables when tables load
    useEffect(() => {
        if (sourceTables.length > 0 && !sourceTable) {
            setSourceTable(sourceTables[0].name);
        }
        if (targetTables.length > 0 && !targetTable) {
            setTargetTable(targetTables[0].name);
        }
    }, [sourceTables, targetTables]);

    if (!isOpen) return null;

    const handleCompare = async () => {
        setIsComparing(true);
        try {
            const response = await fetch('/api/schema-diff/test');
            const data = await response.json();
            setDiffResult(data);
        } catch (error) {
            console.error('Failed to compare schemas:', error);
        } finally {
            setIsComparing(false);
        }
    };

    const handleExecuteMigration = async (selectedStatements: number[]) => {
        if (!diffResult?.migration) return;

        setIsExecuting(true);
        try {
            const statements = selectedStatements.map(idx => diffResult.migration.statements[idx]);
            
            // Execute each statement
            for (const stmt of statements) {
                const response = await fetch(`/api/connections/${connectionId}/execute`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sql: stmt.sql }),
                });

                if (!response.ok) {
                    throw new Error(`Failed to execute: ${stmt.description}`);
                }
            }

            alert('Migration executed successfully!');
            onClose();
        } catch (error: any) {
            console.error('Failed to execute migration:', error);
            alert(`Migration failed: ${error.message}`);
        } finally {
            setIsExecuting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-bg-0 border-2 border-border rounded-lg shadow-2xl w-full max-w-[95vw] h-[95vh] flex flex-col resize overflow-auto">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                    <div className="flex items-center gap-3">
                        <GitCompare size={24} className="text-accent" />
                        <div>
                            <h2 className="text-lg font-semibold text-text-primary">Schema Diff & Migration</h2>
                            <p className="text-xs text-text-tertiary">Compare schemas and generate migration scripts</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-bg-2 rounded transition-colors"
                    >
                        <X size={20} className="text-text-secondary" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Comparison Mode */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-text-secondary mb-2">
                            Comparison Mode
                        </label>
                        <div className="flex gap-2">
                            <Button
                                variant={comparisonMode === 'schema' ? 'primary' : 'secondary'}
                                size="sm"
                                onClick={() => setComparisonMode('schema')}
                                leftIcon={<Database size={14} />}
                            >
                                Compare Schemas
                            </Button>
                            <Button
                                variant={comparisonMode === 'table' ? 'primary' : 'secondary'}
                                size="sm"
                                onClick={() => setComparisonMode('table')}
                                leftIcon={<Table size={14} />}
                            >
                                Compare Tables
                            </Button>
                        </div>
                    </div>

                    {/* Source & Target Selection */}
                    <div className="grid grid-cols-2 gap-6 mb-6">
                        {/* Source */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-text-primary">Source</h3>
                            
                            <div>
                                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                                    Connection
                                </label>
                                <Select
                                    value={sourceConnectionId}
                                    onChange={setSourceConnectionId}
                                    options={connections.map(conn => ({
                                        value: conn.id,
                                        label: conn.name,
                                    }))}
                                    placeholder="Select connection"
                                    searchable
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                                    Schema
                                </label>
                                <Select
                                    value={sourceSchema}
                                    onChange={setSourceSchema}
                                    options={sourceSchemas.map(schema => ({
                                        value: schema,
                                        label: schema,
                                    }))}
                                    placeholder="Select schema"
                                    searchable
                                />
                            </div>

                            {comparisonMode === 'table' && (
                                <div>
                                    <label className="block text-xs font-medium text-text-secondary mb-1.5">
                                        Table
                                    </label>
                                    <Select
                                        value={sourceTable}
                                        onChange={setSourceTable}
                                        options={sourceTables.map(table => ({
                                            value: table.name,
                                            label: table.name,
                                        }))}
                                        placeholder="Select table"
                                        searchable
                                    />
                                </div>
                            )}
                        </div>

                        {/* Target */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-text-primary">Target</h3>
                            
                            <div>
                                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                                    Connection
                                </label>
                                <Select
                                    value={targetConnectionId}
                                    onChange={setTargetConnectionId}
                                    options={connections.map(conn => ({
                                        value: conn.id,
                                        label: conn.name,
                                    }))}
                                    placeholder="Select connection"
                                    searchable
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                                    Schema
                                </label>
                                <Select
                                    value={targetSchema}
                                    onChange={setTargetSchema}
                                    options={targetSchemas.map(schema => ({
                                        value: schema,
                                        label: schema,
                                    }))}
                                    placeholder="Select schema"
                                    searchable
                                />
                            </div>

                            {comparisonMode === 'table' && (
                                <div>
                                    <label className="block text-xs font-medium text-text-secondary mb-1.5">
                                        Table
                                    </label>
                                    <Select
                                        value={targetTable}
                                        onChange={setTargetTable}
                                        options={targetTables.map(table => ({
                                            value: table.name,
                                            label: table.name,
                                        }))}
                                        placeholder="Select table"
                                        searchable
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Compare Button */}
                    <div className="mb-6">
                        <Button
                            variant="primary"
                            size="md"
                            onClick={handleCompare}
                            disabled={isComparing}
                            leftIcon={isComparing ? <Loader2 className="animate-spin" size={16} /> : <GitCompare size={16} />}
                        >
                            {isComparing ? 'Comparing...' : 'Compare Schemas'}
                        </Button>
                    </div>

                    {/* Results */}
                    {diffResult && (
                        <div className="space-y-6">
                            {/* Diff Viewer */}
                            <div>
                                <h3 className="text-sm font-semibold text-text-primary mb-3">Changes Detected</h3>
                                <DiffViewer diffResult={diffResult.diff} />
                            </div>

                            {/* Migration Preview */}
                            {diffResult.migration && (
                                <div>
                                    <h3 className="text-sm font-semibold text-text-primary mb-3">Migration Script</h3>
                                    <MigrationPreview
                                        migration={diffResult.migration}
                                        onExecute={handleExecuteMigration}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {isExecuting && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                            <div className="bg-bg-0 border border-border rounded-lg p-6 flex items-center gap-3">
                                <Loader2 className="animate-spin text-accent" size={24} />
                                <span className="text-text-primary">Executing migration...</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-2">
                    <Button variant="secondary" size="md" onClick={onClose}>
                        Close
                    </Button>
                </div>
            </div>
        </div>
    );
}
