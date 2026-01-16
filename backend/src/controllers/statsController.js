/**
 * STATS CONTROLLER
 * =================
 * WHY: Handles HTTP request/response for stats and network endpoints.
 * Provides system overview and health information.
 */

import statsService from '../services/statsService.js';
import { successResponse, HttpErrors } from '../utils/responseHelpers.js';
import logger from '../utils/logger.js';

/**
 * GET /stats
 * Get overall system statistics
 */
export async function getStats(req, res) {
    try {
        const stats = await statsService.getStats();
        return successResponse(res, stats);
    } catch (error) {
        logger.error('Error fetching stats', { error: error.message });
        return HttpErrors.serverError(res, 'Failed to fetch statistics');
    }
}

/**
 * GET /networks
 * Get all active networks
 */
export async function getNetworks(req, res) {
    try {
        const networks = await statsService.getNetworks();
        return successResponse(res, networks);
    } catch (error) {
        logger.error('Error fetching networks', { error: error.message });
        return HttpErrors.serverError(res, 'Failed to fetch networks');
    }
}

/**
 * GET /networks/:network
 * Get specific network stats
 */
export async function getNetworkStats(req, res) {
    try {
        const { network } = req.params;

        const stats = await statsService.getNetworkStats(network);

        if (!stats) {
            return HttpErrors.notFound(res, 'Network not found');
        }

        return successResponse(res, stats);
    } catch (error) {
        logger.error('Error fetching network stats', { error: error.message });
        return HttpErrors.serverError(res, 'Failed to fetch network statistics');
    }
}

/**
 * GET /health
 * Health check endpoint
 */
export async function healthCheck(req, res) {
    try {
        // Quick DB check
        const stats = await statsService.getStats();

        return successResponse(res, {
            status: 'healthy',
            uptime: process.uptime(),
            networks: stats.length,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        logger.error('Health check failed', { error: error.message });
        return res.status(503).json({
            success: false,
            error: {
                message: 'Service unhealthy',
                code: 503,
            },
            timestamp: new Date().toISOString(),
        });
    }
}

export default {
    getStats,
    getNetworks,
    getNetworkStats,
    healthCheck,
};
