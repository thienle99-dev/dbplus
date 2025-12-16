import api from '../../services/api';
import { ExportDdlOptions, ExportDdlResult, PgDumpStatusResponse } from './exportDdl.types';

export const exportPostgresDdl = async (connectionId: string, options: ExportDdlOptions): Promise<ExportDdlResult> => {
    const response = await api.post<ExportDdlResult>(`/api/connections/${connectionId}/export-ddl`, options);
    return response.data;
};

export const checkPgDump = async (): Promise<PgDumpStatusResponse> => {
    const response = await api.get<PgDumpStatusResponse>('/api/settings/pg-dump/check');
    return response.data;
};
