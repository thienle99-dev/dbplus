import { useState, useCallback, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { format as formatSql } from 'sql-formatter';
import { useToast } from '../../context/ToastContext';
import { useSettingsStore } from '../../store/settingsStore';
import { historyApi } from '../../services/historyApi';
import { useExecuteQuery } from '../../hooks/useQuery';
import { QueryResult } from '../../types';
import { ApiErrorDetails, extractApiErrorDetails } from '../../utils/apiError';
import api from '../../services/api';

export function useQueryExecution(query: string, setQuery: (q: string) => void) {
    const { connectionId } = useParams();
    const { showToast } = useToast();
    const { formatKeywordCase, defaultLimit } = useSettingsStore();
    const executeMutation = useExecuteQuery(connectionId);

    const [result, setResult] = useState<QueryResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [errorDetails, setErrorDetails] = useState<ApiErrorDetails | null>(null);
    const [lastSql, setLastSql] = useState<string | null>(null);
    const lastHistorySave = useRef<{ sql: string; timestamp: number } | null>(null);
    const activeQueryIdRef = useRef<string | null>(null);

    // Cancel pending query on unmount
    useEffect(() => {
        return () => {
            const pendingQueryId = activeQueryIdRef.current;
            if (pendingQueryId) {
                console.log(`[useQueryExecution] Cancelling query ${pendingQueryId} on unmount`);
                api.post('/api/queries/cancel', { query_id: pendingQueryId }).catch(err => {
                    console.warn("Failed to send cancel request", err);
                });
            }
        };
    }, []);

    const isSelectLike = (sql: string) => {
        const trimmed = sql.trimStart();
        const upper = trimmed.toUpperCase().replace(/^(\/\*[\s\S]*?\*\/|--.*?\n|\s)*/, '');
        return upper.startsWith('SELECT') || upper.startsWith('WITH') || upper.startsWith('EXPLAIN') || upper.startsWith('SHOW') || upper.startsWith('DESCRIBE');
    };

    const execute = useCallback(async (queryOverride?: string, confirmedUnsafe: boolean = false) => {
        const sqlToExecute = queryOverride !== undefined ? queryOverride : query;
        const startTime = Date.now();

        setResult(null);
        setError(null);
        setErrorDetails(null);
        setLastSql(sqlToExecute);

        const queryId = crypto.randomUUID();
        activeQueryIdRef.current = queryId;

        try {
            const data = await executeMutation.mutateAsync({
                query: sqlToExecute,
                ...(isSelectLike(sqlToExecute)
                    ? {
                        limit: defaultLimit,
                        offset: 0,
                        include_total_count: true,
                    }
                    : {}),
                confirmed_unsafe: confirmedUnsafe,
                query_id: queryId,
            });

            // Only proceed if this is still the active query
            if (activeQueryIdRef.current !== queryId) return;
            activeQueryIdRef.current = null;

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
            } else if (!isSelectLike(sqlToExecute)) {
                showToast('Query executed successfully', 'success');
            }
        } catch (err: any) {
            if (activeQueryIdRef.current !== queryId) return;
            activeQueryIdRef.current = null;

            const executionTime = Date.now() - startTime;
            const details = extractApiErrorDetails(err);
            const errorMessage = details.message;

            setError(errorMessage);
            setErrorDetails({ ...details, sql: sqlToExecute });
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
    }, [connectionId, query, showToast, executeMutation, defaultLimit]);

    const fetchPage = useCallback(
        async (limit: number, offset: number) => {
            if (!lastSql) return;
            const sqlToExecute = lastSql;
            const startTime = Date.now();
            setError(null);
            setErrorDetails(null);

            const queryId = crypto.randomUUID();
            activeQueryIdRef.current = queryId;

            try {
                const data = await executeMutation.mutateAsync({
                    query: sqlToExecute,
                    limit,
                    offset,
                    include_total_count: true,
                    query_id: queryId,
                });

                if (activeQueryIdRef.current !== queryId) return;
                activeQueryIdRef.current = null;

                setResult(data);
                const executionTime = Date.now() - startTime;
                if (data.affected_rows > 0) {
                    showToast(`Query executed successfully. ${data.affected_rows} rows affected.`, 'success');
                } else {
                    showToast(`Loaded ${data.rows.length} rows (${executionTime}ms)`, 'info');
                }
            } catch (err: any) {
                if (activeQueryIdRef.current !== queryId) return;
                activeQueryIdRef.current = null;

                const details = extractApiErrorDetails(err);
                setError(details.message);
                setErrorDetails({ ...details, sql: sqlToExecute });
                showToast('Query execution failed', 'error');
            }
        },
        [executeMutation, lastSql, showToast]
    );

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
        fetchPage,
        handleFormat,
        result,
        loading: executeMutation.isPending,
        error,
        errorDetails,
        lastSql,
        setResult
    };
}
