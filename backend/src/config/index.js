/**
 * CONFIG MODULE
 * =============
 * WHY: Centralizes all configuration in one place.
 * Validates environment variables at startup to fail fast.
 * Provides typed access to configuration values.
 */

import dotenv from 'dotenv';
dotenv.config();

const config = {
    // Server
    port: parseInt(process.env.PORT) || 3001,
    nodeEnv: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'info',

    // Database
    db: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 5432,
        name: process.env.DB_NAME || 'blockchain_indexer',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'password',
    },

    // Ethereum - Using free public RPCs for real-time data
    // Options: Cloudflare, Ankr, LlamaNodes, PublicNode
    eth: {
        rpcUrl: process.env.ETH_RPC_URL || 'https://cloudflare-eth.com',
        // Alternative free RPCs (uncomment to use):
        // 'https://rpc.ankr.com/eth'
        // 'https://eth.llamarpc.com'
        // 'https://ethereum.publicnode.com'
        networkId: parseInt(process.env.ETH_NETWORK_ID) || 1,
        confirmations: parseInt(process.env.ETH_CONFIRMATIONS) || 12,
        batchSize: parseInt(process.env.ETH_BATCH_SIZE) || 10,
        cronInterval: process.env.ETH_CRON_INTERVAL || '*/15 * * * * *',
    },

    // Bitcoin - Using Blockstream public API for real-time data
    btc: {
        rpcUrl: process.env.BTC_RPC_URL || 'https://blockstream.info/api',
        // Alternative: 'https://mempool.space/api'
        rpcUser: process.env.BTC_RPC_USER || 'rpcuser',
        rpcPassword: process.env.BTC_RPC_PASSWORD || 'rpcpassword',
        networkId: parseInt(process.env.BTC_NETWORK_ID) || 2,
        confirmations: parseInt(process.env.BTC_CONFIRMATIONS) || 6,
        batchSize: parseInt(process.env.BTC_BATCH_SIZE) || 5,
        cronInterval: process.env.BTC_CRON_INTERVAL || '*/60 * * * * *',
    },
};

// Validate critical configuration
export function validateConfig() {
    const required = ['ETH_RPC_URL'];
    const missing = required.filter((key) => !process.env[key]);

    if (missing.length > 0) {
        console.warn(`Warning: Missing environment variables: ${missing.join(', ')}`);
    }
}

export default config;
