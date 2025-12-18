import React, { useState, useEffect } from 'react';
import { Connection, ConnectionFormModalProps } from '../../types';
import { useConnectionStore } from '../../store/connectionStore';
import { ChevronDown } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';

import { DATABASE_TYPES } from '../../constants/databaseTypes';

const STATUS_COLORS = [
    { name: 'Gray', class: 'bg-gray-500' },
    { name: 'Dark', class: 'bg-gray-700' },
    { name: 'Blue', class: 'bg-blue-500' },
    { name: 'Gold', class: 'bg-yellow-500' },
    { name: 'Green', class: 'bg-green-500' },
    { name: 'Red', class: 'bg-red-500' },
];

const DEFAULT_FORM_DATA = {
    name: '',
    type: 'postgres' as Connection['type'],
    host: 'localhost',
    port: '5432',
    database: '',
    user: '',
    password: '',
    statusColor: 'bg-blue-500',
    ssl: false,
    environment: 'development',
    safe_mode_level: '1', // using string for select
    tls_enabled: false,
    tls_ca_cert: '',
};

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

    useEffect(() => {
        if (isOpen) {
            if (initialValues) {
                setFormData(prev => ({
                    ...prev,
                    ...initialValues,
                    port: String(initialValues.port || '5432'),
                    user: initialValues.username || '',
                    environment: initialValues.environment || 'development',
                    safe_mode_level: String(initialValues.safe_mode_level ?? 1),
                    tls_enabled: initialValues.tls_enabled ?? false,
                    tls_ca_cert: initialValues.tls_ca_cert ?? '',
                }));
            } else {
                const nextType = initialType || DEFAULT_FORM_DATA.type;
                const dbColor = DATABASE_TYPES.find(t => t.id === nextType)?.color;
                setFormData({
                    ...DEFAULT_FORM_DATA,
                    type: nextType,
                    statusColor: dbColor || DEFAULT_FORM_DATA.statusColor,
                    host: nextType === 'sqlite' ? '' : DEFAULT_FORM_DATA.host,
                    port: nextType === 'sqlite' ? '0' : (nextType === 'clickhouse' ? '8123' : (nextType === 'tidb' ? '4000' : (nextType === 'mysql' || nextType === 'mariadb' ? '3306' : (nextType === 'couchbase' ? '8091' : (nextType === 'cockroach' ? '26257' : DEFAULT_FORM_DATA.port))))),
                    user: nextType === 'sqlite' ? '' : (nextType === 'clickhouse' ? 'default' : (nextType === 'mysql' || nextType === 'mariadb' || nextType === 'tidb' ? 'root' : (nextType === 'couchbase' ? 'Administrator' : (nextType === 'cockroach' ? 'root' : DEFAULT_FORM_DATA.user)))),
                    password: nextType === 'sqlite' ? '' : DEFAULT_FORM_DATA.password,
                    environment: DEFAULT_FORM_DATA.environment,
                    safe_mode_level: DEFAULT_FORM_DATA.safe_mode_level,
                    tls_enabled: DEFAULT_FORM_DATA.tls_enabled,
                    tls_ca_cert: DEFAULT_FORM_DATA.tls_ca_cert,
                });
            }
            setRecentSqliteDbs(loadRecentSqliteDbs());
        }
    }, [isOpen, initialValues, initialType]);

    const getConnectionData = () => ({
        name: formData.name,
        type: formData.type,
        host: formData.type === 'sqlite' ? '' : formData.host,
        port: formData.type === 'sqlite' ? 0 : (parseInt(formData.port) || (formData.type === 'clickhouse' ? 8123 : (formData.type === 'tidb' ? 4000 : (formData.type === 'mysql' || formData.type === 'mariadb' ? 3306 : (formData.type === 'couchbase' ? 8091 : (formData.type === 'cockroach' ? 26257 : 5432)))))),
        database: formData.database,
        username: formData.type === 'sqlite' ? '' : formData.user,
        password: formData.type === 'sqlite' ? '' : formData.password,
        ssl: formData.ssl ?? false,
        environment: formData.environment,
        safe_mode_level: parseInt(formData.safe_mode_level) || 1,
        tls_enabled: formData.type === 'couchbase' ? formData.tls_enabled : undefined,
        tls_ca_cert: formData.type === 'couchbase' ? formData.tls_ca_cert : undefined,
    });

    const handleChange = (field: keyof typeof formData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleTest = async () => {
        setTestStatus('testing');
        setTestMessage(null);
        setError(null);

        try {
            const result = await testConnectionDetails(getConnectionData());
            if (result.success) {
                setTestStatus('success');
                setTestMessage('Connection successful!');
            } else {
                setTestStatus('error');
                setTestMessage(result.message || 'Connection failed');
            }
        } catch (err) {
            setTestStatus('error');
            setTestMessage('Failed to test connection');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            if (formData.type === 'sqlite' && formData.database.trim()) {
                pushRecentSqliteDb(formData.database);
                setRecentSqliteDbs(loadRecentSqliteDbs());
            }
            await onSubmit(getConnectionData());
            setFormData(DEFAULT_FORM_DATA);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create connection');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBrowseSqlite = async () => {
        try {
            const selected = await invoke<string | null>('pick_sqlite_db_file');
            if (!selected) return;
            handleChange('database', selected);
            pushRecentSqliteDb(selected);
            setRecentSqliteDbs(loadRecentSqliteDbs());
        } catch {
            // ignore
        }
    };

    const dbLabel = DATABASE_TYPES.find(t => t.id === formData.type)?.name || 'PostgreSQL';

    const footer = (
        <div className="flex w-full items-center justify-between">
            <Button variant="ghost" className="flex items-center gap-2">
                Over SSH <ChevronDown size={12} />
            </Button>
            <div className="flex gap-2">
                <Button variant="secondary" onClick={onClose}>
                    Cancel
                </Button>
                <Button variant="secondary" onClick={handleTest} disabled={testStatus === 'testing'}>
                    {testStatus === 'testing' ? 'Testing...' : 'Test'}
                </Button>
                <Button
                    variant="primary"
                    onClick={() => {
                        // Create a fake event or just call helper. 
                        // Form will catch standard submit, but Buttons are type="button" by default.
                        // We can manually trigger form submit logic since they are outside form tag in Modal footer.
                        // Actually, Modal footer is OUTSIDE the form if form wraps children.
                        // So we should manually call handleSubmit(e as any).
                        handleSubmit({ preventDefault: () => { } } as any);
                    }}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? 'Connecting...' : 'Connect'}
                </Button>
            </div>
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`${dbLabel} Connection`}
            size="lg"
            footer={footer}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {(error || testMessage) && (
                    <div className={`px-4 py-3 border rounded-xl text-sm flex items-start gap-3 ${testStatus === 'success'
                        ? 'bg-green-500/10 border-green-500/30 text-green-400'
                        : 'bg-red-500/10 border-red-500/30 text-error'
                        }`}>
                        <span>{error || testMessage}</span>
                    </div>
                )}

                {/* Name */}
                <div className="grid grid-cols-[120px_1fr] gap-4 items-center">
                    <label className="text-sm text-text-secondary">Name</label>
                    <Input
                        value={formData.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        placeholder="My Connection"
                        required
                    />
                </div>

                {/* Status Color & Tag */}
                <div className="grid grid-cols-[120px_1fr] gap-4 items-center">
                    <label className="text-sm text-text-secondary">Status color</label>
                    <div className="flex items-center gap-3">
                        <div className="flex gap-2">
                            {STATUS_COLORS.map((color) => (
                                <button
                                    key={color.name}
                                    type="button"
                                    onClick={() => handleChange('statusColor', color.class)}
                                    className={`w-6 h-6 rounded-full ${color.class} ${formData.statusColor === color.class ? 'ring-2 ring-bg-1 ring-offset-2 ring-offset-accent' : 'opacity-60 hover:opacity-100'} transition-all`}
                                    title={color.name}
                                />
                            ))}
                        </div>
                        <div className="flex-1" />
                        <Button variant="secondary" size="sm" rightIcon={<ChevronDown size={12} />}>
                            Tag
                        </Button>
                    </div>
                </div>

                {/* Environment & Safe Mode */}
                <div className="grid grid-cols-[120px_1fr] gap-4 items-center">
                    <label className="text-sm text-text-secondary">Environment</label>
                    <div className="flex gap-3">
                        <select
                            value={formData.environment}
                            onChange={(e) => handleChange('environment', e.target.value)}
                            className="bg-bg-1 border border-border rounded px-3 py-2 text-sm text-text-primary focus:border-accent focus:ring-1 focus:ring-accent outline-none flex-1"
                        >
                            <option value="development">Development</option>
                            <option value="staging">Staging</option>
                            <option value="production">Production</option>
                        </select>

                        <label className="text-sm text-text-secondary self-center whitespace-nowrap">Safe Mode</label>
                        <select
                            value={formData.safe_mode_level}
                            onChange={(e) => handleChange('safe_mode_level', e.target.value)}
                            className="bg-bg-1 border border-border rounded px-3 py-2 text-sm text-text-primary focus:border-accent focus:ring-1 focus:ring-accent outline-none w-32"
                        >
                            <option value="0">Off</option>
                            <option value="1">Warning</option>
                            <option value="2">Strict</option>
                        </select>
                    </div>
                </div>

                {/* Host & Port */}
                {formData.type !== 'sqlite' && (
                    <div className="grid grid-cols-[120px_1fr] gap-4 items-center">
                        <label className="text-sm text-text-secondary">Host/Socket</label>
                        <div className="flex gap-3">
                            <Input
                                value={formData.host}
                                onChange={(e) => handleChange('host', e.target.value)}
                                placeholder="localhost"
                                autoCapitalize="off"
                                autoCorrect="off"
                                spellCheck={false}
                                required
                                className="flex-1"
                            />
                            <label className="text-sm text-text-secondary self-center">Port</label>
                            <Input
                                value={formData.port}
                                onChange={(e) => handleChange('port', e.target.value)}
                                placeholder="5432"
                                className="w-24"
                            />
                        </div>
                    </div>
                )}

                {/* User */}
                {formData.type !== 'sqlite' && (
                    <div className="grid grid-cols-[120px_1fr] gap-4 items-center">
                        <label className="text-sm text-text-secondary">User</label>
                        <div className="flex gap-3">
                            <Input
                                value={formData.user}
                                onChange={(e) => handleChange('user', e.target.value)}
                                placeholder="postgres"
                                autoCapitalize="off"
                                autoCorrect="off"
                                spellCheck={false}
                                className="flex-1"
                            />
                            <Button variant="secondary" size="sm" rightIcon={<ChevronDown size={12} />}>
                                Other options
                            </Button>
                        </div>
                    </div>
                )}

                {/* Password */}
                {formData.type !== 'sqlite' && (
                    <div className="grid grid-cols-[120px_1fr] gap-4 items-center">
                        <label className="text-sm text-text-secondary">Password</label>
                        <div className="flex gap-3">
                            <Input
                                type="password"
                                value={formData.password}
                                onChange={(e) => handleChange('password', e.target.value)}
                                placeholder="••••••••"
                                className="flex-1"
                            />
                            <Button variant="secondary" size="sm" rightIcon={<ChevronDown size={12} />}>
                                Keychain
                            </Button>
                        </div>
                    </div>
                )}

                {/* Database */}
                <div className="grid grid-cols-[120px_1fr] gap-4 items-center">
                    <label className="text-sm text-text-secondary">{formData.type === 'sqlite' ? 'Database file' : (formData.type === 'couchbase' ? 'Bucket' : 'Database')}</label>
                    <div className="flex gap-3">
                        <Input
                            value={formData.database}
                            onChange={(e) => handleChange('database', e.target.value)}
                            placeholder={formData.type === 'sqlite' ? '/path/to/db.sqlite (empty = :memory:)' : (formData.type === 'couchbase' ? 'my_bucket (optional)' : 'my_database')}
                            autoCapitalize="off"
                            autoCorrect="off"
                            spellCheck={false}
                            required={!['sqlite', 'tidb', 'mysql', 'mariadb', 'couchbase'].includes(formData.type)}
                            className="flex-1"
                        />
                        {formData.type === 'sqlite' ? (
                            <Button variant="secondary" size="sm" onClick={handleBrowseSqlite}>
                                Browse...
                            </Button>
                        ) : (
                            <Button variant="secondary" size="sm">
                                Bootstrap...
                            </Button>
                        )}
                    </div>
                    {formData.type === 'sqlite' && recentSqliteDbs.length > 0 && (
                        <div className="col-start-2 flex flex-wrap gap-2">
                            {recentSqliteDbs.slice(0, 6).map((p) => (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => handleChange('database', p)}
                                    className="max-w-full px-2 py-1 rounded-full border border-border bg-bg-2 text-xs text-text-secondary hover:bg-bg-3 truncate"
                                    title={p}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Couchbase TLS Options */}
                {formData.type === 'couchbase' && (
                    <div className="grid grid-cols-[120px_1fr] gap-4 items-start border-t border-border pt-4">
                        <label className="text-sm text-text-secondary pt-2">TLS / SSL</label>
                        <div className="space-y-3">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.tls_enabled}
                                    onChange={(e) => handleChange('tls_enabled', e.target.checked as any)}
                                    className="rounded border-border bg-bg-1 text-accent focus:ring-accent"
                                />
                                <span className="text-sm text-text-primary">Enable TLS</span>
                            </label>

                            {formData.tls_enabled && (
                                <div className="space-y-1">
                                    <label className="text-xs text-text-secondary">CA Certificate (PEM)</label>
                                    <textarea
                                        value={formData.tls_ca_cert}
                                        onChange={(e) => handleChange('tls_ca_cert', e.target.value)}
                                        placeholder="-----BEGIN CERTIFICATE-----..."
                                        className="w-full h-24 bg-bg-1 border border-border rounded px-3 py-2 text-sm font-mono text-text-primary focus:border-accent outline-none resize-none"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </form>
        </Modal >
    );
};
