/**
 * STATS SERVICE
 * ==============
 * WHY: Provides aggregated statistics across all networks.
 * Separated from other services for single responsibility.
 */

import db from '../database/connection.js';
import logger from '../utils/logger.js';

/**
 * Get overall system statistics
 */
export async function getStats() {
    const result = await db.query(`
    SELECT 
      n.id,
      n.name AS network,
      n.symbol,
      n.chain_type,
      COALESCE(i.last_indexed_height, 0) AS current_height,
      COALESCE(i.is_syncing, false) AS is_syncing,
      i.last_indexed_at,
      (SELECT COUNT(*) FROM blocks WHERE network_id = n.id) AS total_blocks,
      (SELECT COUNT(*) FROM transactions WHERE network_id = n.id) AS total_transactions,
      (SELECT COUNT(*) FROM addresses WHERE network_id = n.id) AS total_addresses
    FROM networks n
    LEFT JOIN indexer_state i ON i.network_id = n.id
    WHERE n.is_active = true
    ORDER BY n.id
  `);

    return result.rows;
}

/**
 * Get network-specific stats
 */
export async function getNetworkStats(networkName) {
    const result = await db.query(`
    SELECT 
      n.id,
      n.name AS network,
      n.symbol,
      n.chain_type,
      COALESCE(i.last_indexed_height, 0) AS current_height,
      COALESCE(i.is_syncing, false) AS is_syncing,
      i.last_indexed_at,
      i.error_message,
      (SELECT COUNT(*) FROM blocks WHERE network_id = n.id) AS total_blocks,
      (SELECT COUNT(*) FROM transactions WHERE network_id = n.id) AS total_transactions,
      (SELECT COUNT(*) FROM addresses WHERE network_id = n.id) AS total_addresses,
      (SELECT MAX(block_timestamp) FROM blocks WHERE network_id = n.id) AS latest_block_time,
      (SELECT AVG(tx_count) FROM blocks WHERE network_id = n.id) AS avg_txs_per_block
    FROM networks n
    LEFT JOIN indexer_state i ON i.network_id = n.id
    WHERE n.name = $1
  `, [networkName]);

    return result.rows[0] || null;
}

/**
 * Get all networks
 */
export async function getNetworks() {
    const result = await db.query(`
    SELECT 
      n.id,
      n.name,
      n.symbol,
      n.chain_type,
      n.rpc_url,
      n.is_active,
      COALESCE(i.last_indexed_height, 0) AS last_indexed_height,
      COALESCE(i.is_syncing, false) AS is_syncing
    FROM networks n
    LEFT JOIN indexer_state i ON i.network_id = n.id
    WHERE n.is_active = true
    ORDER BY n.id
  `);

    return result.rows;
}

/**
 * Get indexer state for a network
 */
export async function getIndexerState(networkId) {
    const result = await db.query(`
    SELECT * FROM indexer_state WHERE network_id = $1
  `, [networkId]);

    return result.rows[0] || null;
}

/**
 * Update indexer state
 */
export async function updateIndexerState(networkId, data, client = null) {
    const queryFn = client ? client.query.bind(client) : db.query;

    await queryFn(`
    UPDATE indexer_state
    SET 
      last_indexed_height = COALESCE($2, last_indexed_height),
      last_indexed_hash = COALESCE($3, last_indexed_hash),
      last_indexed_at = COALESCE($4, last_indexed_at),
      is_syncing = COALESCE($5, is_syncing),
      error_message = $6,
      updated_at = NOW()
    WHERE network_id = $1
  `, [
        networkId,
        data.last_indexed_height,
        data.last_indexed_hash,
        data.last_indexed_at,
        data.is_syncing,
        data.error_message || null,
    ]);
}

export default {
    getStats,
    getNetworkStats,
    getNetworks,
    getIndexerState,
    updateIndexerState,
};
