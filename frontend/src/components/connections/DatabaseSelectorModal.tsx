import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { DatabaseSelectorModalProps } from '../../types';
import { DATABASE_TYPES } from '../../constants/databaseTypes';
import { PostgresIcon, MysqlIcon, ClickHouseIcon, SqliteIcon, MongoIcon, RedisIcon, AmazonRedshiftIcon, MariaDBIcon, SQLServerIcon, CassandraIcon, BigQueryIcon, LibSQLIcon, DuckDBIcon, OracleIcon, CockroachDBIcon, SnowflakeIcon, CouchbaseIcon, TiDBIcon } from '../icons/DatabaseIcons';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

export const DatabaseSelectorModal: React.FC<DatabaseSelectorModalProps> = ({ isOpen, onClose, onSelect }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDb, setSelectedDb] = useState('postgres');

    const filteredDatabases = DATABASE_TYPES.sort(db => db.isAvailable ? -1 : 1).filter(db =>
        db.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSelect = () => {
        if (selectedDb) {
            onSelect(selectedDb);
            onClose();
        }
    };

    const footer = (
        <div className="flex w-full items-center justify-between px-2">
            <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-full bg-bg-2 hover:bg-bg-3 font-semibold text-text-secondary transition-colors text-sm"
            >
                Cancel
            </button>
            <div className="flex gap-3">
                <button className="px-5 py-2.5 rounded-full bg-bg-2 hover:bg-bg-3 font-semibold text-text-secondary transition-colors text-sm">
                    Import from URL
                </button>
                <button className="px-5 py-2.5 rounded-full bg-bg-2 hover:bg-bg-3 font-semibold text-text-secondary transition-colors text-sm">
                    New Group
                </button>
                <button
                    onClick={handleSelect}
                    disabled={!selectedDb || !DATABASE_TYPES.find((db) => db.id === selectedDb)?.isAvailable}
                    className="px-8 py-2.5 rounded-full bg-[var(--color-primary-default)] hover:opacity-90 text-white font-bold transition-all text-sm shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Create
                </button>
            </div>
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title=""
            size="xl"
            footer={footer}
            className="bg-white" // Force white background for this specific modal style
        >
            <div className="space-y-8 pt-2">
                {/* Search Pill */}
                <div className="relative group mx-1">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-text-disabled group-focus-within:text-[var(--color-primary-default)] transition-colors" size={20} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search for connection... (⌘F)"
                        autoFocus
                        className="w-full bg-black/5 hover:bg-black/[0.07] focus:bg-white border-2 border-transparent focus:border-[var(--color-primary-default)] rounded-full py-3.5 pl-14 pr-6 text-[15px] font-medium text-text-primary placeholder:text-text-disabled outline-none transition-all"
                    />
                </div>

                {/* Database Grid */}
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-5 p-2 max-h-[500px] overflow-y-auto custom-scrollbar">
                    {filteredDatabases.map((db) => {
                        const isSelected = selectedDb === db.id;
                        const isDisabled = !db.isAvailable;

                        const renderIcon = () => {
                            const className = "w-full h-full object-contain p-3";
                            switch (db.id) {
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
                            <button
                                key={db.id}
                                onClick={() => {
                                    if (db.isAvailable) {
                                        setSelectedDb(db.id);
                                    }
                                }}
                                disabled={isDisabled}
                                className={`
                                    group flex flex-col items-center gap-4 p-6 rounded-[20px] transition-all relative outline-none
                                    ${isSelected && db.isAvailable
                                        ? 'bg-white shadow-[0_8px_30px_rgba(0,0,0,0.12)] scale-105 z-10 ring-2 ring-[var(--color-primary-default)]'
                                        : 'bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.08)] hover:-translate-y-1'
                                    }
                                    ${isDisabled ? 'opacity-40 grayscale cursor-not-allowed' : 'cursor-pointer'}
                                `}
                            >
                                {/* Icon Container */}
                                <div className="w-16 h-16 flex items-center justify-center">
                                    {renderIcon() || <span className="text-2xl font-black">{db.abbreviation}</span>}
                                </div>

                                {/* Label */}
                                <span className={`text-[11px] font-black uppercase tracking-widest text-center transition-colors ${isSelected ? 'text-[var(--color-primary-default)]' : 'text-text-secondary group-hover:text-text-primary'}`}>
                                    {db.name}
                                </span>

                                {isDisabled && (
                                    <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-slate-200" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </Modal>
    );
};
