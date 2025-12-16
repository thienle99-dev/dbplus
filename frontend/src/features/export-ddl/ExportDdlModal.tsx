import { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import { useSchemas, useTables, useViews, useFunctions } from '../../hooks/useDatabase';
import { DdlScope, DdlObjectType, ExportDdlOptions, DdlObjectSpec, PgDumpStatus } from './exportDdl.types';
import { exportPostgresDdl, checkPgDump } from './exportDdl.service';
import { useToast } from '../../context/ToastContext';
import { Copy, Download, AlertTriangle, Loader2 } from 'lucide-react';

interface ExportDdlModalProps {
    isOpen: boolean;
    onClose: () => void;
    connectionId: string;
    initialScope?: DdlScope;
    initialSchema?: string;
    initialTable?: string; // If scoping to a single table
}

export default function ExportDdlModal({
    isOpen,
    onClose,
    connectionId,
    initialScope = DdlScope.Database,
    initialSchema,
    initialTable
}: ExportDdlModalProps) {
    const { showToast } = useToast();
    const [scope, setScope] = useState<DdlScope>(initialScope);

    // Selection state
    const [selectedSchemas, setSelectedSchemas] = useState<string[]>(initialSchema ? [initialSchema] : []);
    const [selectedTables, setSelectedTables] = useState<DdlObjectSpec[]>([]);

    // Object selection UI state
    // We only list objects for ONE schema at a time in the UI to keep it simple, 
    // but we can accumulate selections across schemas if needed.
    // For now, let's track the "active" schema being viewed for object selection.
    const [activeObjectSchema, setActiveObjectSchema] = useState<string | null>(initialSchema || null);

    // Options state
    const [includeDrop, setIncludeDrop] = useState(false);
    const [ifExists, setIfExists] = useState(false);
    const [includeOwnerPrivileges, setIncludeOwnerPrivileges] = useState(false);
    const [includeComments, setIncludeComments] = useState(true);
    const [preferPgDump, setPreferPgDump] = useState(true);

    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [pgDumpStatus, setPgDumpStatus] = useState<PgDumpStatus | null>(null);

    // Data fetching
    const { data: schemas = [] } = useSchemas(connectionId);
    const { data: tables = [] } = useTables(connectionId, activeObjectSchema || undefined);
    const { data: views = [] } = useViews(connectionId, activeObjectSchema || undefined);
    const { data: functions = [] } = useFunctions(connectionId, activeObjectSchema || undefined);

    // Default active schema if needed
    useEffect(() => {
        if (scope === DdlScope.Objects && !activeObjectSchema && schemas.length > 0) {
            setActiveObjectSchema(schemas[0]);
        }
    }, [scope, activeObjectSchema, schemas]);

    // Check pg_dump status
    useEffect(() => {
        if (isOpen) {
            checkPgDump().then(setPgDumpStatus).catch(console.error);
        }
    }, [isOpen]);

    // Pre-select logic
    useEffect(() => {
        if (initialTable && initialSchema) {
            setScope(DdlScope.Objects);
            setSelectedSchemas([initialSchema]); // Keep schema selected as context
            setActiveObjectSchema(initialSchema);
            setSelectedTables([{
                objectType: DdlObjectType.Table,
                schema: initialSchema,
                name: initialTable
            }]);
        }
    }, [initialTable, initialSchema]);

    const handleObjectToggle = (spec: DdlObjectSpec) => {
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
                schemas: scope === DdlScope.Database ? undefined : selectedSchemas,
                objects: scope === DdlScope.Objects ? selectedTables : undefined,
                includeDrop,
                ifExists,
                includeOwnerPrivileges,
                includeComments,
                preferPgDump
            };

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

    // Reset state on open
    useEffect(() => {
        if (isOpen) {
            setResult(null);
            setError(null);
            setLoading(false);
            if (initialScope) setScope(initialScope);
            if (initialSchema) {
                setSelectedSchemas([initialSchema]);
                setActiveObjectSchema(initialSchema);
            }
        }
    }, [isOpen, initialScope, initialSchema]);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Export DDL (PostgreSQL)"
            size="xl"
            footer={null}
        >
            <div className="flex flex-col h-[70vh]">
                <div className="flex-1 flex gap-4 overflow-hidden">
                    {/* Left Panel: Configuration */}
                    <div className="w-1/3 flex flex-col gap-4 overflow-y-auto pr-2 border-r border-border min-w-[250px]">
                        <div>
                            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 block">Scope</label>
                            <div className="flex flex-col gap-2">
                                <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
                                    <input
                                        type="radio"
                                        checked={scope === DdlScope.Database}
                                        onChange={() => setScope(DdlScope.Database)}
                                        className="accent-primary-default"
                                    />
                                    Whole Database
                                </label>
                                <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
                                    <input
                                        type="radio"
                                        checked={scope === DdlScope.Schema}
                                        onChange={() => setScope(DdlScope.Schema)}
                                        className="accent-primary-default"
                                    />
                                    Specific Schemas
                                </label>
                                <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
                                    <input
                                        type="radio"
                                        checked={scope === DdlScope.Objects}
                                        onChange={() => setScope(DdlScope.Objects)}
                                        className="accent-primary-default"
                                    />
                                    Selected Objects
                                </label>
                            </div>
                        </div>

                        {scope === DdlScope.Schema && (
                            <div className="flex-1 flex flex-col min-h-0">
                                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 block">
                                    Schemas
                                </label>
                                <div className="border border-border rounded overflow-y-auto p-1 bg-bg-2 flex-1">
                                    {schemas.map(s => (
                                        <label key={s} className="flex items-center gap-2 px-2 py-1 hover:bg-bg-3 cursor-pointer text-sm">
                                            <input
                                                type="checkbox"
                                                checked={selectedSchemas.includes(s)}
                                                onChange={(e) => {
                                                    if (e.target.checked) setSelectedSchemas([...selectedSchemas, s]);
                                                    else setSelectedSchemas(selectedSchemas.filter(x => x !== s));
                                                }}
                                                className="rounded border-border"
                                            />
                                            {s}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        {scope === DdlScope.Objects && (
                            <div className="flex-1 flex flex-col min-h-0 gap-2">
                                <div>
                                    <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1 block">Context Schema</label>
                                    <select
                                        className="w-full bg-bg-2 border border-border rounded px-2 py-1 text-sm outline-none focus:border-accent"
                                        value={activeObjectSchema || ''}
                                        onChange={e => setActiveObjectSchema(e.target.value)}
                                    >
                                        {schemas.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>

                                <div className="flex-1 border border-border rounded overflow-hidden flex flex-col bg-bg-2">
                                    <div className="flex border-b border-border text-xs">
                                        <div className="flex-1 px-2 py-1 font-medium bg-bg-3 text-center">Objects</div>
                                    </div>
                                    <div className="overflow-y-auto p-1 flex-1">
                                        {activeObjectSchema ? (
                                            <>
                                                {tables.length > 0 && (
                                                    <>
                                                        <div className="px-2 py-1 text-[10px] font-bold text-text-tertiary uppercase sticky top-0 bg-bg-2">Tables</div>
                                                        {tables.map(t => (
                                                            <label key={t.name} className="flex items-center gap-2 px-2 py-0.5 hover:bg-bg-3 cursor-pointer text-xs">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isObjectSelected(activeObjectSchema, DdlObjectType.Table, t.name)}
                                                                    onChange={() => handleObjectToggle({ schema: activeObjectSchema, objectType: DdlObjectType.Table, name: t.name })}
                                                                    className="rounded border-border"
                                                                />
                                                                <span className="truncate">{t.name}</span>
                                                            </label>
                                                        ))}
                                                    </>
                                                )}

                                                {views.length > 0 && (
                                                    <>
                                                        <div className="px-2 py-1 text-[10px] font-bold text-text-tertiary uppercase mt-2 sticky top-0 bg-bg-2">Views</div>
                                                        {views.map(v => (
                                                            <label key={v.name} className="flex items-center gap-2 px-2 py-0.5 hover:bg-bg-3 cursor-pointer text-xs">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isObjectSelected(activeObjectSchema, DdlObjectType.View, v.name)}
                                                                    onChange={() => handleObjectToggle({ schema: activeObjectSchema, objectType: DdlObjectType.View, name: v.name })}
                                                                    className="rounded border-border"
                                                                />
                                                                <span className="truncate">{v.name}</span>
                                                            </label>
                                                        ))}
                                                    </>
                                                )}

                                                {functions.length > 0 && (
                                                    <>
                                                        <div className="px-2 py-1 text-[10px] font-bold text-text-tertiary uppercase mt-2 sticky top-0 bg-bg-2">Functions</div>
                                                        {functions.map(f => (
                                                            <label key={f.name} className="flex items-center gap-2 px-2 py-0.5 hover:bg-bg-3 cursor-pointer text-xs">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isObjectSelected(activeObjectSchema, DdlObjectType.Function, f.name)}
                                                                    onChange={() => handleObjectToggle({ schema: activeObjectSchema, objectType: DdlObjectType.Function, name: f.name })}
                                                                    className="rounded border-border"
                                                                />
                                                                <span className="truncate">{f.name}</span>
                                                            </label>
                                                        ))}
                                                    </>
                                                )}

                                                {tables.length === 0 && views.length === 0 && functions.length === 0 && (
                                                    <div className="p-4 text-center text-text-tertiary text-xs">No objects found</div>
                                                )}
                                            </>
                                        ) : (
                                            <div className="p-4 text-center text-text-tertiary text-xs">Select a schema</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="mt-2 text-sm">
                            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 block">Options</label>
                            <div className="flex flex-col gap-2">
                                <label className="flex items-center gap-2 text-text-primary cursor-pointer select-none">
                                    <input type="checkbox" checked={includeDrop} onChange={e => setIncludeDrop(e.target.checked)} className="rounded border-border" />
                                    Include DROP statements
                                </label>
                                <label className="flex items-center gap-2 text-text-primary cursor-pointer select-none">
                                    <input type="checkbox" checked={ifExists} onChange={e => setIfExists(e.target.checked)} disabled={!includeDrop} className="rounded border-border" />
                                    IF EXISTS
                                </label>
                                <label className="flex items-center gap-2 text-text-primary cursor-pointer select-none">
                                    <input type="checkbox" checked={!includeOwnerPrivileges} onChange={e => setIncludeOwnerPrivileges(!e.target.checked)} className="rounded border-border" />
                                    Exclude Owner/Privileges
                                </label>
                                <label className="flex items-center gap-2 text-text-primary cursor-pointer select-none">
                                    <input type="checkbox" checked={includeComments} onChange={e => setIncludeComments(e.target.checked)} className="rounded border-border" />
                                    Include Comments
                                </label>
                                <div className="flex flex-col gap-1">
                                    <label className="flex items-center gap-2 text-text-primary cursor-pointer select-none">
                                        <input type="checkbox" checked={preferPgDump} onChange={e => setPreferPgDump(e.target.checked)} className="rounded border-border" />
                                        Use pg_dump (recommended)
                                    </label>
                                    {preferPgDump && pgDumpStatus && !pgDumpStatus.found && (
                                        <div className="flex items-center gap-1.5 text-warning text-xs ml-6">
                                            <AlertTriangle size={12} />
                                            <span>pg_dump not found in PATH</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleExport}
                            disabled={loading || (scope === DdlScope.Schema && selectedSchemas.length === 0) || (scope === DdlScope.Objects && selectedTables.length === 0)}
                            className="mt-auto px-4 py-2 bg-primary-default text-text-inverse rounded hover:bg-primary-hover disabled:opacity-50 font-medium flex items-center justify-center gap-2"
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
