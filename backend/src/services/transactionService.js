/**
 * TRANSACTION SERVICE
 * ====================
 * WHY: Encapsulates all transaction-related database operations.
 * Handles both ETH (account model) and BTC (UTXO model) transactions.
 */

import db from '../database/connection.js';
import logger from '../utils/logger.js';

/**
 * Get transactions with pagination and filtering
 */
export async function getTransactions({ network, address, page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;
    const params = [];
    const conditions = [];

    if (network) {
        params.push(network);
        conditions.push(`n.name = $${params.length}`);
    }

    if (address) {
        params.push(address, address);
        conditions.push(`(t.from_address = $${params.length - 1} OR t.to_address = $${params.length})`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `
    SELECT COUNT(*) as total
    FROM transactions t
    JOIN networks n ON n.id = t.network_id
    ${whereClause}
  `;
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get paginated transactions
    const txQuery = `
    SELECT 
      t.id,
      t.tx_hash,
      t.tx_index,
      t.from_address,
      t.to_address,
      t.value,
      t.gas_price,
      t.gas_used,
      t.fee,
      t.status,
      t.is_coinbase,
      t.created_at,
      n.name AS network,
      n.symbol,
      b.height AS block_height,
      b.hash AS block_hash
    FROM transactions t
    JOIN networks n ON n.id = t.network_id
    LEFT JOIN blocks b ON b.id = t.block_id
    ${whereClause}
    ORDER BY t.created_at DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;
    params.push(limit, offset);
    const txResult = await db.query(txQuery, params);

    return {
        transactions: txResult.rows,
        total,
    };
}

/**
 * Get a single transaction by hash
 */
export async function getTransactionByHash(txHash) {
    const result = await db.query(`
    SELECT 
      t.*,
      n.name AS network,
      n.symbol,
      n.chain_type,
      b.height AS block_height,
      b.hash AS block_hash,
      b.block_timestamp
    FROM transactions t
    JOIN networks n ON n.id = t.network_id
    LEFT JOIN blocks b ON b.id = t.block_id
    WHERE t.tx_hash = $1
  `, [txHash]);

    if (result.rows.length === 0) {
        return null;
    }

    const tx = result.rows[0];

    // For Bitcoin, include inputs and outputs
    if (tx.chain_type === 'utxo') {
        const [inputsResult, outputsResult] = await Promise.all([
            db.query(`
        SELECT vin_index, prev_tx_hash, prev_vout_index, address, value, is_coinbase
        FROM transaction_inputs
        WHERE transaction_id = $1
        ORDER BY vin_index
      `, [tx.id]),
            db.query(`
        SELECT vout_index, address, value, script_type, is_spent, spent_by_tx
        FROM transaction_outputs
        WHERE transaction_id = $1
        ORDER BY vout_index
      `, [tx.id]),
        ]);

        tx.inputs = inputsResult.rows;
        tx.outputs = outputsResult.rows;
    }

    return tx;
}

/**
 * Insert or update a transaction (idempotent)
 */
export async function upsertTransaction(txData, client = null) {
    const queryFn = client ? client.query.bind(client) : db.query;

    const result = await queryFn(`
    INSERT INTO transactions (
      network_id, block_id, tx_hash, tx_index, from_address, to_address,
      value, gas_price, gas_used, gas_limit, nonce, input_data,
      fee, status, is_coinbase, data
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    ON CONFLICT (network_id, tx_hash)
    DO UPDATE SET
      block_id = COALESCE(EXCLUDED.block_id, transactions.block_id),
      status = EXCLUDED.status,
      gas_used = COALESCE(EXCLUDED.gas_used, transactions.gas_used),
      fee = COALESCE(EXCLUDED.fee, transactions.fee),
      updated_at = NOW()
    RETURNING id
  `, [
        txData.network_id,
        txData.block_id,
        txData.tx_hash,
        txData.tx_index,
        txData.from_address,
        txData.to_address,
        txData.value || '0',
        txData.gas_price,
        txData.gas_used,
        txData.gas_limit,
        txData.nonce,
        txData.input_data,
        txData.fee,
        txData.status || 'SUCCESS',
        txData.is_coinbase || false,
        txData.data ? JSON.stringify(txData.data) : null,
    ]);

    return result.rows[0].id;
}

/**
 * Insert transaction input (BTC UTXO)
 */
export async function insertTransactionInput(inputData, client = null) {
    const queryFn = client ? client.query.bind(client) : db.query;

    await queryFn(`
    INSERT INTO transaction_inputs (
      transaction_id, vin_index, prev_tx_hash, prev_vout_index,
      address, value, script_sig, sequence, witness, is_coinbase, coinbase_data
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    ON CONFLICT (transaction_id, vin_index) DO NOTHING
  `, [
        inputData.transaction_id,
        inputData.vin_index,
        inputData.prev_tx_hash,
        inputData.prev_vout_index,
        inputData.address,
        inputData.value,
        inputData.script_sig ? JSON.stringify(inputData.script_sig) : null,
        inputData.sequence,
        inputData.witness ? JSON.stringify(inputData.witness) : null,
        inputData.is_coinbase || false,
        inputData.coinbase_data,
    ]);
}

/**
 * Insert transaction output (BTC UTXO)
 */
export async function insertTransactionOutput(outputData, client = null) {
    const queryFn = client ? client.query.bind(client) : db.query;

    await queryFn(`
    INSERT INTO transaction_outputs (
      transaction_id, vout_index, address, value, script_pubkey, script_type
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (transaction_id, vout_index) DO NOTHING
  `, [
        outputData.transaction_id,
        outputData.vout_index,
        outputData.address,
        outputData.value,
        outputData.script_pubkey ? JSON.stringify(outputData.script_pubkey) : null,
        outputData.script_type,
    ]);
}

/**
 * Mark an output as spent
 */
export async function markOutputSpent(networkId, prevTxHash, prevVoutIndex, spentByTx, client = null) {
    const queryFn = client ? client.query.bind(client) : db.query;

    await queryFn(`
    UPDATE transaction_outputs
    SET is_spent = true, spent_by_tx = $1, spent_at = NOW(), updated_at = NOW()
    WHERE transaction_id IN (
      SELECT id FROM transactions WHERE tx_hash = $2 AND network_id = $3
    )
    AND vout_index = $4
  `, [spentByTx, prevTxHash, networkId, prevVoutIndex]);
}

export default {
    getTransactions,
    getTransactionByHash,
    upsertTransaction,
    insertTransactionInput,
    insertTransactionOutput,
    markOutputSpent,
};
