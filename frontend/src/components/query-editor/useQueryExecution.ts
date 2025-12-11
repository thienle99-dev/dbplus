import { useState, useCallback, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { format as formatSql } from 'sql-formatter';
import { useToast } from '../../context/ToastContext';
import { useSettingsStore } from '../../store/settingsStore';
import { historyApi } from '../../services/historyApi';
import api from '../../services/api';
import { QueryResult } from '../../types';

export function useQueryExecution(query: string, setQuery: (q: string) => void) {
    const { connectionId } = useParams();
    const { showToast } = useToast();
    const { formatKeywordCase } = useSettingsStore();

    const [result, setResult] = useState<QueryResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const lastHistorySave = useRef<{ sql: string; timestamp: number } | null>(null);

    const execute = useCallback(async (queryOverride?: string) => {
        const sqlToExecute = queryOverride !== undefined ? queryOverride : query;
        const startTime = Date.now();

        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const response = await api.post(`/api/connections/${connectionId}/execute`, { query: sqlToExecute });
            const executionTime = Date.now() - startTime;

            setResult(response.data);

            // Save to history (success) - prevent duplicates
            if (connectionId) {
                const now = Date.now();
                const lastSave = lastHistorySave.current;

                // Only save if this is a different query or more than 2 seconds have passed
                if (!lastSave || lastSave.sql !== sqlToExecute || (now - lastSave.timestamp) > 2000) {
                    lastHistorySave.current = { sql: sqlToExecute, timestamp: now };

                    historyApi.addHistory(connectionId, {
                        sql: sqlToExecute,
                        row_count: response.data.rows?.length || response.data.affected_rows || 0,
                        execution_time: executionTime,
                        success: true,
                        error_message: null,
                    }).catch(err => console.error('Failed to save history:', err));
                }
            }

            if (response.data.affected_rows > 0) {
                showToast(`Query executed successfully. ${response.data.affected_rows} rows affected.`, 'success');
            }
        } catch (err: unknown) {
            const executionTime = Date.now() - startTime;
            const errorMessage = (err as any).response?.data || (err as Error).message || 'Failed to execute query';

            setError(errorMessage);
            showToast('Query execution failed', 'error');

            // Save to history (error) - prevent duplicates
            if (connectionId) {
                const now = Date.now();
                const lastSave = lastHistorySave.current;

                // Only save if this is a different query or more than 2 seconds have passed
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
        } finally {
            setLoading(false);
        }
    }, [connectionId, query, showToast]);

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
        loading,
        error,
        setResult // Exported if needed to clear results manually
    };
}
