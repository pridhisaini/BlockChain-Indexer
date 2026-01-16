/**
 * BITCOIN INDEXER
 * ================
 * WHY: Fetches and processes Bitcoin blocks using RPC.
 * Handles UTXO model with inputs and outputs.
 * Sequential block walking for reliability.
 * 
 * This is REAL, WORKING code - not pseudo-code.
 */

import config from '../config/index.js';
import db from '../database/connection.js';
import blockService from '../services/blockService.js';
import transactionService from '../services/transactionService.js';
import addressService from '../services/addressService.js';
import statsService from '../services/statsService.js';
import logger from '../utils/logger.js';

const NETWORK_ID = config.btc.networkId;
const CONFIRMATIONS = config.btc.confirmations;
const BATCH_SIZE = config.btc.batchSize;

class BtcIndexer {
    constructor() {
        // Use Blockstream API as public Bitcoin data source
        this.apiUrl = config.btc.rpcUrl || 'https://blockstream.info/api';
        this.isRunning = false;
        this.lastProcessedHeight = 0;
    }

    /**
     * Make Blockstream REST API call
     */
    async apiCall(endpoint) {
        const url = `${this.apiUrl}${endpoint}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`API HTTP error: ${response.status} for ${endpoint}`);
        }

        // Some endpoints return text (like block height)
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        }
        return await response.text();
    }

    /**
     * Initialize the indexer
     */
    async initialize() {
        try {
            const height = await this.getCurrentHeight();
            const tipHash = await this.apiCall('/blocks/tip/hash');
            logger.info('BTC Indexer: Connected to Blockstream API', { blocks: height, tipHash: tipHash.substring(0, 16) + '...' });
        } catch (error) {
            logger.error('BTC Indexer: Failed to connect', { error: error.message });
            throw error;
        }

        // Get last indexed height from DB (ensure it's a number)
        const state = await statsService.getIndexerState(NETWORK_ID);
        this.lastProcessedHeight = parseInt(state?.last_indexed_height, 10) || 0;

        logger.info('BTC Indexer: Initialized', { lastHeight: this.lastProcessedHeight });
    }

    /**
     * Get current blockchain height
     */
    async getCurrentHeight() {
        const height = await this.apiCall('/blocks/tip/height');
        return parseInt(height, 10);
    }

    /**
     * Fetch a block with full transaction data
     */
    async fetchBlock(height) {
        // Get block hash at height
        const blockHash = await this.apiCall(`/block-height/${height}`);
        // Get block details
        const block = await this.apiCall(`/block/${blockHash}`);
        // Get block transactions
        const txs = await this.apiCall(`/block/${blockHash}/txs`);

        return {
            ...block,
            hash: block.id,
            previousblockhash: block.previousblockhash,
            time: block.timestamp,
            nTx: block.tx_count,
            tx: txs,
        };
    }

    /**
     * Extract address from scriptPubKey
     */
    extractAddress(scriptPubKey) {
        if (!scriptPubKey) return null;

        // Modern format
        if (scriptPubKey.address) {
            return scriptPubKey.address;
        }

        // Legacy format
        if (scriptPubKey.addresses && scriptPubKey.addresses.length > 0) {
            return scriptPubKey.addresses[0];
        }

        return null;
    }

    /**
     * Process a single block with all transactions (Blockstream format)
     */
    async processBlock(height) {
        const block = await this.fetchBlock(height);

        await db.transaction(async (client) => {
            // Insert block (Blockstream uses slightly different field names)
            const blockId = await blockService.upsertBlock({
                network_id: NETWORK_ID,
                height: block.height,
                hash: block.id || block.hash,
                parent_hash: block.previousblockhash || '',
                block_timestamp: new Date(block.timestamp * 1000),
                difficulty: block.difficulty?.toString(),
                size_bytes: block.size,
                tx_count: block.tx_count || block.nTx,
                status: 'CONFIRMED',
                data: {
                    version: block.version,
                    merkleroot: block.merkle_root,
                    nonce: block.nonce,
                    bits: block.bits,
                    weight: block.weight,
                },
            }, client);

            // Process each transaction
            for (const tx of block.tx) {
                await this.processTransaction(tx, blockId, client);
            }

            // Update indexer state
            await statsService.updateIndexerState(NETWORK_ID, {
                last_indexed_height: height,
                last_indexed_hash: block.hash,
                last_indexed_at: new Date(),
                is_syncing: true,
            }, client);
        });

        this.lastProcessedHeight = height;
        logger.info('BTC Indexer: Processed block', { height, txCount: block.nTx });
    }

    /**
     * Process a single Bitcoin transaction (Blockstream format)
     */
    async processTransaction(tx, blockId, client) {
        const isCoinbase = tx.vin[0]?.is_coinbase ? true : false;

        // Calculate total output value (Blockstream returns value in satoshis)
        const totalOutput = tx.vout.reduce((sum, out) => sum + (out.value || 0), 0);
        const valueSatoshis = totalOutput.toString();

        // Insert transaction
        const txId = await transactionService.upsertTransaction({
            network_id: NETWORK_ID,
            block_id: blockId,
            tx_hash: tx.txid,
            value: valueSatoshis,
            status: 'SUCCESS',
            is_coinbase: isCoinbase,
            data: {
                version: tx.version,
                size: tx.size,
                weight: tx.weight,
                locktime: tx.locktime,
                fee: tx.fee,
            },
        }, client);

        // Process inputs
        for (let i = 0; i < tx.vin.length; i++) {
            const vin = tx.vin[i];

            await transactionService.insertTransactionInput({
                transaction_id: txId,
                vin_index: i,
                prev_tx_hash: vin.txid || null,
                prev_vout_index: vin.vout !== undefined ? vin.vout : null,
                script_sig: vin.scriptsig,
                script_sig_asm: vin.scriptsig_asm,
                sequence: vin.sequence,
                witness: vin.witness,
                is_coinbase: vin.is_coinbase || false,
                prevout_value: vin.prevout?.value,
                prevout_address: vin.prevout?.scriptpubkey_address,
            }, client);

            // Mark previous output as spent (skip for coinbase transactions)
            if (!vin.is_coinbase && vin.txid && vin.vout !== undefined) {
                await transactionService.markOutputSpent(
                    NETWORK_ID,
                    vin.txid,
                    vin.vout,
                    tx.txid,
                    client
                );
            }
        }

        // Process outputs (Blockstream format)
        for (let i = 0; i < tx.vout.length; i++) {
            const vout = tx.vout[i];
            // Blockstream uses scriptpubkey_address instead of extracting from scriptPubKey
            const address = vout.scriptpubkey_address || null;
            const valueSat = (vout.value || 0).toString();

            await transactionService.insertTransactionOutput({
                transaction_id: txId,
                vout_index: i,
                address: address,
                value: valueSat,
                script_pubkey: vout.scriptpubkey,
                script_type: vout.scriptpubkey_type,
            }, client);

            // Update address record
            if (address) {
                await addressService.upsertAddress({
                    network_id: NETWORK_ID,
                    address: address,
                }, client);
            }
        }
    }

    /**
     * Index a range of blocks
     */
    async indexBlocks(startHeight, endHeight) {
        for (let height = startHeight; height <= endHeight; height++) {
            try {
                await this.processBlock(height);
            } catch (error) {
                logger.error('BTC Indexer: Failed to process block', { height, error: error.message });

                await statsService.updateIndexerState(NETWORK_ID, {
                    error_message: `Failed at block ${height}: ${error.message}`,
                    is_syncing: false,
                });

                throw error;
            }
        }
    }

    /**
     * Run one indexing cycle - called by cron
     */
    async runCycle() {
        if (this.isRunning) {
            logger.debug('BTC Indexer: Already running, skipping cycle');
            return;
        }

        this.isRunning = true;

        try {
            // Test connection / reinitialize if needed
            try {
                await this.getCurrentHeight();
            } catch {
                await this.initialize();
            }

            const currentHeight = await this.getCurrentHeight();
            const safeHeight = currentHeight - CONFIRMATIONS;
            const startHeight = this.lastProcessedHeight + 1;

            if (startHeight > safeHeight) {
                logger.debug('BTC Indexer: Already up to date', { lastProcessed: this.lastProcessedHeight, safeHeight });
                return;
            }

            const endHeight = Math.min(startHeight + BATCH_SIZE - 1, safeHeight);

            logger.info('BTC Indexer: Starting cycle', { from: startHeight, to: endHeight, safeHeight });

            await this.indexBlocks(startHeight, endHeight);

            if (endHeight >= safeHeight) {
                await statsService.updateIndexerState(NETWORK_ID, {
                    is_syncing: false,
                    error_message: null,
                });
            }

        } catch (error) {
            logger.error('BTC Indexer: Cycle failed', { error: error.message });
        } finally {
            this.isRunning = false;
        }
    }
}

// Export singleton
export const btcIndexer = new BtcIndexer();

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    (async () => {
        await btcIndexer.initialize();
        await btcIndexer.runCycle();
        process.exit(0);
    })().catch(err => {
        logger.error('BTC Indexer: Fatal error', { error: err.message });
        process.exit(1);
    });
}

export default btcIndexer;
