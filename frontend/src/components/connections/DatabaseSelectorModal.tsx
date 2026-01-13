import React, { useState, useMemo } from 'react';
import { Search, X, Check, Laptop, Zap, BarChart3 } from 'lucide-react';
import { DatabaseSelectorModalProps } from '../../types';
import { DATABASE_TYPES } from '../../constants/databaseTypes';
import {
    PostgresIcon, MysqlIcon, ClickHouseIcon, SqliteIcon, MongoIcon, RedisIcon,
    AmazonRedshiftIcon, MariaDBIcon, SQLServerIcon, CassandraIcon, BigQueryIcon,
    LibSQLIcon, DuckDBIcon, OracleIcon, CockroachDBIcon, SnowflakeIcon,
    CouchbaseIcon, TiDBIcon
} from '../icons/DatabaseIcons';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

export const DatabaseSelectorModal: React.FC<DatabaseSelectorModalProps> = ({ isOpen, onClose, onSelect }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDb, setSelectedDb] = useState('postgres');

    const categories = useMemo(() => [
        { id: 'relational', name: 'Relational', icon: <Laptop size={14} />, types: ['postgres', 'mysql', 'mariadb', 'sqlite', 'sqlserver', 'oracle', 'libsql', 'cockroach', 'tidb'] },
        { id: 'nosql', name: 'NoSQL & Key-Value', icon: <Zap size={14} />, types: ['mongo', 'redis', 'cassandra', 'couchbase'] },
        { id: 'analytical', name: 'Analytical / OLAP', icon: <BarChart3 size={14} />, types: ['clickhouse', 'snowflake', 'bigquery', 'duckdb', 'redshift'] },
    ], []);

    const filteredDatabases = DATABASE_TYPES.filter(db =>
        db.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        db.id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSelect = () => {
        if (selectedDb) {
            onSelect(selectedDb);
            onClose();
        }
    };

    const footer = (
        <div className="flex w-full items-center justify-between px-2">
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">System Ready</span>
            </div>
            <div className="flex gap-3">
                <Button variant="secondary" onClick={onClose}>
                    Cancel
                </Button>
                <Button
                    variant="primary"
                    onClick={handleSelect}
                    disabled={!selectedDb || !DATABASE_TYPES.find((db) => db.id === selectedDb)?.isAvailable}
                    className="px-10"
                >
                    Continue
                </Button>
            </div>
        </div>
    );

    const renderIcon = (id: string) => {
        const className = "w-full h-full object-contain p-2 group-hover:scale-110 transition-transform duration-500";
        switch (id) {
            case 'postgres': return <PostgresIcon className={className} />;
            case 'redshift': return <AmazonRedshiftIcon className={className} />;
            case 'mysql': return <MysqlIcon className={className} />;
            case 'mariadb': return <MariaDBIcon className={className} />;
            case 'sqlserver': return <SQLServerIcon className={className} />;
            case 'cassandra': return <CassandraIcon className={className} />;
            case 'clickhouse': return <ClickHouseIcon className={className} />;
            case 'bigquery': return <BigQueryIcon className={className} />;
            case 'libsql': return <LibSQLIcon className={className} />;
            case 'duckdb': return <DuckDBIcon className={className} />;
            case 'oracle': return <OracleIcon className={className} />;
            case 'cockroach': return <CockroachDBIcon className={className} />;
            case 'snowflake': return <SnowflakeIcon className={className} />;
            case 'couchbase': return <CouchbaseIcon className={className} />;
            case 'tidb': return <TiDBIcon className={className} />;
            case 'sqlite': return <SqliteIcon className={className} />;
            case 'mongo': return <MongoIcon className={className} />;
            case 'redis': return <RedisIcon className={className} />;
            default: return null;
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div className="flex flex-col">
                    <span className="text-xl font-black tracking-tight text-text-primary">Source Selection</span>
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mt-0.5">Choose your data infrastructure</span>
                </div>
            }
            size="xl"
            footer={footer}
            className="glass"
        >
            <div className="space-y-8 py-2">
                {/* Search Bar */}
                <div className="relative group">
                    <div className="absolute inset-0 bg-accent/5 blur-xl group-focus-within:bg-accent/10 transition-all rounded-full" />
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-accent transition-colors" size={18} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Filter engines (e.g. 'Postgres')..."
                        autoFocus
                        className="w-full relative z-10 bg-bg-2/50 hover:bg-bg-2 focus:bg-bg-1 border border-white/5 focus:border-accent/40 rounded-2xl py-4 pl-14 pr-12 text-[15px] font-medium text-text-primary placeholder:text-text-muted outline-none transition-all shadow-inner"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-1.5 hover:bg-white/10 rounded-full text-text-muted transition-colors"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>

                {/* Categories */}
                <div className="space-y-10 custom-scrollbar max-h-[500px] pr-2 overflow-y-auto">
                    {categories.map((cat) => {
                        const items = filteredDatabases.filter(db => cat.types.includes(db.id));
                        if (items.length === 0) return null;

                        return (
                            <div key={cat.id} className="space-y-5">
                                <div className="flex items-center gap-3 px-1">
                                    <div className="w-6 h-6 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                                        {cat.icon}
                                    </div>
                                    <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-text-muted italic">{cat.name}</h3>
                                    <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                    {items.map((db) => {
                                        const isSelected = selectedDb === db.id;
                                        const isDisabled = !db.isAvailable;

                                        return (
                                            <button
                                                key={db.id}
                                                onClick={() => !isDisabled && setSelectedDb(db.id)}
                                                className={`
                                                    group relative p-5 rounded-2xl transition-all duration-500 overflow-hidden border
                                                    ${isSelected
                                                        ? 'bg-accent/10 border-accent/40 shadow-[0_0_20px_rgba(var(--color-primary-default),0.1)]'
                                                        : 'bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/[0.08] hover:scale-[1.02] shadow-sm'
                                                    }
                                                    ${isDisabled ? 'opacity-30 grayscale cursor-not-allowed saturate-0' : 'cursor-pointer'}
                                                `}
                                            >
                                                {/* Selection Indicator */}
                                                {isSelected && (
                                                    <div className="absolute top-2 right-2 w-5 h-5 bg-accent rounded-full flex items-center justify-center shadow-lg animate-fadeIn">
                                                        <Check size={12} className="text-bg-0" strokeWidth={4} />
                                                    </div>
                                                )}

                                                <div className="flex flex-col items-center gap-4 py-2">
                                                    <div className="w-12 h-12 flex items-center justify-center relative">
                                                        {renderIcon(db.id)}
                                                        {isSelected && <div className="absolute inset-0 bg-accent/20 blur-xl rounded-full animate-pulse" />}
                                                    </div>
                                                    <div className="flex flex-col items-center gap-0.5">
                                                        <span className={`text-xs font-bold transition-colors ${isSelected ? 'text-white' : 'text-text-secondary group-hover:text-white'}`}>
                                                            {db.name}
                                                        </span>
                                                        {isDisabled && (
                                                            <span className="text-[8px] font-black text-text-muted uppercase tracking-widest">Coming Soon</span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Background Glow Overlay */}
                                                <div className={`absolute -right-8 -bottom-8 w-16 h-16 rounded-full blur-2xl transition-all duration-700 ${isSelected ? 'bg-accent/20' : 'bg-transparent group-hover:bg-white/5'}`} />
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </Modal>
    );
};
