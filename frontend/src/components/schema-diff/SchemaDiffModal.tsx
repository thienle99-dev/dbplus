import { useState } from 'react';
import { X, GitCompare, Loader2 } from 'lucide-react';
import Button from '../ui/Button';
import DiffViewer from './DiffViewer';
import MigrationPreview from './MigrationPreview';

interface SchemaDiffModalProps {
    isOpen: boolean;
    onClose: () => void;
    connectionId: string;
}

export default function SchemaDiffModal({ isOpen, onClose, connectionId }: SchemaDiffModalProps) {
    const [sourceSchema, setSourceSchema] = useState('public');
    const [targetSchema, setTargetSchema] = useState('public');
    const [isComparing, setIsComparing] = useState(false);
    const [diffResult, setDiffResult] = useState<any>(null);
    const [isExecuting, setIsExecuting] = useState(false);

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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-bg-0 border-2 border-border rounded-lg shadow-2xl w-full max-w-6xl mx-4 max-h-[90vh] flex flex-col">
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
                    {/* Source & Target Selection */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">
                                Source Schema
                            </label>
                            <input
                                type="text"
                                value={sourceSchema}
                                onChange={(e) => setSourceSchema(e.target.value)}
                                className="w-full px-3 py-2 bg-bg-1 border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                                placeholder="public"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">
                                Target Schema
                            </label>
                            <input
                                type="text"
                                value={targetSchema}
                                onChange={(e) => setTargetSchema(e.target.value)}
                                className="w-full px-3 py-2 bg-bg-1 border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                                placeholder="public"
                            />
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
