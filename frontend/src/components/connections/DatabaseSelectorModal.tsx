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
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 p-2 max-h-[500px] overflow-y-auto custom-scrollbar">
                    {filteredDatabases.map((db) => {
                        const isSelected = selectedDb === db.id;
                        const isDisabled = !db.isAvailable;

                        // Function to get distinct background color for each DB type
                        const getBrandColor = (id: string) => {
                            switch (id) {
                                case 'postgres': return 'bg-[#fff]'; // Postgres Blue
                                case 'mysql': return 'bg-[#fff]';    // MySQL Blue
                                case 'mariadb': return 'bg-[#fff]';  // MariaDB Brown
                                case 'sqlite': return 'bg-[#fff]';   // SQLite Dark Blue
                                case 'mongo': return 'bg-[#fff]';    // Mongo Green
                                case 'redis': return 'bg-[#fff]';    // Redis Red
                                case 'sqlserver': return 'bg-[#fff]'; // SQL Server Red
                                case 'oracle': return 'bg-[#fff]';   // Oracle Red
                                case 'cockroach': return 'bg-[#fff]'; // Cockroach Purple
                                case 'cassandra': return 'bg-[#fff]'; // Cassandra Blue
                                case 'clickhouse': return 'bg-[#fff]'; // ClickHouse Yellow
                                case 'snowflake': return 'bg-[#fff]'; // Snowflake Blue
                                case 'redshift': return 'bg-[#fff]';  // Redshift Cyan (Simulated)
                                case 'bigquery': return 'bg-[#fff]';  // Google Blue
                                case 'duckdb': return 'bg-[#fff]';    // DuckDB Yellow
                                case 'tidb': return 'bg-[#fff]';      // TiDB dark
                                default: return 'bg-gray-600';
                            }
                        };

                        const renderIcon = () => {
                            const className = "w-full h-full object-contain p-2"; // Add padding to keep logo safe zone
                            // For icons on colored backgrounds, we might want to ensure they look good.
                            // Most logos are fine on their brand.
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
                        const brandBg = getBrandColor(db.id);

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
                                    group flex flex-col items-center gap-3 p-4 rounded-xl transition-all relative outline-none
                                    ${isSelected && db.isAvailable
                                        ? 'bg-accent/10 shadow-lg shadow-accent/10 scale-105 z-10 ring-1 ring-accent/20'
                                        : 'bg-bg-1 shadow-sm hover:shadow-md hover:bg-bg-2/80'
                                    }
                                    ${isDisabled
                                        ? 'opacity-50 grayscale cursor-not-allowed'
                                        : 'cursor-pointer'
                                    }
                                `}
                            >
                                {/* Icon Container with Specific Brand Color */}
                                <div className={`w-14 h-14 rounded-2xl ${brandBg} flex items-center justify-center shadow-inner ring-1 ring-black/5 group-hover:scale-105 transition-transform duration-200`}>
                                    {/* For some logos, we might want a white circle BEHIND them if they clash? 
                                        Most brand logos work on their brand color if they are white variants.
                                        But our icons are full color PNGs. 
                                        Putting a full color PNG on a brand color background might be bad (e.g. Orange Logo on Orange BG). 
                                        
                                        User asked for 'background màu đặc trưng' (Specific Color Background).
                                        TablePlus usually puts a White/Light Logo on Brand Color Background.
                                        If our icons are colored, we might need a white container inside?
                                        OR we trust the transparent PNGs to look okay.
                                        
                                        Let's stick to the user Request: "Add background distinctive color".
                                    */}
                                    <div className="w-full h-full p-0 drop-shadow-sm">
                                        {Icon ? Icon : <span className="text-black text-lg font-bold">{db.abbreviation}</span>}
                                    </div>
                                </div>
                                {/* Label */}
                                <span className={`text-xs font-medium text-center transition-colors ${isSelected ? 'text-accent' : 'text-text-secondary group-hover:text-text-primary'}`}>
                                    {db.name}
                                </span>

                                {isDisabled && (
                                    <span className="absolute top-2 right-2 flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-border opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-border"></span>
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </Modal>
    );
};
