import React, { useState, useEffect } from 'react';
import { Connection } from '../../types';
import { useConnectionStore } from '../../store/connectionStore';
import { ChevronDown } from 'lucide-react';

interface ConnectionFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (connection: Omit<Connection, 'id'>) => Promise<void>;
    initialValues?: Omit<Connection, 'id'>;
}

const DB_TYPES = [
    { value: 'postgres', label: 'PostgreSQL' },
    { value: 'mysql', label: 'MySQL' },
    { value: 'mongo', label: 'MongoDB' },
    { value: 'redis', label: 'Redis' },
] as const;

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
};

export const ConnectionFormModal: React.FC<ConnectionFormModalProps> = ({ isOpen, onClose, onSubmit, initialValues }) => {
    const [formData, setFormData] = useState(DEFAULT_FORM_DATA);

    useEffect(() => {
        if (isOpen) {
            if (initialValues) {
                setFormData(prev => ({
                    ...prev,
                    ...initialValues,
                    port: String(initialValues.port || '5432'),
                    user: initialValues.username || '',
                }));
            } else {
                setFormData(DEFAULT_FORM_DATA);
            }
        }
    }, [isOpen, initialValues]);

    const { testConnectionDetails } = useConnectionStore();
    const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
    const [testMessage, setTestMessage] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    const getConnectionData = () => ({
        name: formData.name,
        type: formData.type,
        host: formData.host,
        port: parseInt(formData.port) || 5432,
        database: formData.database,
        username: formData.user,
        password: formData.password,
        ssl: formData.ssl ?? false,
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
            await onSubmit(getConnectionData());
            setFormData(DEFAULT_FORM_DATA);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create connection');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const dbLabel = DB_TYPES.find(t => t.value === formData.type)?.label || 'PostgreSQL';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="relative bg-[#1e1e1e] rounded-xl shadow-2xl w-full max-w-2xl mx-4 border border-white/10">
                {/* Header */}
                <div className="px-6 py-4 border-b border-white/10">
                    <h2 className="text-center text-sm font-medium text-white">{dbLabel} Connection</h2>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6">
                    {(error || testMessage) && (
                        <div className={`mb-4 px-4 py-3 border rounded-lg text-sm flex items-start gap-3 ${testStatus === 'success'
                            ? 'bg-green-500/10 border-green-500/30 text-green-400'
                            : 'bg-red-500/10 border-red-500/30 text-red-400'
                            }`}>
                            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {testStatus === 'success' ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                )}
                            </svg>
                            <span>{error || testMessage}</span>
                        </div>
                    )}

                    <div className="space-y-4">
                        {/* Name */}
                        <div className="grid grid-cols-[120px_1fr] gap-4 items-center">
                            <label className="text-sm text-gray-400">Name</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => handleChange('name', e.target.value)}
                                placeholder="My Connection"
                                required
                                className="h-8 px-3 bg-[#121212] border border-[#2a2a2a] rounded text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-inner"
                            />
                        </div>

                        {/* Status Color & Tag */}
                        <div className="grid grid-cols-[120px_1fr] gap-4 items-center">
                            <label className="text-sm text-gray-400">Status color</label>
                            <div className="flex items-center gap-3">
                                <div className="flex gap-2">
                                    {STATUS_COLORS.map((color) => (
                                        <button
                                            key={color.name}
                                            type="button"
                                            onClick={() => handleChange('statusColor', color.class)}
                                            className={`w-6 h-6 rounded ${color.class} ${formData.statusColor === color.class ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1e1e1e]' : 'opacity-60 hover:opacity-100'} transition-all`}
                                            title={color.name}
                                        />
                                    ))}
                                </div>
                                <div className="flex-1" />
                                <button type="button" className="h-8 px-3 bg-[#121212] border border-[#2a2a2a] rounded text-gray-400 text-sm flex items-center gap-2 hover:bg-[#1a1a1a] transition-colors">
                                    Tag
                                    <ChevronDown className="w-3 h-3" />
                                </button>
                            </div>
                        </div>

                        {/* Host & Port */}
                        <div className="grid grid-cols-[120px_1fr] gap-4 items-center">
                            <label className="text-sm text-gray-400">Host/Socket</label>
                            <div className="flex gap-3">
                                <input
                                    type="text"
                                    value={formData.host}
                                    onChange={(e) => handleChange('host', e.target.value)}
                                    placeholder="localhost"
                                    autoCapitalize="off"
                                    autoCorrect="off"
                                    spellCheck={false}
                                    required
                                    className="flex-1 h-8 px-3 bg-[#121212] border border-[#2a2a2a] rounded text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-inner"
                                />
                                <label className="text-sm text-gray-400 self-center">Port</label>
                                <input
                                    type="text"
                                    value={formData.port}
                                    onChange={(e) => handleChange('port', e.target.value)}
                                    placeholder="5432"
                                    className="w-20 h-8 px-3 bg-[#121212] border border-[#2a2a2a] rounded text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-inner"
                                />
                            </div>
                        </div>

                        {/* User */}
                        <div className="grid grid-cols-[120px_1fr] gap-4 items-center">
                            <label className="text-sm text-gray-400">User</label>
                            <div className="flex gap-3">
                                <input
                                    type="text"
                                    value={formData.user}
                                    onChange={(e) => handleChange('user', e.target.value)}
                                    placeholder="postgres"
                                    autoCapitalize="off"
                                    autoCorrect="off"
                                    spellCheck={false}
                                    className="flex-1 h-8 px-3 bg-[#121212] border border-[#2a2a2a] rounded text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-inner"
                                />
                                <button type="button" className="h-8 px-3 bg-[#121212] border border-[#2a2a2a] rounded text-gray-400 text-sm flex items-center gap-2 hover:bg-[#1a1a1a] transition-colors whitespace-nowrap">
                                    Other options
                                    <ChevronDown className="w-3 h-3" />
                                </button>
                            </div>
                        </div>

                        {/* Password */}
                        <div className="grid grid-cols-[120px_1fr] gap-4 items-center">
                            <label className="text-sm text-gray-400">Password</label>
                            <div className="flex gap-3">
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => handleChange('password', e.target.value)}
                                    placeholder="••••••••"
                                    className="flex-1 h-8 px-3 bg-[#121212] border border-[#2a2a2a] rounded text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-inner"
                                />
                                <button type="button" className="h-8 px-3 bg-[#121212] border border-[#2a2a2a] rounded text-gray-400 text-sm flex items-center gap-2 hover:bg-[#1a1a1a] transition-colors whitespace-nowrap">
                                    Store in keychain
                                    <ChevronDown className="w-3 h-3" />
                                </button>
                            </div>
                        </div>

                        {/* Database */}
                        <div className="grid grid-cols-[120px_1fr] gap-4 items-center">
                            <label className="text-sm text-gray-400">Database</label>
                            <div className="flex gap-3">
                                <input
                                    type="text"
                                    value={formData.database}
                                    onChange={(e) => handleChange('database', e.target.value)}
                                    placeholder="my_database"
                                    autoCapitalize="off"
                                    autoCorrect="off"
                                    spellCheck={false}
                                    required
                                    className="flex-1 h-8 px-3 bg-[#121212] border border-[#2a2a2a] rounded text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-inner"
                                />
                                <button type="button" className="h-8 px-3 bg-[#121212] border border-[#2a2a2a] rounded text-gray-400 text-sm hover:bg-[#1a1a1a] transition-colors whitespace-nowrap">
                                    Bootstrap commands...
                                </button>
                            </div>
                        </div>

                        {/* SSL Mode */}
                        <div className="grid grid-cols-[120px_1fr] gap-4 items-center">
                            <label className="text-sm text-gray-400">SSL mode</label>
                            <button type="button" className="h-8 px-3 bg-[#121212] border border-[#2a2a2a] rounded text-white text-sm flex items-center justify-between hover:bg-[#1a1a1a] transition-colors">
                                <span>PREFERRED</span>
                                <ChevronDown className="w-3 h-3" />
                            </button>
                        </div>

                        {/* SSL Keys */}
                        <div className="grid grid-cols-[120px_1fr] gap-4 items-start">
                            <label className="text-sm text-gray-400 pt-1">SSL keys</label>
                            <div className="flex gap-2">
                                <button type="button" disabled className="h-8 px-3 bg-[#121212] border border-[#2a2a2a] rounded text-gray-600 text-sm opacity-50 cursor-not-allowed">
                                    Key...
                                </button>
                                <button type="button" disabled className="h-8 px-3 bg-[#121212] border border-[#2a2a2a] rounded text-gray-600 text-sm opacity-50 cursor-not-allowed">
                                    Cert...
                                </button>
                                <button type="button" disabled className="h-8 px-3 bg-[#121212] border border-[#2a2a2a] rounded text-gray-600 text-sm opacity-50 cursor-not-allowed">
                                    CA Cert...
                                </button>
                                <button type="button" disabled className="w-8 h-8 bg-[#121212] border border-[#2a2a2a] rounded text-gray-600 text-sm opacity-50 cursor-not-allowed flex items-center justify-center">
                                    −
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
                        <button type="button" className="h-8 px-3 bg-[#121212] border border-[#2a2a2a] rounded text-gray-400 text-sm flex items-center gap-2 hover:bg-[#1a1a1a] transition-colors">
                            Over SSH
                            <ChevronDown className="w-3 h-3" />
                        </button>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="h-8 px-4 bg-[#2a2a2a] border border-[#3a3a3a] text-gray-300 rounded text-sm hover:bg-[#333] transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleTest}
                                disabled={testStatus === 'testing'}
                                className="h-8 px-4 bg-[#2a2a2a] border border-[#3a3a3a] text-gray-300 rounded text-sm hover:bg-[#333] transition-colors disabled:opacity-50"
                            >
                                {testStatus === 'testing' ? 'Testing...' : 'Test'}
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="h-8 px-4 bg-[#2a2a2a] border border-[#3a3a3a] text-white rounded text-sm hover:bg-[#333] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                            >
                                {isSubmitting ? 'Connecting...' : 'Connect'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};
