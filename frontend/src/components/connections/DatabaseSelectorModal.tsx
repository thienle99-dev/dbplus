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
                {/* Search Bar */}
                <div className="px-4">
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none z-10">
                            <Search className="text-text-muted group-focus-within:text-accent transition-colors duration-300" size={18} />
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search data sources..."
                            autoFocus
                            className="w-full bg-bg-sunken hover:bg-bg-elevated focus:bg-bg-elevated border border-border-default focus:border-accent rounded-md py-3 pl-11 pr-10 text-sm font-medium text-text-primary placeholder:text-text-muted/70 outline-none transition-all shadow-sm focus:shadow-md focus:ring-1 focus:ring-accent/20"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute inset-y-0 right-3 flex items-center z-10"
                            >
                                <div className="p-1 rounded-full hover:bg-border-default text-text-muted hover:text-text-primary transition-all">
                                    <X size={14} />
                                </div>
                            </button>
                        )}
                    </div>
                </div>

                {/* Categories */}
                <div className="space-y-10 px-4 custom-scrollbar max-h-[500px] pr-2 overflow-y-auto">
                    {categories.map((cat) => {
                        const items = filteredDatabases.filter(db => cat.types.includes(db.id));
                        if (items.length === 0) return null;

                        return (
                            <div key={cat.id} className="space-y-5">
                                <div className="flex items-center gap-3 px-1">
                                    <div className="w-6 h-6 rounded-md bg-accent/10 flex items-center justify-center text-accent">
                                        {cat.icon}
                                    </div>
                                    <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-text-muted italic">{cat.name}</h3>
                                    <div className="h-px flex-1 bg-gradient-to-r from-border-default to-transparent" />
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
                                                    group relative p-5 rounded-lg transition-all duration-300 overflow-hidden flex flex-col items-center justify-center
                                                    ${isSelected
                                                        ? 'border-2 border-accent bg-accent/10 shadow-glow scale-[1.02] z-10'
                                                        : 'border border-border-strong bg-bg-sunken shadow-sm hover:border-accent/40 hover:bg-bg-hover hover:shadow-lg hover:-translate-y-1'
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
                                                        <span className={`text-xs font-bold transition-colors ${isSelected ? 'text-text-primary' : 'text-text-secondary group-hover:text-text-primary'}`}>
                                                            {db.name}
                                                        </span>
                                                        {isDisabled && (
                                                            <span className="text-[8px] font-black text-text-muted uppercase tracking-widest">Coming Soon</span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Background Glow Overlay */}
                                                <div className={`absolute -right-8 -bottom-8 w-16 h-16 rounded-full blur-2xl transition-all duration-700 ${isSelected ? 'bg-accent/20' : 'bg-transparent group-hover:bg-bg-hover'}`} />
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
