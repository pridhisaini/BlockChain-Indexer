/**
 * ADDRESS SERVICE
 * ================
 * WHY: Encapsulates address-related database operations.
 * Provides address balance and transaction history lookups.
 */

import db from '../database/connection.js';
import logger from '../utils/logger.js';

/**
 * Get address details
 */
export async function getAddress(address, network = null) {
    const params = [address];
    let whereClause = 'WHERE a.address = $1';

    if (network) {
        params.push(network);
        whereClause += ` AND n.name = $${params.length}`;
    }

    const result = await db.query(`
    SELECT 
      a.id,
      a.address,
      a.balance,
      a.tx_count,
      a.first_seen_at,
      a.last_seen_at,
      n.name AS network,
      n.symbol
    FROM addresses a
    JOIN networks n ON n.id = a.network_id
    ${whereClause}
  `, params);

    return result.rows;
}

/**
 * Get address transactions with pagination
 */
export async function getAddressTransactions(address, { network, page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;
    const params = [address, address];
    let networkCondition = '';

    if (network) {
        params.push(network);
        networkCondition = `AND n.name = $${params.length}`;
    }

    // Count query
    const countResult = await db.query(`
    SELECT COUNT(*) as total
    FROM transactions t
    JOIN networks n ON n.id = t.network_id
    WHERE (t.from_address = $1 OR t.to_address = $2)
    ${networkCondition}
  `, params);
    const total = parseInt(countResult.rows[0].total);

    // Data query
    params.push(limit, offset);
    const txResult = await db.query(`
    SELECT 
      t.id,
      t.tx_hash,
      t.from_address,
      t.to_address,
      t.value,
      t.fee,
      t.status,
      t.created_at,
      n.name AS network,
      n.symbol,
      b.height AS block_height
    FROM transactions t
    JOIN networks n ON n.id = t.network_id
    LEFT JOIN blocks b ON b.id = t.block_id
    WHERE (t.from_address = $1 OR t.to_address = $2)
    ${networkCondition}
    ORDER BY t.created_at DESC
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `, params);

    return {
        transactions: txResult.rows,
        total,
    };
}

/**
 * Get address UTXO balance (for Bitcoin)
 */
export async function getAddressUtxoBalance(address, networkId) {
    const result = await db.query(`
    SELECT COALESCE(SUM(value::numeric), 0) as balance
    FROM transaction_outputs
    WHERE address = $1 AND is_spent = false
    AND transaction_id IN (
      SELECT id FROM transactions WHERE network_id = $2
    )
  `, [address, networkId]);

    return result.rows[0].balance;
}

/**
 * Get unspent outputs for an address (BTC)
 */
export async function getAddressUtxos(address, networkId, page = 1, limit = 50) {
    const offset = (page - 1) * limit;

    const countResult = await db.query(`
    SELECT COUNT(*) as total
    FROM transaction_outputs o
    JOIN transactions t ON t.id = o.transaction_id
    WHERE o.address = $1 AND o.is_spent = false AND t.network_id = $2
  `, [address, networkId]);
    const total = parseInt(countResult.rows[0].total);

    const utxoResult = await db.query(`
    SELECT 
      o.vout_index,
      o.value,
      o.script_type,
      t.tx_hash,
      b.height AS block_height
    FROM transaction_outputs o
    JOIN transactions t ON t.id = o.transaction_id
    LEFT JOIN blocks b ON b.id = t.block_id
    WHERE o.address = $1 AND o.is_spent = false AND t.network_id = $2
    ORDER BY b.height DESC
    LIMIT $3 OFFSET $4
  `, [address, networkId, limit, offset]);

    return {
        utxos: utxoResult.rows,
        total,
    };
}

/**
 * Upsert address record
 */
export async function upsertAddress(addressData, client = null) {
    const queryFn = client ? client.query.bind(client) : db.query;

    await queryFn(`
    INSERT INTO addresses (network_id, address, tx_count, first_seen_at, last_seen_at)
    VALUES ($1, $2, 1, NOW(), NOW())
    ON CONFLICT (network_id, address)
    DO UPDATE SET
      tx_count = addresses.tx_count + 1,
      last_seen_at = NOW(),
      updated_at = NOW()
  `, [addressData.network_id, addressData.address]);
}

export default {
    getAddress,
    getAddressTransactions,
    getAddressUtxoBalance,
    getAddressUtxos,
    upsertAddress,
};
