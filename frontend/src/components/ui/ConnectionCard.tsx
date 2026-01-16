// import React from 'react';
import { Database, ChevronRight } from 'lucide-react';

export interface ConnectionCardProps {
    name: string;
    type: 'postgres' | 'mysql' | 'sqlite' | 'mongodb' | 'clickhouse' | 'mariadb' | 'tidb' | 'cockroach' | 'couchbase';
    host?: string;
    database?: string;
    lastConnected?: string;
    onClick?: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
}

const DB_COLORS = {
    postgres: 'var(--accent-blue)',
    mysql: 'var(--accent-orange)',
    sqlite: 'var(--accent-green)',
    mongodb: 'var(--accent-green)',
    clickhouse: 'var(--accent-yellow)',
    mariadb: 'var(--accent-blue)',
    tidb: 'var(--accent-blue)',
    cockroach: 'var(--accent-purple)',
    couchbase: 'var(--accent-red)',
};

const DB_LABELS = {
    postgres: 'PostgreSQL',
    mysql: 'MySQL',
    sqlite: 'SQLite',
    mongodb: 'MongoDB',
    clickhouse: 'ClickHouse',
    mariadb: 'MariaDB',
    tidb: 'TiDB',
    cockroach: 'CockroachDB',
    couchbase: 'Couchbase',
};

export default function ConnectionCard({
    name,
    type,
    host,
    database,
    lastConnected,
    onClick,
}: ConnectionCardProps) {
    return (
        <button
            onClick={onClick}
            className="
        group
        w-full
        p-5
        bg-[var(--color-bg-panel)]
        border border-[var(--color-border-default)]
        rounded-[var(--radius-xl)]
        hover:border-[var(--color-primary-default)]
        hover:shadow-lg hover:shadow-black/5
        hover:-translate-y-1
        transition-all
        duration-300
        text-left
        relative
        overflow-hidden
      "
        >
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="flex items-start gap-3">
                {/* Icon */}
                <div
                    className="
            flex-shrink-0
            w-10 h-10
            rounded-[var(--radius-sm)]
            flex items-center justify-center
            transition-colors
          "
                    style={{
                        backgroundColor: `${DB_COLORS[type]}15`,
                        color: DB_COLORS[type],
                    }}
                >
                    <Database size={20} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                            <h3 className="text-[var(--font-size-md)] font-medium text-[var(--color-text)] truncate">
                                {name}
                            </h3>
                            <p className="text-[var(--font-size-xs)] text-[var(--color-text-muted)] mt-0.5">
                                {DB_LABELS[type]}
                                {host && ` • ${host}`}
                            </p>
                        </div>

                        <ChevronRight
                            size={16}
                            className="
                flex-shrink-0
                text-[var(--color-text-muted)]
                group-hover:text-[var(--primary)]
                transition-colors
              "
                        />
                    </div>

                    {database && (
                        <div className="mt-2 flex items-center gap-2">
                            <span className="text-[var(--font-size-xs)] text-[var(--color-text-muted)]">
                                Database:
                            </span>
                            <span className="text-[var(--font-size-xs)] font-mono text-[var(--color-text)]">
                                {database}
                            </span>
                        </div>
                    )}

                    {lastConnected && (
                        <div className="mt-2 text-[var(--font-size-xs)] text-[var(--color-text-muted)]">
                            Last connected: {lastConnected}
                        </div>
                    )}
                </div>
            </div>
        </button>
    );
}
