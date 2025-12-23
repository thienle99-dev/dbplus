import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { connectionApi } from '../../services/connectionApi';
import { 
    Table, 
    Shield, 
    FunctionSquare, 
    AlertCircle,
    Check,
    X,
    Database,
    LayoutGrid
} from 'lucide-react';
import Select from '../ui/Select';

export default function PermissionInspector() {
    const { connectionId } = useParams<{ connectionId: string }>();
    const [selectedSchema, setSelectedSchema] = useState<string>('');
    const [selectedObject, setSelectedObject] = useState<{ type: 'SCHEMA' | 'TABLE' | 'FUNCTION', name: string } | null>(null);
    const [activeTab, setActiveTab] = useState<'tables' | 'functions'>('tables');
    const [diffMode, setDiffMode] = useState(false);
    const [diffUserA, setDiffUserA] = useState<string>('');
    const [diffUserB, setDiffUserB] = useState<string>('');

    // Queries
    const { data: schemas = [] } = useQuery({
        queryKey: ['schemas', connectionId],
        queryFn: () => connectionApi.getSchemas(connectionId!),
        enabled: !!connectionId
    });

    const { data: roles = [] } = useQuery({
        queryKey: ['roles', connectionId],
        queryFn: () => connectionApi.getRoles(connectionId!),
        enabled: !!connectionId
    });

    const { data: tables = [] } = useQuery({
        queryKey: ['tables', connectionId, selectedSchema],
        queryFn: async () => {
             const res = await connectionApi.getTables(connectionId!, selectedSchema);
             return res || [];
        },
        enabled: !!connectionId && !!selectedSchema
    });

    const { data: functions = [] } = useQuery({
        queryKey: ['functions', connectionId, selectedSchema],
        queryFn: async () => {
            const res = await connectionApi.listFunctions(connectionId!, selectedSchema);
            return res || [];
        },
        enabled: !!connectionId && !!selectedSchema
    });

    // Permission Query
    const { data: permissions = [], isLoading: loadingPermissions } = useQuery({
        queryKey: ['permissions', connectionId, selectedSchema, selectedObject?.type, selectedObject?.name],
        queryFn: async () => {
            if (!selectedObject) return [];
            if (selectedObject.type === 'SCHEMA') {
                return connectionApi.getSchemaPermissions(connectionId!, selectedSchema);
            } else if (selectedObject.type === 'TABLE') {
                return connectionApi.getTablePermissions(connectionId!, selectedSchema, selectedObject.name);
            } else if (selectedObject.type === 'FUNCTION') {
                return connectionApi.getFunctionPermissions(connectionId!, selectedSchema, selectedObject.name);
            }
            return [];
        },
        enabled: !!connectionId && !!selectedObject
    });

    // Matrix Logic
    const allPrivileges = Array.from(new Set(permissions.map(p => p.privilege))).sort();
    const grantees = Array.from(new Set(permissions.map(p => p.grantee))).sort();

    const getPermission = (grantee: string, privilege: string) => {
        return permissions.find(p => p.grantee === grantee && p.privilege === privilege);
    };

    const schemaOptions = schemas.map(s => ({ label: s, value: s }));
    const roleOptions = roles.map(r => ({ label: r.name, value: r.name }));

    return (
        <div className="flex h-full bg-bg-1 text-text-primary">
            {/* Sidebar / Object Selection */}
            <div className="w-80 border-r border-border-light flex flex-col p-4 space-y-4 bg-bg-0">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary flex items-center gap-2">
                    <LayoutGrid size={16} /> Inspector
                </h2>
                
                <div className="space-y-2">
                    <label className="text-xs font-medium text-text-secondary">Schema</label>
                    <Select 
                        value={selectedSchema} 
                        onChange={(val) => { setSelectedSchema(val); setSelectedObject({ type: 'SCHEMA', name: val }); }}
                        options={schemaOptions}
                        placeholder="Select Schema"
                        searchable
                    />
                </div>

                {selectedSchema && (
                    <div className="flex-1 flex flex-col min-h-0">
                        <div className="flex border-b border-border-light mb-2">
                            <button 
                                onClick={() => setActiveTab('tables')}
                                className={`flex-1 py-2 text-xs font-medium border-b-2 transition-colors ${activeTab === 'tables' ? 'border-accent text-accent' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
                            >
                                Tables
                            </button>
                            <button 
                                onClick={() => setActiveTab('functions')}
                                className={`flex-1 py-2 text-xs font-medium border-b-2 transition-colors ${activeTab === 'functions' ? 'border-accent text-accent' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
                            >
                                Functions
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                            {activeTab === 'tables' ? (
                                tables.length === 0 ? <p className="text-xs text-text-tertiary p-2">No tables found.</p> :
                                tables.map(t => (
                                    <button 
                                        key={t.name}
                                        onClick={() => setSelectedObject({ type: 'TABLE', name: t.name })}
                                        className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors flex items-center gap-2 ${selectedObject?.name === t.name && selectedObject.type === 'TABLE' ? 'bg-accent/10 text-accent' : 'hover:bg-bg-2 text-text-primary'}`}
                                    >
                                        <Table size={14} className="opacity-70" /> 
                                        <span className="truncate">{t.name}</span>
                                    </button>
                                ))
                            ) : (
                                functions.length === 0 ? <p className="text-xs text-text-tertiary p-2">No functions found.</p> :
                                functions.map(f => (
                                    <button 
                                        key={f.name}
                                        onClick={() => setSelectedObject({ type: 'FUNCTION', name: f.name })}
                                        className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors flex items-center gap-2 ${selectedObject?.name === f.name && selectedObject.type === 'FUNCTION' ? 'bg-accent/10 text-accent' : 'hover:bg-bg-2 text-text-primary'}`}
                                    >
                                        <FunctionSquare size={14} className="opacity-70" /> 
                                        <span className="truncate">{f.name}</span>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-full overflow-hidden bg-bg-1">
                {selectedObject ? (
                    <div className="flex flex-col h-full">
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-border-light flex items-center justify-between bg-bg-0">
                            <div>
                                <h1 className="text-xl font-bold flex items-center gap-2 text-text-primary">
                                    {selectedObject.type === 'SCHEMA' && <Database className="text-blue-500" size={20} />}
                                    {selectedObject.type === 'TABLE' && <Table className="text-green-500" size={20} />}
                                    {selectedObject.type === 'FUNCTION' && <FunctionSquare className="text-purple-500" size={20} />}
                                    {selectedObject.name}
                                </h1>
                                <p className="text-text-secondary text-sm mt-1">
                                    Viewing permissions for {selectedObject.type.toLowerCase()} <span className="font-mono text-xs bg-bg-2 px-1 py-0.5 rounded">{selectedObject.name}</span>
                                </p>
                            </div>
                            
                            <div className="flex items-center bg-bg-2 rounded-lg p-1 border border-border-light">
                                <button 
                                    onClick={() => setDiffMode(false)}
                                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${!diffMode ? 'bg-bg-0 shadow-sm text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
                                >
                                    Matrix View
                                </button>
                                <button 
                                    onClick={() => setDiffMode(true)}
                                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${diffMode ? 'bg-bg-0 shadow-sm text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
                                >
                                    Diff Users
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-hidden p-6">
                            {loadingPermissions ? (
                                <div className="space-y-4 animate-pulse">
                                    <div className="h-10 bg-bg-2 rounded w-full"></div>
                                    <div className="h-10 bg-bg-2 rounded w-full"></div>
                                    <div className="h-10 bg-bg-2 rounded w-full"></div>
                                </div>
                            ) : diffMode ? (
                                <div className="h-full flex flex-col">
                                    <div className="grid grid-cols-2 gap-8 mb-6">
                                        <div>
                                            <label className="block text-xs font-semibold text-text-secondary mb-2 uppercase tracking-wide">User A</label>
                                            <Select 
                                                value={diffUserA} 
                                                onChange={setDiffUserA} 
                                                options={roleOptions} 
                                                placeholder="Select User A"
                                                searchable
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-text-secondary mb-2 uppercase tracking-wide">User B</label>
                                            <Select 
                                                value={diffUserB} 
                                                onChange={setDiffUserB} 
                                                options={roleOptions} 
                                                placeholder="Select User B"
                                                searchable
                                            />
                                        </div>
                                    </div>

                                    {diffUserA && diffUserB ? (
                                        <div className="border border-border-light rounded-lg overflow-hidden bg-bg-0 flex-1">
                                            <div className="overflow-auto max-h-full">
                                                <table className="w-full text-sm">
                                                    <thead className="bg-bg-2 text-text-secondary sticky top-0 z-10">
                                                        <tr>
                                                            <th className="px-4 py-3 text-left font-medium border-b border-border-light">Privilege</th>
                                                            <th className="px-4 py-3 text-center font-medium border-b border-border-light w-1/3">{diffUserA}</th>
                                                            <th className="px-4 py-3 text-center font-medium border-b border-border-light w-1/3">{diffUserB}</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-border-light">
                                                        {allPrivileges.length === 0 ? (
                                                            <tr>
                                                                <td colSpan={3} className="px-4 py-8 text-center text-text-tertiary">
                                                                    No permissions found for any user on this object.
                                                                </td>
                                                            </tr>
                                                        ) : (
                                                            allPrivileges.map(priv => {
                                                                const permA = getPermission(diffUserA, priv);
                                                                const permB = getPermission(diffUserB, priv);
                                                                const hasA = !!permA;
                                                                const hasB = !!permB;
                                                                const isDiff = hasA !== hasB;

                                                                return (
                                                                    <tr key={priv} className={isDiff ? 'bg-warning-50/10' : ''}>
                                                                        <td className="px-4 py-3 font-medium text-text-primary">{priv}</td>
                                                                        <td className="px-4 py-3 text-center">
                                                                            {hasA ? <Check className="mx-auto text-success" size={18} /> : <X className="mx-auto text-border-strong opacity-30" size={18} />}
                                                                        </td>
                                                                        <td className="px-4 py-3 text-center">
                                                                            {hasB ? <Check className="mx-auto text-success" size={18} /> : <X className="mx-auto text-border-strong opacity-30" size={18} />}
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex-1 flex flex-col items-center justify-center text-text-tertiary border border-dashed border-border-light rounded-lg bg-bg-0/50">
                                            <AlertCircle className="mb-2 opacity-50" size={32} />
                                            <p>Select two users to compare permissions.</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="h-full flex flex-col border border-border-light rounded-lg bg-bg-0 overflow-hidden shadow-sm">
                                    <div className="overflow-auto flex-1">
                                        <table className="w-full text-sm">
                                            <thead className="bg-bg-2 text-text-secondary sticky top-0 z-20 shadow-sm">
                                                <tr>
                                                    <th className="px-4 py-3 text-left font-medium border-b border-border-light bg-bg-2 sticky left-0 z-30 min-w-[150px] shadow-[1px_0_0_0_rgba(0,0,0,0.05)]">Role / User</th>
                                                    {allPrivileges.map(priv => (
                                                        <th key={priv} className="px-4 py-3 text-center font-medium border-b border-border-light min-w-[80px]">{priv}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border-light">
                                                {grantees.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={allPrivileges.length + 1} className="px-4 py-12 text-center text-text-tertiary">
                                                            <div className="flex flex-col items-center justify-center gap-2">
                                                                <Shield className="text-text-tertiary opacity-30" size={32} />
                                                                <p>No explicit grants found for this object.</p>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    grantees.map(grantee => (
                                                        <tr key={grantee} className="hover:bg-bg-2/50 transition-colors group">
                                                            <td className="px-4 py-2 font-medium sticky left-0 bg-bg-0 group-hover:bg-bg-2/50 transition-colors z-10 border-r border-border-light shadow-[1px_0_0_0_rgba(0,0,0,0.05)] text-text-primary">
                                                                {grantee}
                                                            </td>
                                                            {allPrivileges.map(priv => {
                                                                const perm = getPermission(grantee, priv);
                                                                return (
                                                                    <td key={priv} className="px-4 py-2 text-center">
                                                                        {perm ? (
                                                                            <div className="flex justify-center flex-col items-center gap-0.5">
                                                                                <Check className="text-success" size={16} />
                                                                                {perm.is_grantable && <span className="text-[9px] uppercase tracking-wider text-text-tertiary font-semibold">Grantable</span>}
                                                                            </div>
                                                                        ) : (
                                                                            <span className="block w-1.5 h-1.5 rounded-full bg-border-light mx-auto opacity-40" />
                                                                        )}
                                                                    </td>
                                                                );
                                                            })}
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-text-tertiary p-8">
                        <div className="w-16 h-16 bg-bg-2 rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-border-light">
                            <Shield size={32} className="text-accent opacity-80" />
                        </div>
                        <h3 className="text-xl font-semibold text-text-primary mb-2">Permission Inspector</h3>
                        <p className="max-w-md text-center leading-relaxed">
                            Select a schema, then choose a table or function from the sidebar to inspect detailed role permissions and grants.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
