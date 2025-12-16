export enum DdlScope {
    Database = 'database',
    Schema = 'schema',
    Objects = 'objects',
}

export enum DdlObjectType {
    Table = 'table',
    View = 'view',
    Function = 'function',
    Sequence = 'sequence',
    Type = 'type',
}

export interface DdlObjectSpec {
    objectType: DdlObjectType;
    schema: string;
    name: string;
}

export interface ExportDdlOptions {
    scope: DdlScope;
    database?: string;
    schemas?: string[];
    objects?: DdlObjectSpec[];
    includeDrop: boolean;
    ifExists: boolean;
    includeOwnerPrivileges: boolean;
    includeComments: boolean;
    preferPgDump: boolean;
    exportMethod?: 'bundled_pg_dump' | 'user_pg_dump' | 'driver';
    pgDumpPath?: string;
}

export interface ExportDdlResult {
    ddl: string;
    method: string;
}

export interface PgDumpStatus {
    found: boolean;
    version?: string;
    path?: string;
}

export interface DriverStatus {
    available: boolean;
    supportsFullExport: boolean;
}

export interface PgDumpStatusResponse {
    bundled: PgDumpStatus;
    user: PgDumpStatus;
    driver: DriverStatus;
}
