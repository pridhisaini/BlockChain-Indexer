/**
 * useApi HOOK
 * ============
 * WHY: Provides reusable data fetching logic with loading/error states.
 * Prevents duplicate code across components.
 * Handles async state management consistently.
 */

import { useState, useEffect, useCallback } from 'react';

/**
 * Generic hook for API calls with loading and error handling
 */
export function useApi(fetchFn, dependencies = [], options = {}) {
    const { immediate = true, initialData = null } = options;

    const [data, setData] = useState(initialData);
    const [loading, setLoading] = useState(immediate);
    const [error, setError] = useState(null);

    const execute = useCallback(async (...args) => {
        setLoading(true);
        setError(null);
        try {
            const result = await fetchFn(...args);
            setData(result.data !== undefined ? result.data : result);
            return result;
        } catch (err) {
            setError(err.message || 'An error occurred');
            throw err;
        } finally {
            setLoading(false);
        }
    }, [fetchFn]);

    useEffect(() => {
        if (immediate) {
            execute().catch(() => { }); // Error is stored in state
        }
    }, dependencies);

    return { data, loading, error, execute, setData };
}

/**
 * Hook for paginated API calls
 */
export function usePaginatedApi(fetchFn, initialParams = {}) {
    const [data, setData] = useState([]);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [params, setParams] = useState(initialParams);

    const fetchData = useCallback(async (newParams = {}) => {
        setLoading(true);
        setError(null);
        try {
            const mergedParams = { ...params, ...newParams };
            const result = await fetchFn(mergedParams);
            setData(result.data || []);
            if (result.pagination) {
                setPagination(result.pagination);
            }
            setParams(mergedParams);
            return result;
        } catch (err) {
            setError(err.message || 'An error occurred');
        } finally {
            setLoading(false);
        }
    }, [fetchFn, params]);

    const goToPage = useCallback((page) => {
        fetchData({ page });
    }, [fetchData]);

    const changeLimit = useCallback((limit) => {
        fetchData({ page: 1, limit });
    }, [fetchData]);

    useEffect(() => {
        fetchData();
    }, []);

    return {
        data,
        pagination,
        loading,
        error,
        fetchData,
        goToPage,
        changeLimit,
        setParams: (newParams) => fetchData({ ...params, ...newParams, page: 1 }),
    };
}

/**
 * Hook for polling data at intervals
 */
export function usePolling(fetchFn, interval = 30000) {
    const { data, loading, error, execute } = useApi(fetchFn, [], { immediate: true });

    useEffect(() => {
        const timer = setInterval(() => {
            execute().catch(() => { });
        }, interval);

        return () => clearInterval(timer);
    }, [execute, interval]);

    return { data, loading, error, refresh: execute };
}

export default { useApi, usePaginatedApi, usePolling };
