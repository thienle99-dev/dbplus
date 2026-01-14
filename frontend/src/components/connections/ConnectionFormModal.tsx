import React, { useState, useEffect } from 'react';
import { Connection, ConnectionFormModalProps } from '../../types';
import { useConnectionStore } from '../../store/connectionStore';
import {
    Globe, Lock, Cpu, Database, Save, Activity, Check,
    AlertCircle, Terminal, HardDrive
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Select from '../ui/Select';

import { DATABASE_TYPES } from '../../constants/databaseTypes';
import {
    PostgresIcon, MysqlIcon, ClickHouseIcon, SqliteIcon, MongoIcon, RedisIcon,
    MariaDBIcon
} from '../icons/DatabaseIcons';

const STATUS_COLORS = [
    { name: 'Default', class: 'bg-slate-500' },
    { name: 'System', class: 'bg-blue-500' },
    { name: 'Secure', class: 'bg-emerald-500' },
    { name: 'Danger', class: 'bg-rose-500' },
    { name: 'Warning', class: 'bg-amber-500' },
    { name: 'Premium', class: 'bg-indigo-500' },
];

const DEFAULT_FORM_DATA = {
    name: '',
    type: 'postgres' as Connection['type'],
    host: 'localhost',
    port: '5432',
    database: '',
    user: '',
    password: '',
    status_color: 'bg-blue-500',
    tags: '',
    ssl: false,
    environment: 'development',
    safe_mode_level: '1',
    id: undefined as string | undefined,
};

const ENVIRONMENT_OPTIONS = [
    { value: 'development', label: 'Development' },
    { value: 'staging', label: 'Staging' },
    { value: 'production', label: 'Production' },
];

const SAFE_MODE_OPTIONS = [
    { value: '0', label: 'Disabled' },
    { value: '1', label: 'Standard' },
    { value: '2', label: 'Strict' },
];

const SSL_MODE_OPTIONS = [
    { value: 'disable', label: 'None' },
    { value: 'require', label: 'Required' },
    { value: 'verify-full', label: 'Verify CA/Full' },
];

const RECENT_SQLITE_DB_KEY = 'dbplus.recentSqliteDbs';
const MAX_RECENT_SQLITE_DBS = 8;

function loadRecentSqliteDbs(): string[] {
    try {
        const raw = localStorage.getItem(RECENT_SQLITE_DB_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : [];
    } catch {
        return [];
    }
}

function pushRecentSqliteDb(path: string) {
    const clean = path.trim();
    if (!clean) return;
    const current = loadRecentSqliteDbs();
    const next = [clean, ...current.filter((p) => p !== clean)].slice(0, MAX_RECENT_SQLITE_DBS);
    localStorage.setItem(RECENT_SQLITE_DB_KEY, JSON.stringify(next));
}

export const ConnectionFormModal: React.FC<ConnectionFormModalProps> = ({ isOpen, onClose, onSubmit, initialValues, initialType }) => {
    const [formData, setFormData] = useState(DEFAULT_FORM_DATA);
    const [recentSqliteDbs, setRecentSqliteDbs] = useState<string[]>([]);
    const { testConnectionDetails } = useConnectionStore();
    const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
    const [testMessage, setTestMessage] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const getDatabaseDefaults = (type: string) => {
        switch (type) {
            case 'postgres': return { port: '5432', user: 'postgres', database: 'postgres' };
            case 'mysql': return { port: '3306', user: 'root', database: 'mysql' };
            case 'mariadb': return { port: '3306', user: 'root', database: 'mysql' };
            case 'clickhouse': return { port: '8123', user: 'default', database: 'default' };
            case 'redis': return { port: '6379', user: '', database: '0' };
            case 'mongo': return { port: '27017', user: '', database: 'test' };
            case 'couchbase': return { port: '8091', user: 'Administrator', database: '' }; // 8091 is for HTTP/REST, 11210 for KV/Memcached
            case 'sqlite': return { port: '', user: '', database: '' };
            default: return { port: '', user: '', database: '' };
        }
    };

    useEffect(() => {
        if (isOpen) {
            if (initialValues) {
                const { password, ...others } = initialValues as any;
                setFormData(prev => ({
                    ...prev,
                    ...others,
                    password: '',
                    status_color: initialValues.status_color || 'bg-blue-500',
                    tags: initialValues.tags || '',
                    port: String(initialValues.port || ''),
                    user: initialValues.username || '',
                    environment: initialValues.environment || 'development',
                    safe_mode_level: String(initialValues.safe_mode_level ?? 1),
                    id: (initialValues as any).id,
                }));
            } else {
                const nextType = initialType || 'postgres';
                const dbColor = DATABASE_TYPES.find(t => t.id === nextType)?.color;
                const defaults = getDatabaseDefaults(nextType);

                setFormData({
                    ...DEFAULT_FORM_DATA,
                    type: nextType,
                    status_color: dbColor || 'bg-blue-500',
                    host: nextType === 'sqlite' ? '' : 'localhost',
                    ...defaults,
                });
            }
            setRecentSqliteDbs(loadRecentSqliteDbs());
            setTestStatus('idle');
            setTestMessage(null);
        }
    }, [isOpen, initialValues, initialType]);

    const getConnectionData = () => ({
        ...formData,
        port: parseInt(formData.port) || 0,
        username: formData.user,
        safe_mode_level: parseInt(formData.safe_mode_level) || 1,
    });

    const handleChange = (field: keyof typeof formData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Reset test status when inputs change
        if (testStatus !== 'idle') {
            setTestStatus('idle');
            setTestMessage(null);
        }
    };

    const handleTest = async () => {
        setTestStatus('testing');
        setTestMessage(null);
        setError(null);
        try {
            console.log('Testing connection with data:', getConnectionData());
            const result = await testConnectionDetails(getConnectionData());
            console.log('Test result:', result);

            if (result.success) {
                setTestStatus('success');
                setTestMessage('Handshake verified. Connection established.');
            } else {
                setTestStatus('error');
                setTestMessage(result.message || 'Verification failed.');
            }
        } catch (err: any) {
            console.error('Test connection error:', err);
            setTestStatus('error');
            // Extract meaningful message from potentially complex error object
            const msg = err.message || (typeof err === 'string' ? err : 'Network error occurred during test.');
            setTestMessage(msg);
        }
    };

    const handleFormSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        setError(null);
        setIsSubmitting(true);
        try {
            if (formData.type === 'sqlite' && formData.database.trim()) {
                pushRecentSqliteDb(formData.database);
            }
            await onSubmit(getConnectionData());
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Storage internal error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBrowseSqlite = async () => {
        try {
            const selected = await invoke<string | null>('pick_sqlite_db_file');
            if (selected) handleChange('database', selected);
        } catch (err) { console.error(err); }
    };

    const dbInfo = DATABASE_TYPES.find(t => t.id === formData.type);

    const renderIcon = (id: string) => {
        const className = "w-6 h-6 object-contain";
        switch (id) {
            case 'postgres': return <PostgresIcon className={className} />;
            case 'mysql': return <MysqlIcon className={className} />;
            case 'mariadb': return <MariaDBIcon className={className} />;
            case 'sqlite': return <SqliteIcon className={className} />;
            case 'mongo': return <MongoIcon className={className} />;
            case 'redis': return <RedisIcon className={className} />;
            case 'clickhouse': return <ClickHouseIcon className={className} />;
            default: return <Database size={24} className="text-accent" />;
        }
    };

    const footer = (
        <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" className="opacity-50 hover:opacity-100 italic font-medium">
                    Add to Vault
                </Button>
            </div>
            <div className="flex gap-2.5">
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button
                    variant="secondary"
                    onClick={handleTest}
                    isLoading={testStatus === 'testing'}
                    leftIcon={<Activity size={14} />}
                >
                    Test
                </Button>
                <Button
                    variant="primary"
                    onClick={() => handleFormSubmit()}
                    isLoading={isSubmitting}
                    leftIcon={<Save size={14} />}
                    className="min-w-[120px]"
                >
                    {initialValues ? 'Save' : 'Connect'}
                </Button>
            </div>
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-bg-elevated border border-border-default flex items-center justify-center shadow-inner">
                        {renderIcon(formData.type)}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-lg font-black tracking-tight text-text-primary">{initialValues ? 'Update' : 'New'} {dbInfo?.name || 'Engine'}</span>
                        <span className="text-[10px] font-bold text-text-muted tracking-widest">{formData.type} instance configuration</span>
                    </div>
                </div>
            }
            size="lg"
            footer={footer}
            className="glass"
        >
            <form className="space-y-8 py-2 pb-40">
                {/* Result Message Overlay */}
                {(error || testMessage) && (
                    <div className={`animate-fadeIn flex items-center gap-4 px-5 py-4 rounded-md border backdrop-blur-md transition-all ${testStatus === 'success' ? 'bg-success/10 border-success/30 text-success shadow-[0_0_15px_rgba(var(--color-success),0.1)]' : 'bg-error/10 border-error/30 text-error shadow-[0_0_15px_rgba(var(--color-error),0.1)]'
                        }`}>
                        {testStatus === 'success' ? <Check size={20} strokeWidth={3} /> : <AlertCircle size={20} strokeWidth={3} />}
                        <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] font-black uppercase tracking-widest">{testStatus === 'success' ? 'Connection Verified' : 'Handshake Error'}</span>
                            <span className="text-sm font-medium">{error || testMessage}</span>
                        </div>
                    </div>
                )}

                {/* Section: General */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 px-1">
                        <Database size={14} className="text-accent" />
                        <h3 className="text-[10px] font-black tracking-[0.2em] text-text-muted">General Identity</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-text-secondary px-1">Connection Alias</label>
                            <Input
                                value={formData.name}
                                onChange={(e) => handleChange('name', e.target.value)}
                                placeholder="E.g. Main Analytics DB"
                                className="bg-bg-elevated border-border-default focus:bg-bg-hover"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-text-secondary px-1">Traffic Label</label>
                            <div className="flex items-center gap-2 h-10 px-0.5">
                                {STATUS_COLORS.map((color) => (
                                    <button
                                        key={color.name}
                                        type="button"
                                        onClick={() => handleChange('status_color', color.class)}
                                        className={`w-6 h-6 rounded-full ${color.class} transition-all duration-300 relative ${formData.status_color === color.class ? 'ring-2 ring-accent ring-offset-2 ring-offset-bg-1 scale-110 shadow-lg' : 'opacity-40 hover:opacity-100 hover:scale-110'
                                            }`}
                                        title={color.name}
                                    />
                                ))}
                                <div className="flex-1" />
                                <div className="w-px h-6 bg-border-strong mx-1" />
                                <Input
                                    placeholder="TAGS..."
                                    value={formData.tags}
                                    onChange={(e) => handleChange('tags', e.target.value)}
                                    className="flex-1 border-none bg-transparent font-black uppercase tracking-widest text-[9px] h-8 text-right px-0"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section: Infrastructure */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 px-1">
                        <Globe size={14} className="text-info" />
                        <h3 className="text-[10px] font-black tracking-[0.2em] text-text-muted">Network & Infrastructure</h3>
                    </div>

                    <div className="p-5 rounded-lg bg-bg-sunken border border-border-subtle space-y-6">
                        {formData.type !== 'sqlite' ? (
                            <div className="grid grid-cols-12 gap-4">
                                <div className="col-span-9 space-y-2">
                                    <label className="text-[11px] font-bold text-text-secondary ml-1">Host/Endpoint</label>
                                    <Input
                                        value={formData.host}
                                        onChange={(e) => handleChange('host', e.target.value)}
                                        placeholder="db.example.com"
                                        leftIcon={<Terminal size={14} className="opacity-50" />}
                                    />
                                </div>
                                <div className="col-span-3 space-y-2">
                                    <label className="text-[11px] font-bold text-text-secondary ml-1">Port</label>
                                    <Input
                                        value={formData.port}
                                        onChange={(e) => handleChange('port', e.target.value)}
                                        placeholder="5432"
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-text-secondary ml-1">Database File Path</label>
                                <div className="flex gap-2">
                                    <Input
                                        value={formData.database}
                                        onChange={(e) => handleChange('database', e.target.value)}
                                        placeholder="/users/db/storage.sqlite"
                                        className="flex-1"
                                        leftIcon={<HardDrive size={14} className="opacity-50" />}
                                    />
                                    <Button variant="secondary" onClick={handleBrowseSqlite} className="h-10 px-4">Browse</Button>
                                </div>
                                {recentSqliteDbs.length > 0 && (
                                    <div className="flex flex-wrap gap-2 pt-1 px-1">
                                        {recentSqliteDbs.slice(0, 4).map(p => (
                                            <button
                                                key={p} type="button"
                                                onClick={() => handleChange('database', p)}
                                                className="text-[9px] font-bold text-text-muted hover:text-text-primary bg-bg-elevated hover:bg-bg-hover px-2 py-0.5 rounded-full border border-border-default hover:border-border-strong truncate max-w-[200px] transition-colors"
                                            >
                                                {p.split('/').pop()}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {formData.type !== 'sqlite' && (
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-text-secondary ml-1">Database Name</label>
                                <Input
                                    value={formData.database}
                                    onChange={(e) => handleChange('database', e.target.value)}
                                    placeholder="production_main"
                                    required
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Section: Authentication */}
                {formData.type !== 'sqlite' && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 px-1">
                            <Lock size={14} className="text-warning" />
                            <h3 className="text-[10px] font-black tracking-[0.2em] text-text-muted">Security & Authentication</h3>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-text-secondary ml-1">Credentials User</label>
                                <Input
                                    value={formData.user}
                                    onChange={(e) => handleChange('user', e.target.value)}
                                    placeholder="root"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-text-secondary ml-1">Access Password</label>
                                <Input
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => handleChange('password', e.target.value)}
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Section: Environment Details */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 px-1">
                        <Cpu size={14} className="text-accent" />
                        <h3 className="text-[10px] font-black tracking-[0.2em] text-text-muted">Engine Context</h3>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-text-secondary ml-1">Environment</label>
                            <Select
                                value={formData.environment}
                                onChange={(val) => handleChange('environment', val)}
                                options={ENVIRONMENT_OPTIONS}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-text-secondary ml-1">Safe Mode</label>
                            <Select
                                value={formData.safe_mode_level}
                                onChange={(val) => handleChange('safe_mode_level', val)}
                                options={SAFE_MODE_OPTIONS}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-text-secondary ml-1">Encryption (SSL)</label>
                            <Select
                                value={formData.ssl ? 'require' : 'disable'}
                                onChange={(val) => handleChange('ssl', val !== 'disable')}
                                options={SSL_MODE_OPTIONS}
                            />
                        </div>
                    </div>
                </div>
            </form>
        </Modal>
    );
};
