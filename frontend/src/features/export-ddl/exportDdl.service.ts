import api from '../../services/api';
import { ExportDdlOptions, ExportDdlResult, PgDumpStatus } from './exportDdl.types';

export const exportPostgresDdl = async (connectionId: string, options: ExportDdlOptions): Promise<ExportDdlResult> => {
    const response = await api.post<ExportDdlResult>(`/api/connections/${connectionId}/export-ddl`, options);
    return response.data;
};

export const checkPgDump = async (): Promise<PgDumpStatus> => {
    const response = await api.get<PgDumpStatus>('/api/settings/pg-dump/check');
    return response.data;
};
