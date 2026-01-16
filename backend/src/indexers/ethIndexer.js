/**
 * ETHEREUM INDEXER
 * =================
 * WHY: Fetches and processes Ethereum blocks and transactions.
 * Uses ethers.js for RPC communication.
 * Tracks indexing progress in database.
 * 
 * This is REAL, WORKING code - not pseudo-code.
 */

import { ethers } from 'ethers';
import config from '../config/index.js';
import db from '../database/connection.js';
import blockService from '../services/blockService.js';
import transactionService from '../services/transactionService.js';
import statsService from '../services/statsService.js';
import logger from '../utils/logger.js';

const NETWORK_ID = config.eth.networkId;
const CONFIRMATIONS = config.eth.confirmations;
const BATCH_SIZE = config.eth.batchSize;

class EthIndexer {
    constructor() {
        this.provider = null;
        this.isRunning = false;
        this.lastProcessedHeight = 0;
    }

    /**
     * Initialize the provider
     */
    async initialize() {
        this.provider = new ethers.JsonRpcProvider(config.eth.rpcUrl);

        // Test connection
        try {
            const network = await this.provider.getNetwork();
            logger.info('ETH Indexer: Connected to network', { chainId: network.chainId.toString() });
        } catch (error) {
            logger.error('ETH Indexer: Failed to connect', { error: error.message });
            throw error;
        }

        // Get last indexed height from DB (ensure it's a number)
        const state = await statsService.getIndexerState(NETWORK_ID);
        this.lastProcessedHeight = parseInt(state?.last_indexed_height, 10) || 0;

        logger.info('ETH Indexer: Initialized', { lastHeight: this.lastProcessedHeight });
    }

    /**
     * Get the current blockchain height
     */
    async getCurrentHeight() {
        return await this.provider.getBlockNumber();
    }

    /**
     * Fetch a single block with all transactions
     */
    async fetchBlock(height) {
        const block = await this.provider.getBlock(height, true);

        if (!block) {
            throw new Error(`Block ${height} not found`);
        }

        return block;
    }

    /**
     * Process a single block - stores block and all transactions
     */
    async processBlock(height) {
        const block = await this.fetchBlock(height);

        // Use transaction for atomicity
        await db.transaction(async (client) => {
            // Insert block
            const blockId = await blockService.upsertBlock({
                network_id: NETWORK_ID,
                height: block.number,
                hash: block.hash,
                parent_hash: block.parentHash,
                block_timestamp: new Date(block.timestamp * 1000),
                miner: block.miner,
                difficulty: block.difficulty?.toString(),
                gas_used: block.gasUsed?.toString(),
                gas_limit: block.gasLimit?.toString(),
                tx_count: block.transactions?.length || 0,
                status: 'CONFIRMED',
                data: {
                    nonce: block.nonce,
                    extraData: block.extraData,
                    baseFeePerGas: block.baseFeePerGas?.toString(),
                },
            }, client);

            // Process transactions
            const txs = block.prefetchedTransactions || [];
            for (let i = 0; i < txs.length; i++) {
                const tx = txs[i];

                // Get receipt for gas used
                let receipt = null;
                try {
                    receipt = await this.provider.getTransactionReceipt(tx.hash);
                } catch (e) {
                    logger.warn('Failed to get receipt', { txHash: tx.hash });
                }

                const gasUsed = receipt?.gasUsed?.toString();
                const fee = receipt && tx.gasPrice
                    ? (BigInt(receipt.gasUsed) * BigInt(tx.gasPrice)).toString()
                    : null;

                await transactionService.upsertTransaction({
                    network_id: NETWORK_ID,
                    block_id: blockId,
                    tx_hash: tx.hash,
                    tx_index: i,
                    from_address: tx.from,
                    to_address: tx.to,
                    value: tx.value?.toString() || '0',
                    gas_price: tx.gasPrice?.toString(),
                    gas_used: gasUsed,
                    gas_limit: tx.gasLimit?.toString(),
                    nonce: tx.nonce,
                    input_data: tx.data,
                    fee: fee,
                    status: receipt?.status === 1 ? 'SUCCESS' : receipt?.status === 0 ? 'FAILED' : 'PENDING',
                    data: { type: tx.type, accessList: tx.accessList },
                }, client);
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
        logger.info('ETH Indexer: Processed block', { height, txCount: block.transactions?.length || 0 });
    }

    /**
     * Index a range of blocks
     */
    async indexBlocks(startHeight, endHeight) {
        for (let height = startHeight; height <= endHeight; height++) {
            try {
                await this.processBlock(height);
            } catch (error) {
                logger.error('ETH Indexer: Failed to process block', { height, error: error.message });

                // Update state with error
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
            logger.debug('ETH Indexer: Already running, skipping cycle');
            return;
        }

        this.isRunning = true;

        try {
            if (!this.provider) {
                await this.initialize();
            }

            const currentHeight = await this.getCurrentHeight();
            const safeHeight = currentHeight - CONFIRMATIONS;
            const startHeight = this.lastProcessedHeight + 1;

            if (startHeight > safeHeight) {
                logger.debug('ETH Indexer: Already up to date', { lastProcessed: this.lastProcessedHeight, safeHeight });
                return;
            }

            // Process blocks in batches
            const endHeight = Math.min(startHeight + BATCH_SIZE - 1, safeHeight);

            logger.info('ETH Indexer: Starting cycle', { from: startHeight, to: endHeight, safeHeight });

            await this.indexBlocks(startHeight, endHeight);

            // Update state to not syncing when caught up
            if (endHeight >= safeHeight) {
                await statsService.updateIndexerState(NETWORK_ID, {
                    is_syncing: false,
                    error_message: null,
                });
            }

        } catch (error) {
            logger.error('ETH Indexer: Cycle failed', { error: error.message });
        } finally {
            this.isRunning = false;
        }
    }
}

// Export singleton instance
export const ethIndexer = new EthIndexer();

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    (async () => {
        await ethIndexer.initialize();
        await ethIndexer.runCycle();
        process.exit(0);
    })().catch(err => {
        logger.error('ETH Indexer: Fatal error', { error: err.message });
        process.exit(1);
    });
}

export default ethIndexer;
