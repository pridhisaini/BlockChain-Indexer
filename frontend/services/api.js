/**
 * API SERVICE
 * ============
 * WHY: Centralizes all API calls in one place.
 * Uses config for base URL and settings.
 * Makes it easy to add auth or modify requests.
 */

import config from '../config';

const { baseUrl, timeout } = config.api;

/**
 * Generic fetch wrapper with error handling and timeout
 */
async function fetchAPI(endpoint, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(`${baseUrl}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            signal: controller.signal,
            ...options,
        });

        clearTimeout(timeoutId);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error?.message || 'API request failed');
        }

        return data;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('Request timed out');
        }
        console.error(`API Error [${endpoint}]:`, error.message);
        throw error;
    }
}

// ==========================================
// STATS & NETWORKS
// ==========================================

export async function getStats() {
    return fetchAPI('/stats');
}

export async function getNetworks() {
    return fetchAPI('/networks');
}

export async function getNetworkStats(network) {
    return fetchAPI(`/networks/${network}`);
}

export async function healthCheck() {
    return fetchAPI('/health');
}

// ==========================================
// BLOCKS
// ==========================================

export async function getBlocks({ network, page = 1, limit = config.pagination.defaultLimit } = {}) {
    const params = new URLSearchParams({ page, limit });
    if (network) params.append('network', network);
    return fetchAPI(`/blocks?${params}`);
}

export async function getBlock(identifier, network = null) {
    const params = network ? `?network=${network}` : '';
    return fetchAPI(`/blocks/${identifier}${params}`);
}

export async function getBlockTransactions(identifier, { page = 1, limit = config.pagination.defaultLimit } = {}) {
    const params = new URLSearchParams({ page, limit });
    return fetchAPI(`/blocks/${identifier}/transactions?${params}`);
}

// ==========================================
// TRANSACTIONS
// ==========================================

export async function getTransactions({ network, address, page = 1, limit = config.pagination.defaultLimit } = {}) {
    const params = new URLSearchParams({ page, limit });
    if (network) params.append('network', network);
    if (address) params.append('address', address);
    return fetchAPI(`/transactions?${params}`);
}

export async function getTransaction(hash) {
    return fetchAPI(`/transactions/${hash}`);
}

// ==========================================
// ADDRESSES
// ==========================================

export async function getAddress(address, network = null) {
    const params = network ? `?network=${network}` : '';
    return fetchAPI(`/addresses/${address}${params}`);
}

export async function getAddressTransactions(address, { network, page = 1, limit = config.pagination.defaultLimit } = {}) {
    const params = new URLSearchParams({ page, limit });
    if (network) params.append('network', network);
    return fetchAPI(`/addresses/${address}/transactions?${params}`);
}

export async function getAddressUtxos(address, { page = 1, limit = 50 } = {}) {
    const params = new URLSearchParams({ page, limit });
    return fetchAPI(`/addresses/${address}/utxos?${params}`);
}

// ==========================================
// SEARCH
// ==========================================

export async function search(query) {
    return fetchAPI(`/search?q=${encodeURIComponent(query)}`);
}

export default {
    getStats,
    getNetworks,
    getNetworkStats,
    healthCheck,
    getBlocks,
    getBlock,
    getBlockTransactions,
    getTransactions,
    getTransaction,
    getAddress,
    getAddressTransactions,
    getAddressUtxos,
    search,
};
