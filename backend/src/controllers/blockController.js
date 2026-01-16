/**
 * BLOCK CONTROLLER
 * =================
 * WHY: Handles HTTP request/response logic for block endpoints.
 * Separates HTTP concerns from business logic (services).
 * Validates input and formats output.
 */

import blockService from '../services/blockService.js';
import { successResponse, paginatedResponse, HttpErrors } from '../utils/responseHelpers.js';
import logger from '../utils/logger.js';

/**
 * GET /blocks
 * Get paginated list of blocks
 */
export async function getBlocks(req, res) {
    try {
        const { network, page = 1, limit = 20 } = req.query;

        // Validate pagination params
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

        const { blocks, total } = await blockService.getBlocks({
            network,
            page: pageNum,
            limit: limitNum,
        });

        return paginatedResponse(res, blocks, {
            page: pageNum,
            limit: limitNum,
            total,
        });
    } catch (error) {
        logger.error('Error fetching blocks', { error: error.message });
        return HttpErrors.serverError(res, 'Failed to fetch blocks');
    }
}

/**
 * GET /blocks/:identifier
 * Get a single block by hash or height
 */
export async function getBlock(req, res) {
    try {
        const { identifier } = req.params;
        const { network } = req.query;

        if (!identifier) {
            return HttpErrors.badRequest(res, 'Block identifier is required');
        }

        const block = await blockService.getBlockByIdentifier(identifier, network);

        if (!block) {
            return HttpErrors.notFound(res, 'Block not found');
        }

        return successResponse(res, block);
    } catch (error) {
        logger.error('Error fetching block', { error: error.message });
        return HttpErrors.serverError(res, 'Failed to fetch block');
    }
}

/**
 * GET /blocks/:identifier/transactions
 * Get transactions for a specific block
 */
export async function getBlockTransactions(req, res) {
    try {
        const { identifier } = req.params;
        const { network, page = 1, limit = 20 } = req.query;

        // First get the block
        const block = await blockService.getBlockByIdentifier(identifier, network);

        if (!block) {
            return HttpErrors.notFound(res, 'Block not found');
        }

        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

        const { transactions, total } = await blockService.getBlockTransactions(
            block.id,
            pageNum,
            limitNum
        );

        return paginatedResponse(res, transactions, {
            page: pageNum,
            limit: limitNum,
            total,
        });
    } catch (error) {
        logger.error('Error fetching block transactions', { error: error.message });
        return HttpErrors.serverError(res, 'Failed to fetch block transactions');
    }
}

export default {
    getBlocks,
    getBlock,
    getBlockTransactions,
};
