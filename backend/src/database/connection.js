/**
 * DATABASE CONNECTION MODULE
 * ==========================
 * WHY: Centralizes database connection management.
 * Provides connection pooling for efficient resource usage.
 * Supports transactions for atomic operations.
 */

import pg from 'pg';
import config from '../config/index.js';
import logger from '../utils/logger.js';

const { Pool } = pg;

// Create connection pool
const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  database: config.db.name,
  user: config.db.user,
  password: config.db.password,
  max: 20,                      // Maximum pool size
  idleTimeoutMillis: 30000,     // Close idle connections after 30s
  connectionTimeoutMillis: 5000, // Timeout after 5s if can't connect
});

// Log connection events
pool.on('connect', () => {
  logger.debug('New database connection established');
});

pool.on('error', (err) => {
  logger.error('Unexpected database error', { error: err.message });
});

/**
 * Execute a SQL query
 * @param {string} text - SQL query string
 * @param {Array} params - Query parameters
 * @returns {Promise<pg.QueryResult>}
 */
export async function query(text, params = []) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;

    if (config.nodeEnv === 'development') {
      logger.debug('Query executed', {
        query: text.substring(0, 100),
        duration: `${duration}ms`,
        rows: result.rowCount
      });
    }

    return result;
  } catch (error) {
    logger.error('Query failed', {
      query: text.substring(0, 100),
      error: error.message
    });
    throw error;
  }
}

/**
 * Get a client for transaction operations
 * @returns {Promise<pg.PoolClient>}
 */
export async function getClient() {
  const client = await pool.connect();
  return client;
}

/**
 * Execute multiple queries in a transaction
 * @param {Function} callback - Function that receives client and executes queries
 * @returns {Promise<any>}
 */
export async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Transaction rolled back', { error: error.message });
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Test database connection
 * @returns {Promise<boolean>}
 */
export async function testConnection() {
  try {
    await query('SELECT 1');
    logger.info('Database connection successful');
    return true;
  } catch (error) {
    logger.error('Database connection failed', { error: error.message });
    return false;
  }
}

/**
 * Close all connections (for graceful shutdown)
 */
export async function closePool() {
  await pool.end();
  logger.info('Database pool closed');
}

export default { query, getClient, transaction, testConnection, closePool, pool };
