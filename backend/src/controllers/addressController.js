/**
 * ADDRESS CONTROLLER
 * ===================
 * WHY: Handles HTTP request/response logic for address endpoints.
 * Provides address details and transaction history.
 */

import addressService from '../services/addressService.js';
import { successResponse, paginatedResponse, HttpErrors } from '../utils/responseHelpers.js';
import logger from '../utils/logger.js';

/**
 * GET /addresses/:address
 * Get address details
 */
export async function getAddress(req, res) {
    try {
        const { address } = req.params;
        const { network } = req.query;

        if (!address) {
            return HttpErrors.badRequest(res, 'Address is required');
        }

        // Validate address format (basic validation)
        if (address.length < 26 || address.length > 66) {
            return HttpErrors.badRequest(res, 'Invalid address format');
        }

        const addresses = await addressService.getAddress(address, network);

        if (addresses.length === 0) {
            return HttpErrors.notFound(res, 'Address not found');
        }

        // If single network, return single object; else return array
        const data = network ? addresses[0] : addresses;
        return successResponse(res, data);
    } catch (error) {
        logger.error('Error fetching address', { error: error.message });
        return HttpErrors.serverError(res, 'Failed to fetch address');
    }
}

/**
 * GET /addresses/:address/transactions
 * Get address transactions with pagination
 */
export async function getAddressTransactions(req, res) {
    try {
        const { address } = req.params;
        const { network, page = 1, limit = 20 } = req.query;

        if (!address) {
            return HttpErrors.badRequest(res, 'Address is required');
        }

        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

        const { transactions, total } = await addressService.getAddressTransactions(
            address,
            { network, page: pageNum, limit: limitNum }
        );

        return paginatedResponse(res, transactions, {
            page: pageNum,
            limit: limitNum,
            total,
        });
    } catch (error) {
        logger.error('Error fetching address transactions', { error: error.message });
        return HttpErrors.serverError(res, 'Failed to fetch address transactions');
    }
}

/**
 * GET /addresses/:address/utxos
 * Get unspent outputs for a Bitcoin address
 */
export async function getAddressUtxos(req, res) {
    try {
        const { address } = req.params;
        const { page = 1, limit = 50 } = req.query;

        if (!address) {
            return HttpErrors.badRequest(res, 'Address is required');
        }

        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

        // Bitcoin network ID is 2
        const { utxos, total } = await addressService.getAddressUtxos(
            address,
            2, // BTC network ID
            pageNum,
            limitNum
        );

        return paginatedResponse(res, utxos, {
            page: pageNum,
            limit: limitNum,
            total,
        });
    } catch (error) {
        logger.error('Error fetching address UTXOs', { error: error.message });
        return HttpErrors.serverError(res, 'Failed to fetch address UTXOs');
    }
}

export default {
    getAddress,
    getAddressTransactions,
    getAddressUtxos,
};
