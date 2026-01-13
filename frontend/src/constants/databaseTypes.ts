import { DatabaseType } from '../types/database';

export const DATABASE_TYPES: DatabaseType[] = [
  { id: 'postgres', name: 'PostgreSQL', abbreviation: 'Pg', color: 'bg-blue-600', isAvailable: true },
  // { id: 'redshift', name: 'Amazon Redshift', abbreviation: 'Rs', color: 'bg-blue-800', isAvailable: false },
  { id: 'mysql', name: 'MySQL', abbreviation: 'Ms', color: 'bg-orange-500', isAvailable: true },
  { id: 'mariadb', name: 'MariaDB', abbreviation: 'Mb', color: 'bg-blue-700', isAvailable: true },
  { id: 'sqlserver', name: 'SQL Server', abbreviation: 'Ss', color: 'bg-red-600', isAvailable: false },
  { id: 'cassandra', name: 'Cassandra', abbreviation: 'Ca', color: 'bg-cyan-600', isAvailable: false },
  { id: 'clickhouse', name: 'ClickHouse', abbreviation: 'Ch', color: 'bg-yellow-500', isAvailable: true },
  // { id: 'bigquery', name: 'BigQuery', abbreviation: 'Bq', color: 'bg-blue-500', isAvailable: false },
  { id: 'libsql', name: 'LibSQL', abbreviation: 'Ls', color: 'bg-purple-600', isAvailable: false },
  // { id: 'd1', name: 'Cloudflare D1', abbreviation: 'D1', color: 'bg-orange-600', isAvailable: false },
  { id: 'mongo', name: 'MongoDB', abbreviation: 'Mg', color: 'bg-green-600', isAvailable: true },
  // { id: 'snowflake', name: 'Snowflake', abbreviation: 'Sf', color: 'bg-cyan-500', isAvailable: false },
  { id: 'redis', name: 'Redis', abbreviation: 'Re', color: 'bg-red-500', isAvailable: false },
  { id: 'tidb', name: 'TiDB', abbreviation: 'Td', color: 'bg-blue-500', isAvailable: true },
  { id: 'sqlite', name: 'SQLite', abbreviation: 'Sq', color: 'bg-blue-400', isAvailable: true },
  { id: 'duckdb', name: 'DuckDB', abbreviation: 'Dk', color: 'bg-yellow-600', isAvailable: false },
  { id: 'oracle', name: 'Oracle', abbreviation: 'Or', color: 'bg-red-700', isAvailable: false },
  { id: 'cockroach', name: 'CockroachDB', abbreviation: 'Cr', color: 'bg-indigo-600', isAvailable: true },
  { id: 'couchbase', name: 'Couchbase', abbreviation: 'Cb', color: 'bg-red-600', isAvailable: true },
];
