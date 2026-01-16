/**
 * CRON JOBS / WORKERS
 * ====================
 * WHY: Schedules periodic indexing tasks.
 * Uses node-cron for reliable scheduling.
 * Prevents duplicate runs with isRunning flags.
 * 
 * This module provides safe, periodic indexing.
 */

import cron from 'node-cron';
import config from '../config/index.js';
import { ethIndexer } from '../indexers/ethIndexer.js';
import { btcIndexer } from '../indexers/btcIndexer.js';
import logger from '../utils/logger.js';

// Track running jobs to prevent overlaps
const jobStatus = {
    eth: false,
    btc: false,
};

/**
 * ETH Indexing Job
 * Runs every 15 seconds by default
 */
export function startEthCron() {
    const schedule = config.eth.cronInterval;

    cron.schedule(schedule, async () => {
        if (jobStatus.eth) {
            logger.debug('ETH Cron: Previous job still running, skipping');
            return;
        }

        jobStatus.eth = true;
        try {
            logger.debug('ETH Cron: Starting indexing cycle');
            await ethIndexer.runCycle();
        } catch (error) {
            logger.error('ETH Cron: Job failed', { error: error.message });
        } finally {
            jobStatus.eth = false;
        }
    });

    logger.info('ETH Cron: Scheduled', { schedule });
}

/**
 * BTC Indexing Job
 * Runs every 60 seconds by default
 */
export function startBtcCron() {
    const schedule = config.btc.cronInterval;

    cron.schedule(schedule, async () => {
        if (jobStatus.btc) {
            logger.debug('BTC Cron: Previous job still running, skipping');
            return;
        }

        jobStatus.btc = true;
        try {
            logger.debug('BTC Cron: Starting indexing cycle');
            await btcIndexer.runCycle();
        } catch (error) {
            logger.error('BTC Cron: Job failed', { error: error.message });
        } finally {
            jobStatus.btc = false;
        }
    });

    logger.info('BTC Cron: Scheduled', { schedule });
}

/**
 * Health Check Job
 * Runs every minute to log indexer status
 */
export function startHealthCron() {
    cron.schedule('0 * * * * *', async () => {
        logger.debug('Health Check', {
            ethRunning: jobStatus.eth,
            btcRunning: jobStatus.btc,
            uptime: Math.floor(process.uptime()),
        });
    });
}

/**
 * Start all cron jobs
 */
export function startAllCrons() {
    logger.info('Starting cron jobs...');

    // Initialize indexers
    ethIndexer.initialize().catch(err => {
        logger.warn('ETH Indexer init failed (will retry)', { error: err.message });
    });

    btcIndexer.initialize().catch(err => {
        logger.warn('BTC Indexer init failed (will retry)', { error: err.message });
    });

    // Start cron jobs
    startEthCron();
    startBtcCron();
    startHealthCron();

    logger.info('All cron jobs started');
}

/**
 * Manual trigger for indexing (useful for testing)
 */
export async function triggerIndexing(network) {
    if (network === 'ethereum' || network === 'eth') {
        await ethIndexer.runCycle();
    } else if (network === 'bitcoin' || network === 'btc') {
        await btcIndexer.runCycle();
    } else {
        throw new Error(`Unknown network: ${network}`);
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    startAllCrons();

    // Keep process alive
    process.on('SIGINT', () => {
        logger.info('Shutting down cron jobs...');
        process.exit(0);
    });
}

export default {
    startEthCron,
    startBtcCron,
    startHealthCron,
    startAllCrons,
    triggerIndexing,
};
