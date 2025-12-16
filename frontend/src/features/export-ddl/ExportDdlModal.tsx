import { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import { useSchemas } from '../../hooks/useDatabase';
import {
    DdlScope,
    DdlObjectType,
    ExportDdlOptions,
    DdlObjectSpec,
    PgDumpStatusResponse,
} from './exportDdl.types';
import { exportPostgresDdl, checkPgDump } from './exportDdl.service';
import { useToast } from '../../context/ToastContext';
import { Copy, Download, AlertTriangle, Loader2, Check, Database } from 'lucide-react';

interface ExportDdlModalProps {
    isOpen: boolean;
    onClose: () => void;
    connectionId: string;
    initialScope?: DdlScope;
    initialSchema?: string;
    initialTable?: string;
    initialDatabase?: string;
}

const Checkbox = ({ checked, onChange, label, disabled, className }: { checked: boolean, onChange: (val: boolean) => void, label?: React.ReactNode, disabled?: boolean, className?: string }) => (
    <label className={`flex items-start gap-2 cursor-pointer select-none group ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className || ''}`}>
        <div className="relative flex items-center justify-center shrink-0 mt-0.5 w-4 h-4">
            <input
                type="checkbox"
                className="peer sr-only"
                checked={checked}
                onChange={e => !disabled && onChange(e.target.checked)}
                disabled={disabled}
            />
            <div className={`
                absolute inset-0 rounded border transition-all flex items-center justify-center
                ${checked
                    ? 'bg-accent border-accent text-bg-0'
                    : 'border-border bg-bg-1 group-hover:border-text-secondary'}
                peer-focus-visible:ring-2 peer-focus-visible:ring-accent/50
            `}>
                <Check size={12} strokeWidth={3} className={`transition-opacity ${checked ? 'opacity-100' : 'opacity-0'}`} />
            </div>
        </div>
        {label && <div className="text-sm text-text-primary leading-tight pt-[1px]">{label}</div>}
    </label>
);

const Radio = ({ checked, onChange, label, disabled, subLabel, className }: { checked: boolean, onChange: () => void, label: React.ReactNode, disabled?: boolean, subLabel?: React.ReactNode, className?: string }) => (
    <label className={`flex items-start gap-2 cursor-pointer select-none group ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className || ''}`}>
        <div className="relative flex items-center justify-center shrink-0 mt-0.5 w-4 h-4">
            <input
                type="radio"
                className="peer sr-only"
                checked={checked}
                onChange={() => !disabled && onChange()}
                disabled={disabled}
                name="export-ddl-radio-group"
            />
            <div className={`
                absolute inset-0 rounded-full border transition-all flex items-center justify-center
                ${checked
                    ? 'border-accent bg-bg-0'
                    : 'border-border bg-bg-1 group-hover:border-text-secondary'}
                peer-focus-visible:ring-2 peer-focus-visible:ring-accent/50
            `}>
                <div className={`w-2 h-2 rounded-full bg-accent transition-transform ${checked ? 'scale-100' : 'scale-0'}`} />
            </div>
        </div>
        <div className="flex flex-col pt-[1px]">
            <span className="text-sm text-text-primary leading-tight">{label}</span>
            {subLabel && <span className="text-[10px] text-text-tertiary">{subLabel}</span>}
        </div>
    </label>
);

export default function ExportDdlModal({
    isOpen,
    onClose,
    connectionId,
    initialScope = DdlScope.Database,
    initialSchema,
    initialTable,
    initialDatabase
}: ExportDdlModalProps) {
    const { showToast } = useToast();
    const [scope, setScope] = useState<DdlScope>(initialScope);

    // Selection state
    const [selectedSchemas, setSelectedSchemas] = useState<string[]>(initialSchema ? [initialSchema] : []);
    const [selectedTables, setSelectedTables] = useState<DdlObjectSpec[]>([]);

    const [activeObjectSchema, setActiveObjectSchema] = useState<string | null>(initialSchema || null);

    // Options state
    const [includeDrop, setIncludeDrop] = useState(false);
    const [ifExists, setIfExists] = useState(false);
    const [includeOwnerPrivileges, setIncludeOwnerPrivileges] = useState(false);
    const [includeComments, setIncludeComments] = useState(true);

    // Method selection
    const [exportMethod, setExportMethod] = useState<'bundled_pg_dump' | 'user_pg_dump' | 'driver'>('driver');
    const [pgDumpPath, setPgDumpPath] = useState('');

    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [statusResponse, setStatusResponse] = useState<PgDumpStatusResponse | null>(null);

    // Data fetching
    const { data: schemas = [] } = useSchemas(connectionId);
    const [tables, setTables] = useState<any[]>([]);
    const [views, setViews] = useState<any[]>([]);
    const [functions, setFunctions] = useState<any[]>([]);

    // Fetch objects when activeObjectSchema or initialDatabase changes
    useEffect(() => {
        if (!activeObjectSchema || !connectionId) {
            setTables([]);
            setViews([]);
            setFunctions([]);
            return;
        }

        const fetchObjects = async () => {
            try {
                const params: Record<string, string> = { schema: activeObjectSchema };
                if (initialDatabase) {
                    params.database = initialDatabase;
                }

                const [tablesRes, viewsRes, functionsRes] = await Promise.all([
                    fetch(`/api/connections/${connectionId}/tables?${new URLSearchParams(params)}`).then(r => r.json()),
                    fetch(`/api/connections/${connectionId}/views?${new URLSearchParams(params)}`).then(r => r.json()),
                    fetch(`/api/connections/${connectionId}/functions?${new URLSearchParams(params)}`).then(r => r.json()),
                ]);

                setTables(tablesRes || []);
                setViews(viewsRes || []);
                setFunctions(functionsRes || []);
            } catch (error) {
                console.error('Failed to fetch objects:', error);
                setTables([]);
                setViews([]);
                setFunctions([]);
            }
        };

        fetchObjects();
    }, [activeObjectSchema, connectionId, initialDatabase]);

    // Status check
    useEffect(() => {
        if (isOpen) {
            checkPgDump().then(res => {
                setStatusResponse(res);
                // Smart default
                if (res.bundled.found) {
                    setExportMethod('bundled_pg_dump');
                } else if (res.user.found) {
                    setExportMethod('user_pg_dump');
                    if (res.user.path) setPgDumpPath(res.user.path);
                } else {
                    setExportMethod('driver');
                }
            }).catch(console.error);
        }
    }, [isOpen]);

    // Pre-select logic
    useEffect(() => {
        if (initialTable && initialSchema) {
            setScope(DdlScope.Objects);
            setSelectedSchemas([initialSchema]);
            setActiveObjectSchema(initialSchema);
            setSelectedTables([{
                objectType: DdlObjectType.Table,
                schema: initialSchema,
                name: initialTable
            }]);
        }
    }, [initialTable, initialSchema]);

    const handleObjectToggle = (spec: DdlObjectSpec) => {
        console.log('Toggle object:', spec);
        const key = (s: DdlObjectSpec) => `${s.schema}.${s.objectType}.${s.name}`;
        const target = key(spec);
        const exists = selectedTables.some(s => key(s) === target);

        if (exists) {
            setSelectedTables(selectedTables.filter(s => key(s) !== target));
        } else {
            setSelectedTables([...selectedTables, spec]);
        }
    };

    const isObjectSelected = (schema: string, type: DdlObjectType, name: string) => {
        return selectedTables.some(s => s.schema === schema && s.objectType === type && s.name === name);
    };

    const handleExport = async () => {
        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const options: ExportDdlOptions = {
                scope,
                database: initialDatabase,
                schemas: scope === DdlScope.Database ? undefined : selectedSchemas,
                objects: scope === DdlScope.Objects ? selectedTables : undefined,
                includeDrop,
                ifExists,
                includeOwnerPrivileges,
                includeComments,
                preferPgDump: exportMethod !== 'driver', // legacy field, mostly ignored if method is sent
                exportMethod,
                pgDumpPath: exportMethod === 'user_pg_dump' && pgDumpPath ? pgDumpPath : undefined,
            };

            console.log('Export options:', options);
            console.log('Selected tables:', selectedTables);
            console.log('Scope:', scope);

            const res = await exportPostgresDdl(connectionId, options);
            setResult(res.ddl);
            showToast(`DDL Generated via ${res.method}`, 'success');
        } catch (err: any) {
            console.error(err);
            const msg = err.response?.data?.message || err.message || 'Unknown error';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = async () => {
        if (!result) return;
        await navigator.clipboard.writeText(result);
        showToast('DDL copied to clipboard', 'success');
    };

    const handleDownload = () => {
        if (!result) return;
        const blob = new Blob([result], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const date = new Date().toISOString().split('T')[0];
        a.download = `ddl_export_${date}.sql`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // Reset on close
    useEffect(() => {
        if (!isOpen) {
            setResult(null);
            setError(null);
        }
    }, [isOpen]);

    // Reset selections when database or schema changes
    useEffect(() => {
        if (isOpen) {
            // When modal opens or database/schema changes, reset to initial state
            setScope(initialScope);
            setSelectedSchemas(initialSchema ? [initialSchema] : []);
            setSelectedTables([]);
            setActiveObjectSchema(initialSchema || null);
            setResult(null);
            setError(null);
        }
    }, [initialDatabase, initialSchema, isOpen, initialScope]);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Export DDL (PostgreSQL)"
            size="xl"
            footer={null}
        >
            <div className="flex flex-col h-[70vh]">
                {initialDatabase && (
                    <div className="mb-4 px-4 py-3 bg-gradient-to-r from-accent/5 to-accent/10 border-l-4 border-accent rounded-r">
                        <div className="flex items-center gap-2 mb-1">
                            <Database size={14} className="text-accent" />
                            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Current Workspace</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <div className="flex items-center gap-1.5">
                                <span className="text-text-tertiary">Database:</span>
                                <code className="px-2 py-0.5 bg-bg-2 border border-border rounded text-accent font-semibold">{initialDatabase}</code>
                            </div>
                            {initialSchema && (
                                <>
                                    <span className="text-text-tertiary">•</span>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-text-tertiary">Schema:</span>
                                        <code className="px-2 py-0.5 bg-bg-2 border border-border rounded text-accent font-semibold">{initialSchema}</code>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}
                <div className="flex-1 flex gap-4 overflow-hidden">
                    {/* Left Panel: Configuration */}
                    <div className="w-1/3 flex flex-col gap-4 overflow-y-auto pr-2 border-r border-border min-w-[250px]">
                        <div>
                            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 block">Method</label>
                            <div className="flex flex-col gap-2">
                                <Radio
                                    checked={exportMethod === 'bundled_pg_dump'}
                                    onChange={() => setExportMethod('bundled_pg_dump')}
                                    disabled={!statusResponse?.bundled.found}
                                    label="Bundled pg_dump"
                                    subLabel={statusResponse?.bundled.version}
                                />
                                <Radio
                                    checked={exportMethod === 'user_pg_dump'}
                                    onChange={() => setExportMethod('user_pg_dump')}
                                    label="System pg_dump"
                                />
                                {exportMethod === 'user_pg_dump' && (
                                    <div className="ml-6 mb-1">
                                        <input
                                            type="text"
                                            value={pgDumpPath}
                                            onChange={(e) => setPgDumpPath(e.target.value)}
                                            placeholder="Path to pg_dump (optional)"
                                            className="w-full text-xs px-2 py-1 bg-bg-2 border border-border rounded focus:border-accent outline-none"
                                        />
                                        {statusResponse?.user.path && !pgDumpPath && (
                                            <div className="text-[10px] text-text-tertiary mt-0.5 ml-1">Detected: {statusResponse.user.path}</div>
                                        )}
                                    </div>
                                )}
                                <Radio
                                    checked={exportMethod === 'driver'}
                                    onChange={() => setExportMethod('driver')}
                                    label={
                                        <span className="flex items-center gap-2">
                                            Driver (Introspection)
                                            <span className="text-[9px] px-1 py-0.5 bg-warning/20 text-warning rounded leading-none uppercase font-bold">Beta</span>
                                        </span>
                                    }
                                />
                            </div>
                        </div>

                        <div className="border-t border-border pt-4">
                            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 block">Scope</label>
                            <div className="flex flex-col gap-2">
                                <Radio
                                    checked={scope === DdlScope.Database}
                                    onChange={() => setScope(DdlScope.Database)}
                                    label="Whole Database"
                                />
                                <Radio
                                    checked={scope === DdlScope.Schema}
                                    onChange={() => setScope(DdlScope.Schema)}
                                    label="Specific Schemas"
                                />
                                <Radio
                                    checked={scope === DdlScope.Objects}
                                    onChange={() => setScope(DdlScope.Objects)}
                                    label="Selected Objects"
                                />
                            </div>
                        </div>

                        {scope === DdlScope.Schema && (
                            <div className="flex-1 flex flex-col min-h-0 pt-2 border-t border-border">
                                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 block">
                                    Schemas
                                </label>
                                <div className="border border-border rounded overflow-y-auto p-1 bg-bg-2 flex-1 max-h-[150px]">
                                    {schemas.map(s => (
                                        <Checkbox
                                            key={s}
                                            checked={selectedSchemas.includes(s)}
                                            onChange={(checked) => {
                                                if (checked) setSelectedSchemas([...selectedSchemas, s]);
                                                else setSelectedSchemas(selectedSchemas.filter(x => x !== s));
                                            }}
                                            label={s}
                                            className="px-2 py-1 hover:bg-bg-3 rounded"
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {scope === DdlScope.Objects && (
                            <div className="flex-1 flex flex-col min-h-0 gap-2 pt-2 border-t border-border">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Database size={14} className="text-accent" />
                                        <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Select Schema</label>
                                    </div>
                                    <div className="relative">
                                        <select
                                            className="w-full bg-bg-1 border-2 border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-accent hover:border-accent/50 transition-all cursor-pointer text-text-primary font-medium appearance-none pr-10 shadow-sm"
                                            value={activeObjectSchema || ''}
                                            onChange={e => setActiveObjectSchema(e.target.value)}
                                        >
                                            {!activeObjectSchema && <option value="">Choose a schema to view objects...</option>}
                                            {schemas.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-tertiary">
                                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 border-2 border-border rounded-lg overflow-hidden flex flex-col bg-bg-1 max-h-[400px] shadow-sm">
                                    <div className="flex border-b-2 border-border bg-gradient-to-r from-bg-2 to-bg-3">
                                        <div className="flex-1 px-3 py-2 font-semibold text-xs text-text-secondary uppercase tracking-wide">Available Objects</div>
                                    </div>
                                    <div className="overflow-y-auto p-1 flex-1">
                                        {activeObjectSchema ? (
                                            <>
                                                {tables.length > 0 && (
                                                    <>
                                                        <div className="px-2 py-1 text-[10px] font-bold text-text-tertiary uppercase sticky top-0 bg-bg-2 z-10">Tables</div>
                                                        {tables.map(t => (
                                                            <Checkbox
                                                                key={t.name}
                                                                checked={isObjectSelected(activeObjectSchema, DdlObjectType.Table, t.name)}
                                                                onChange={() => {
                                                                    if (activeObjectSchema) {
                                                                        handleObjectToggle({ schema: activeObjectSchema, objectType: DdlObjectType.Table, name: t.name });
                                                                    }
                                                                }}
                                                                label={t.name}
                                                                className="px-2 py-0.5 hover:bg-bg-3 rounded text-xs"
                                                            />
                                                        ))}
                                                    </>
                                                )}

                                                {views.length > 0 && (
                                                    <>
                                                        <div className="px-2 py-1 text-[10px] font-bold text-text-tertiary uppercase mt-2 sticky top-0 bg-bg-2 z-10">Views</div>
                                                        {views.map(v => (
                                                            <Checkbox
                                                                key={v.name}
                                                                checked={isObjectSelected(activeObjectSchema, DdlObjectType.View, v.name)}
                                                                onChange={() => {
                                                                    if (activeObjectSchema) {
                                                                        handleObjectToggle({ schema: activeObjectSchema, objectType: DdlObjectType.View, name: v.name });
                                                                    }
                                                                }}
                                                                label={v.name}
                                                                className="px-2 py-0.5 hover:bg-bg-3 rounded text-xs"
                                                            />
                                                        ))}
                                                    </>
                                                )}

                                                {functions.length > 0 && (
                                                    <>
                                                        <div className="px-2 py-1 text-[10px] font-bold text-text-tertiary uppercase mt-2 sticky top-0 bg-bg-2 z-10">Functions</div>
                                                        {functions.map(f => (
                                                            <Checkbox
                                                                key={f.name}
                                                                checked={isObjectSelected(activeObjectSchema, DdlObjectType.Function, f.name)}
                                                                onChange={() => {
                                                                    if (activeObjectSchema) {
                                                                        handleObjectToggle({ schema: activeObjectSchema, objectType: DdlObjectType.Function, name: f.name });
                                                                    }
                                                                }}
                                                                label={f.name}
                                                                className="px-2 py-0.5 hover:bg-bg-3 rounded text-xs"
                                                            />
                                                        ))}
                                                    </>
                                                )}

                                                {tables.length === 0 && views.length === 0 && functions.length === 0 && (
                                                    <div className="p-4 text-center text-text-tertiary text-xs">
                                                        No objects found in schema "{activeObjectSchema}"
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div className="p-4 text-center text-text-tertiary text-xs">Select a schema to view objects</div>
                                        )}
                                    </div>
                                    {selectedTables.length > 0 && (
                                        <div className="px-3 py-2 bg-accent/10 border-t-2 border-accent/30 text-xs">
                                            <span className="font-semibold text-accent">{selectedTables.length}</span>
                                            <span className="text-text-secondary"> object{selectedTables.length !== 1 ? 's' : ''} selected</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="mt-2 text-sm pt-4 border-t border-border">
                            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 block">Options</label>
                            <div className="flex flex-col gap-2">
                                <Checkbox
                                    checked={includeDrop}
                                    onChange={setIncludeDrop}
                                    label="Include DROP statements"
                                    disabled={
                                        (scope === DdlScope.Schema && selectedSchemas.length === 0) ||
                                        (scope === DdlScope.Objects && selectedTables.length === 0)
                                    }
                                />
                                <Checkbox
                                    checked={ifExists}
                                    onChange={setIfExists}
                                    label="IF EXISTS"
                                    disabled={
                                        !includeDrop ||
                                        (scope === DdlScope.Schema && selectedSchemas.length === 0) ||
                                        (scope === DdlScope.Objects && selectedTables.length === 0)
                                    }
                                />
                                <Checkbox
                                    checked={!includeOwnerPrivileges}
                                    onChange={val => setIncludeOwnerPrivileges(!val)}
                                    label="Exclude Owner/Privileges"
                                    disabled={
                                        (scope === DdlScope.Schema && selectedSchemas.length === 0) ||
                                        (scope === DdlScope.Objects && selectedTables.length === 0)
                                    }
                                />
                                <Checkbox
                                    checked={includeComments}
                                    onChange={setIncludeComments}
                                    label="Include Comments"
                                    disabled={
                                        (scope === DdlScope.Schema && selectedSchemas.length === 0) ||
                                        (scope === DdlScope.Objects && selectedTables.length === 0)
                                    }
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleExport}
                            disabled={loading || (scope === DdlScope.Schema && selectedSchemas.length === 0) || (scope === DdlScope.Objects && selectedTables.length === 0)}
                            className="mt-auto px-4 py-2 bg-primary-default text-white rounded hover:bg-primary-hover disabled:opacity-50 font-medium flex items-center justify-center gap-2"
                        >
                            {loading && <Loader2 className="animate-spin" size={16} />}
                            Generate DDL
                        </button>
                    </div>

                    {/* Right Panel: Preview */}
                    <div className="w-2/3 flex flex-col bg-bg-0 text-text-primary font-mono text-xs border border-border rounded overflow-hidden">
                        {error ? (
                            <div className="p-4 text-error bg-error/10 h-full overflow-auto">
                                <div className="flex items-center gap-2 mb-2 font-bold">
                                    <AlertTriangle size={16} />
                                    Export Failed
                                </div>
                                <pre className="whitespace-pre-wrap">{error}</pre>
                            </div>
                        ) : result ? (
                            <textarea
                                readOnly
                                className="w-full h-full p-4 bg-transparent resize-none focus:outline-none"
                                value={result}
                            />
                        ) : (
                            <div className="flex items-center justify-center h-full text-text-secondary">
                                Preview will appear here...
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-border">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
                    >
                        Close
                    </button>
                    {result && (
                        <>
                            <button
                                onClick={handleCopy}
                                className="px-4 py-2 bg-bg-2 border border-border rounded text-text-primary hover:bg-bg-3 flex items-center gap-2 text-sm"
                            >
                                <Copy size={14} /> Copy
                            </button>
                            <button
                                onClick={handleDownload}
                                className="px-4 py-2 bg-accent text-text-inverse rounded hover:bg-accent/90 flex items-center gap-2 text-sm font-medium"
                            >
                                <Download size={14} /> Save to File
                            </button>
                        </>
                    )}
                </div>
            </div>
        </Modal>
    );
}
