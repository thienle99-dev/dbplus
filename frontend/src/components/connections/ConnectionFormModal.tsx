import React, { useState, useEffect } from 'react';
import { Connection } from '../../types';
import { ChevronDown } from 'lucide-react';

interface ConnectionFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (connection: Omit<Connection, 'id'>) => Promise<void>;
}

const DB_TYPES = [
    { value: 'postgres', label: 'PostgreSQL', color: 'bg-blue-500', icon: 'Pg' },
    { value: 'mysql', label: 'MySQL', color: 'bg-orange-500', icon: 'My' },
    { value: 'mongo', label: 'MongoDB', color: 'bg-green-500', icon: 'Mo' },
    { value: 'redis', label: 'Redis', color: 'bg-red-500', icon: 'Re' },
] as const;

const STATUS_COLORS = [
    { name: 'Gray', class: 'bg-gray-500' },
    { name: 'Dark', class: 'bg-gray-700' },
    { name: 'Blue', class: 'bg-blue-500' },
    { name: 'Gold', class: 'bg-yellow-500' },
    { name: 'Green', class: 'bg-green-500' },
    { name: 'Red', class: 'bg-red-500' },
];

export const ConnectionFormModal: React.FC<ConnectionFormModalProps> = ({ isOpen, onClose, onSubmit }) => {
    const [formData, setFormData] = useState({
        name: '',
        type: 'postgres' as Connection['type'],
        host: 'localhost',
        port: '5432',
        database: '',
        user: '',
        password: '',
        statusColor: 'bg-blue-500',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsAnimating(true);
        }
    }, [isOpen]);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                handleClose();
            }
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen]);

    const handleClose = () => {
        setIsAnimating(false);
        setTimeout(() => {
            onClose();
            setError(null);
        }, 200);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            await onSubmit({
                name: formData.name,
                type: formData.type,
                host: formData.host,
                database: formData.database,
            });
            setFormData({
                name: '',
                type: 'postgres',
                host: 'localhost',
                port: '5432',
                database: '',
                user: '',
                password: '',
                statusColor: 'bg-blue-500',
            });
            handleClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create connection');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleChange = (field: keyof typeof formData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    if (!isOpen) return null;

    const dbLabel = DB_TYPES.find(t => t.value === formData.type)?.label || 'PostgreSQL';

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-200 ${isAnimating ? 'opacity-100' : 'opacity-0'}`}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={handleClose} />

            <div className={`relative bg-[#1e1e1e] rounded-xl shadow-2xl w-full max-w-2xl mx-4 border border-white/10 transform transition-all duration-300 ${isAnimating ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>
                {/* Header */}
                <div className="px-6 py-4 border-b border-white/10">
                    <h2 className="text-center text-sm font-medium text-white">{dbLabel} Connection</h2>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6">
                    {error && (
                        <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm flex items-start gap-3">
                            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>{error}</span>
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
                                className="h-8 px-3 bg-[#121212] border border-white/10 rounded text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-inner"
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
                                <button type="button" className="h-8 px-3 bg-[#121212] border border-white/10 rounded text-gray-400 text-sm flex items-center gap-2 hover:bg-white/5 transition-colors">
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
                                    required
                                    className="flex-1 h-8 px-3 bg-[#121212] border border-white/10 rounded text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-inner"
                                />
                                <label className="text-sm text-gray-400 self-center">Port</label>
                                <input
                                    type="text"
                                    value={formData.port}
                                    onChange={(e) => handleChange('port', e.target.value)}
                                    placeholder="5432"
                                    className="w-20 h-8 px-3 bg-[#121212] border border-white/10 rounded text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-inner"
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
                                    className="flex-1 h-8 px-3 bg-[#121212] border border-white/10 rounded text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-inner"
                                />
                                <button type="button" className="h-8 px-3 bg-[#121212] border border-white/10 rounded text-gray-400 text-sm flex items-center gap-2 hover:bg-white/5 transition-colors whitespace-nowrap">
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
                                    className="flex-1 h-8 px-3 bg-[#121212] border border-white/10 rounded text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-inner"
                                />
                                <button type="button" className="h-8 px-3 bg-[#121212] border border-white/10 rounded text-gray-400 text-sm flex items-center gap-2 hover:bg-white/5 transition-colors whitespace-nowrap">
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
                                    required
                                    className="flex-1 h-8 px-3 bg-[#121212] border border-white/10 rounded text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-inner"
                                />
                                <button type="button" className="h-8 px-3 bg-[#121212] border border-white/10 rounded text-gray-400 text-sm hover:bg-white/5 transition-colors whitespace-nowrap">
                                    Bootstrap commands...
                                </button>
                            </div>
                        </div>

                        {/* SSL Mode */}
                        <div className="grid grid-cols-[120px_1fr] gap-4 items-center">
                            <label className="text-sm text-gray-400">SSL mode</label>
                            <button type="button" className="h-8 px-3 bg-[#121212] border border-white/10 rounded text-white text-sm flex items-center justify-between hover:bg-white/5 transition-colors">
                                <span>PREFERRED</span>
                                <ChevronDown className="w-3 h-3" />
                            </button>
                        </div>

                        {/* SSL Keys */}
                        <div className="grid grid-cols-[120px_1fr] gap-4 items-start">
                            <label className="text-sm text-gray-400 pt-1">SSL keys</label>
                            <div className="flex gap-2">
                                <button type="button" disabled className="h-8 px-3 bg-[#121212] border border-white/10 rounded text-gray-600 text-sm opacity-50 cursor-not-allowed">
                                    Key...
                                </button>
                                <button type="button" disabled className="h-8 px-3 bg-[#121212] border border-white/10 rounded text-gray-600 text-sm opacity-50 cursor-not-allowed">
                                    Cert...
                                </button>
                                <button type="button" disabled className="h-8 px-3 bg-[#121212] border border-white/10 rounded text-gray-600 text-sm opacity-50 cursor-not-allowed">
                                    CA Cert...
                                </button>
                                <button type="button" disabled className="w-8 h-8 bg-[#121212] border border-white/10 rounded text-gray-600 text-sm opacity-50 cursor-not-allowed flex items-center justify-center">
                                    −
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
                        <button type="button" className="h-8 px-3 bg-[#121212] border border-white/10 rounded text-gray-400 text-sm flex items-center gap-2 hover:bg-white/5 transition-colors">
                            Over SSH
                            <ChevronDown className="w-3 h-3" />
                        </button>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="h-8 px-4 bg-[#2a2a2a] border border-white/10 text-gray-300 rounded text-sm hover:bg-[#333] transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="h-8 px-4 bg-[#2a2a2a] border border-white/10 text-gray-300 rounded text-sm hover:bg-[#333] transition-colors"
                            >
                                Test
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="h-8 px-4 bg-[#2a2a2a] border border-white/10 text-white rounded text-sm hover:bg-[#333] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
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
