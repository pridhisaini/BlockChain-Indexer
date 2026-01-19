/**
 * FRONTEND CONFIG
 * ================
 * WHY: Centralizes all configuration in one place.
 * Provides typed access to environment variables.
 * Single source of truth for settings.
 */

const config = {
    // API Configuration
    api: {
        baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:3002/api',
        timeout: parseInt(import.meta.env.VITE_API_TIMEOUT) || 10000,
    },

    // Polling intervals (ms)
    polling: {
        dashboard: 30000,   // 30 seconds
        blocks: 15000,      // 15 seconds
        transactions: 15000,
    },

    // Pagination defaults
    pagination: {
        defaultLimit: 20,
        maxLimit: 100,
    },

    // Display settings
    display: {
        hashTruncateStart: 10,
        hashTruncateEnd: 8,
        addressTruncateStart: 10,
        addressTruncateEnd: 6,
    },

    // Network settings
    networks: {
        eth: {
            name: 'Ethereum',
            symbol: 'ETH',
            decimals: 18,
            color: '#627eea',
        },
        btc: {
            name: 'Bitcoin',
            symbol: 'BTC',
            decimals: 8,
            color: '#f7931a',
        },
    },
};

export default config;
