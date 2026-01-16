/**
 * BLOCK SERVICE
 * ==============
 * WHY: Encapsulates all block-related database operations.
 * Separates data access logic from controllers.
 * Makes testing and refactoring easier.
 */

import db from '../database/connection.js';
import logger from '../utils/logger.js';

/**
 * Get blocks with pagination and filtering
 */
export async function getBlocks({ network, page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;
    const params = [];
    let whereClause = '';

    if (network) {
        params.push(network);
        whereClause = 'WHERE n.name = $1';
    }

    // Get total count
    const countQuery = `
    SELECT COUNT(*) as total
    FROM blocks b
    JOIN networks n ON n.id = b.network_id
    ${whereClause}
  `;
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get paginated blocks
    const blocksQuery = `
    SELECT 
      b.id,
      b.height,
      b.hash,
      b.parent_hash,
      b.block_timestamp,
      b.miner,
      b.gas_used,
      b.gas_limit,
      b.size_bytes,
      b.tx_count,
      b.status,
      n.name AS network,
      n.symbol
    FROM blocks b
    JOIN networks n ON n.id = b.network_id
    ${whereClause}
    ORDER BY b.block_timestamp DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;
    params.push(limit, offset);
    const blocksResult = await db.query(blocksQuery, params);

    return {
        blocks: blocksResult.rows,
        total,
    };
}

/**
 * Get a single block by hash or height
 */
export async function getBlockByIdentifier(identifier, network = null) {
    const params = [];
    let whereClause = '';

    // Determine if identifier is hash or height
    if (identifier.startsWith('0x') || identifier.length === 64) {
        params.push(identifier);
        whereClause = 'WHERE b.hash = $1';
    } else {
        params.push(parseInt(identifier));
        whereClause = 'WHERE b.height = $1';
    }

    if (network) {
        params.push(network);
        whereClause += ` AND n.name = $${params.length}`;
    }

    const query = `
    SELECT 
      b.*,
      n.name AS network,
      n.symbol
    FROM blocks b
    JOIN networks n ON n.id = b.network_id
    ${whereClause}
    LIMIT 1
  `;

    const result = await db.query(query, params);
    return result.rows[0] || null;
}

/**
 * Get block transactions
 */
export async function getBlockTransactions(blockId, page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    const countResult = await db.query(
        'SELECT COUNT(*) as total FROM transactions WHERE block_id = $1',
        [blockId]
    );
    const total = parseInt(countResult.rows[0].total);

    const txResult = await db.query(`
    SELECT 
      t.id,
      t.tx_hash,
      t.from_address,
      t.to_address,
      t.value,
      t.fee,
      t.status,
      t.created_at
    FROM transactions t
    WHERE t.block_id = $1
    ORDER BY t.tx_index
    LIMIT $2 OFFSET $3
  `, [blockId, limit, offset]);

    return {
        transactions: txResult.rows,
        total,
    };
}

/**
 * Insert or update a block (idempotent)
 */
export async function upsertBlock(blockData, client = null) {
    const queryFn = client ? client.query.bind(client) : db.query;

    const result = await queryFn(`
    INSERT INTO blocks (
      network_id, height, hash, parent_hash, block_timestamp,
      miner, difficulty, gas_used, gas_limit, size_bytes,
      tx_count, status, data
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    ON CONFLICT (network_id, hash)
    DO UPDATE SET
      status = EXCLUDED.status,
      tx_count = EXCLUDED.tx_count,
      updated_at = NOW()
    RETURNING id
  `, [
        blockData.network_id,
        blockData.height,
        blockData.hash,
        blockData.parent_hash,
        blockData.block_timestamp,
        blockData.miner,
        blockData.difficulty,
        blockData.gas_used,
        blockData.gas_limit,
        blockData.size_bytes,
        blockData.tx_count,
        blockData.status || 'CONFIRMED',
        blockData.data ? JSON.stringify(blockData.data) : null,
    ]);

    return result.rows[0].id;
}

/**
 * Get the latest indexed block for a network
 */
export async function getLatestBlock(networkId) {
    const result = await db.query(`
    SELECT height, hash
    FROM blocks
    WHERE network_id = $1
    ORDER BY height DESC
    LIMIT 1
  `, [networkId]);

    return result.rows[0] || null;
}

export default {
    getBlocks,
    getBlockByIdentifier,
    getBlockTransactions,
    upsertBlock,
    getLatestBlock,
};
