import { useState } from 'react';
import { Copy, Check, AlertTriangle, Play } from 'lucide-react';
import Button from '../ui/Button';
import Checkbox from '../ui/Checkbox';

interface MigrationPreviewProps {
    migration: any;
    onExecute?: (selectedStatements: number[]) => void;
}

export default function MigrationPreview({ migration, onExecute }: MigrationPreviewProps) {
    const [selectedStatements, setSelectedStatements] = useState<Set<number>>(
        new Set(migration?.statements?.map((_: any, idx: number) => idx) || [])
    );
    const [copied, setCopied] = useState(false);

    if (!migration || !migration.statements) {
        return null;
    }

    const { statements, summary } = migration;

    const toggleStatement = (id: number) => {
        setSelectedStatements(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const toggleAll = () => {
        if (selectedStatements.size === statements.length) {
            setSelectedStatements(new Set());
        } else {
            setSelectedStatements(new Set(statements.map((_: any, idx: number) => idx)));
        }
    };

    const copySQL = () => {
        const sql = statements
            .filter((_: any, idx: number) => selectedStatements.has(idx))
            .map((stmt: any) => stmt.sql)
            .join('\n\n');
        
        navigator.clipboard.writeText(sql);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleExecute = () => {
        if (onExecute) {
            onExecute(Array.from(selectedStatements));
        }
    };

    return (
        <div className="space-y-4">
            {/* Summary */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm">
                    <span className="text-text-secondary">
                        {selectedStatements.size} of {summary.total_statements} selected
                    </span>
                    {summary.destructive_statements > 0 && (
                        <span className="flex items-center gap-1 text-red-500">
                            <AlertTriangle size={14} />
                            {summary.destructive_statements} destructive
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={toggleAll}
                    >
                        {selectedStatements.size === statements.length ? 'Deselect All' : 'Select All'}
                    </Button>
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={copySQL}
                        leftIcon={copied ? <Check size={14} /> : <Copy size={14} />}
                    >
                        {copied ? 'Copied!' : 'Copy SQL'}
                    </Button>
                    {onExecute && (
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={handleExecute}
                            disabled={selectedStatements.size === 0}
                            leftIcon={<Play size={14} />}
                        >
                            Execute Migration
                        </Button>
                    )}
                </div>
            </div>

            {/* Statements List */}
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {statements.map((stmt: any, idx: number) => (
                    <StatementItem
                        key={idx}
                        statement={stmt}
                        index={idx}
                        selected={selectedStatements.has(idx)}
                        onToggle={() => toggleStatement(idx)}
                    />
                ))}
            </div>
        </div>
    );
}

function StatementItem({
    statement,
    index,
    selected,
    onToggle,
}: {
    statement: any;
    index: number;
    selected: boolean;
    onToggle: () => void;
}) {
    const categoryColors: Record<string, string> = {
        CreateTable: 'text-green-500 bg-green-500/10 border-green-500/20',
        DropTable: 'text-red-500 bg-red-500/10 border-red-500/20',
        AddColumn: 'text-green-500 bg-green-500/10 border-green-500/20',
        DropColumn: 'text-red-500 bg-red-500/10 border-red-500/20',
        ModifyColumn: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20',
    };

    const colorClass = categoryColors[statement.category] || 'text-text-secondary bg-bg-1 border-border';

    return (
        <div className={`border rounded-lg p-3 transition-colors ${selected ? 'bg-bg-1' : 'bg-bg-0'}`}>
            <div className="flex items-start gap-3">
                <div className="pt-0.5">
                    <Checkbox
                        checked={selected}
                        onChange={() => onToggle()}
                    />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs px-2 py-0.5 rounded border ${colorClass}`}>
                            {statement.category}
                        </span>
                        {statement.is_destructive && (
                            <span className="flex items-center gap-1 text-xs text-red-500">
                                <AlertTriangle size={12} />
                                Destructive
                            </span>
                        )}
                        <span className="text-xs text-text-tertiary">
                            #{index + 1}
                        </span>
                    </div>
                    <div className="text-sm text-text-secondary mb-2">
                        {statement.description}
                    </div>
                    <div className="bg-bg-0 rounded p-2 font-mono text-xs text-accent overflow-x-auto">
                        {statement.sql}
                    </div>
                </div>
            </div>
        </div>
    );
}
