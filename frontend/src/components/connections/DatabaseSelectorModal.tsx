import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { DatabaseSelectorModalProps } from '../../types';
import { DATABASE_TYPES } from '../../constants/databaseTypes';
import { PostgresIcon, MysqlIcon, ClickHouseIcon, SqliteIcon, MongoIcon, RedisIcon, AmazonRedshiftIcon, MariaDBIcon, SQLServerIcon, CassandraIcon, BigQueryIcon, LibSQLIcon, DuckDBIcon, OracleIcon, CockroachDBIcon, SnowflakeIcon, CouchbaseIcon, TiDBIcon } from '../icons/DatabaseIcons';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
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
        <div className="flex w-full items-center justify-between">
            <Button variant="secondary" onClick={onClose}>
                Cancel
            </Button>
            <div className="flex gap-2">
                <Button variant="secondary">Import from URL</Button>
                <Button variant="secondary">New Group</Button>
                <Button
                    variant="primary"
                    onClick={handleSelect}
                    disabled={!selectedDb || !DATABASE_TYPES.find((db) => db.id === selectedDb)?.isAvailable}
                >
                    Create
                </Button>
            </div>
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Select Connection Type"
            size="xl"
            footer={footer}
        >
            <div className="space-y-6">
                {/* Search */}
                <Input
                    leftIcon={<Search size={16} />}
                    placeholder="Search for connection... (⌘F)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                />

                {/* Database Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 justify-center items-center lg:grid-cols-6 gap-4 max-h-[400px]">
                    {filteredDatabases.map((db) => {
                        const isSelected = selectedDb === db.id;
                        const isDisabled = !db.isAvailable;

                        const renderIcon = () => {
                            const className = "w-full h-full drop-shadow-sm";
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
                        const Icon = renderIcon();

                        return (
                            <button
                                key={db.id}
                                onClick={() => {
                                    if (db.isAvailable) {
                                        setSelectedDb(db.id);
                                    }
                                }}
                                disabled={isDisabled}
                                title={isDisabled ? `${db.name} - Coming Soon` : db.name}
                                className={`
                                    flex flex-col items-center gap-3 p-4 rounded-xl transition-all relative
                                    ${isSelected && db.isAvailable
                                        ? 'ring-2 ring-accent bg-accent/10'
                                        : 'ring-1 ring-border/40 hover:bg-bg-2/50'
                                    }
                                    ${isDisabled
                                        ? 'opacity-60 cursor-not-allowed'
                                        : 'cursor-pointer'
                                    }
                                `}
                            >
                                {/* Icon Circle */}
                                <div className={`w-12 h-12 rounded-2xl ${Icon ? '' : db.color} flex items-center justify-center shadow-sm ${isDisabled ? 'opacity-70' : ''} ${Icon ? '' : 'ring-1 ring-inset ring-black/10'}`}>
                                    {Icon ? Icon : <span className="text-white text-sm font-bold">{db.abbreviation}</span>}
                                </div>
                                {/* Label */}
                                <div className="flex flex-col items-center gap-1">
                                    <span className="text-xs font-medium text-text-primary text-center leading-tight">{db.name}</span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </Modal>
    );
};
