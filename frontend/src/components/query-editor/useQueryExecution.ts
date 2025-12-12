import { useState, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { format as formatSql } from 'sql-formatter';
import { useToast } from '../../context/ToastContext';
import { useSettingsStore } from '../../store/settingsStore';
import { historyApi } from '../../services/historyApi';
import { useExecuteQuery } from '../../hooks/useQuery';
import { QueryResult } from '../../types';

export function useQueryExecution(query: string, setQuery: (q: string) => void) {
    const { connectionId } = useParams();
    const { showToast } = useToast();
    const { formatKeywordCase } = useSettingsStore();
    const executeMutation = useExecuteQuery(connectionId);

    const [result, setResult] = useState<QueryResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const lastHistorySave = useRef<{ sql: string; timestamp: number } | null>(null);

    const execute = useCallback(async (queryOverride?: string) => {
        const sqlToExecute = queryOverride !== undefined ? queryOverride : query;
        const startTime = Date.now();

        setResult(null);
        setError(null);

        try {
            const data = await executeMutation.mutateAsync({ query: sqlToExecute });
            const executionTime = Date.now() - startTime;

            setResult(data);

            // Save to history (success)
            if (connectionId) {
                const now = Date.now();
                const lastSave = lastHistorySave.current;

                if (!lastSave || lastSave.sql !== sqlToExecute || (now - lastSave.timestamp) > 2000) {
                    lastHistorySave.current = { sql: sqlToExecute, timestamp: now };
                    historyApi.addHistory(connectionId, {
                        sql: sqlToExecute,
                        row_count: data.rows?.length || data.affected_rows || 0,
                        execution_time: executionTime,
                        success: true,
                        error_message: null,
                    }).catch(err => console.error('Failed to save history:', err));
                }
            }

            if (data.affected_rows > 0) {
                showToast(`Query executed successfully. ${data.affected_rows} rows affected.`, 'success');
            }
        } catch (err: any) {
            const executionTime = Date.now() - startTime;
            const errorMessage = err.response?.data?.message || err.message || 'Failed to execute query';

            setError(errorMessage);
            showToast('Query execution failed', 'error');

            // Save to history (error)
            if (connectionId) {
                const now = Date.now();
                const lastSave = lastHistorySave.current;

                if (!lastSave || lastSave.sql !== sqlToExecute || (now - lastSave.timestamp) > 2000) {
                    lastHistorySave.current = { sql: sqlToExecute, timestamp: now };
                    historyApi.addHistory(connectionId, {
                        sql: sqlToExecute,
                        row_count: null,
                        execution_time: executionTime,
                        success: false,
                        error_message: errorMessage,
                    }).catch(err => console.error('Failed to save history:', err));
                }
            }
        }
    }, [connectionId, query, showToast, executeMutation]);

    const handleFormat = useCallback(() => {
        if (!query.trim()) return;
        try {
            const formatted = formatSql(query, { language: 'postgresql', keywordCase: formatKeywordCase });
            setQuery(formatted);
            showToast('Query formatted', 'info');
        } catch (err) {
            console.error('Formatting failed:', err);
            showToast('Formatting failed', 'error');
        }
    }, [query, showToast, formatKeywordCase, setQuery]);

    return {
        execute,
        handleFormat,
        result,
        loading: executeMutation.isPending,
        error,
        setResult
    };
}
