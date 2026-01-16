/**
 * TRANSACTION CONTROLLER
 * =======================
 * WHY: Handles HTTP request/response logic for transaction endpoints.
 * Validates input, calls services, formats responses.
 */

import transactionService from '../services/transactionService.js';
import { successResponse, paginatedResponse, HttpErrors } from '../utils/responseHelpers.js';
import logger from '../utils/logger.js';

/**
 * GET /transactions
 * Get paginated list of transactions
 */
export async function getTransactions(req, res) {
    try {
        const { network, address, page = 1, limit = 20 } = req.query;

        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

        const { transactions, total } = await transactionService.getTransactions({
            network,
            address,
            page: pageNum,
            limit: limitNum,
        });

        return paginatedResponse(res, transactions, {
            page: pageNum,
            limit: limitNum,
            total,
        });
    } catch (error) {
        logger.error('Error fetching transactions', { error: error.message });
        return HttpErrors.serverError(res, 'Failed to fetch transactions');
    }
}

/**
 * GET /transactions/:hash
 * Get a single transaction by hash
 */
export async function getTransaction(req, res) {
    try {
        const { hash } = req.params;

        if (!hash) {
            return HttpErrors.badRequest(res, 'Transaction hash is required');
        }

        const transaction = await transactionService.getTransactionByHash(hash);

        if (!transaction) {
            return HttpErrors.notFound(res, 'Transaction not found');
        }

        return successResponse(res, transaction);
    } catch (error) {
        logger.error('Error fetching transaction', { error: error.message });
        return HttpErrors.serverError(res, 'Failed to fetch transaction');
    }
}

export default {
    getTransactions,
    getTransaction,
};
