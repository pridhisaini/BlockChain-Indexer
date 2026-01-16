/**
 * ADDRESS ROUTES
 * ===============
 * WHY: Defines URL patterns for address endpoints.
 */

import { Router } from 'express';
import addressController from '../controllers/addressController.js';

const router = Router();

/**
 * @route   GET /api/addresses/:address
 * @desc    Get address details
 * @query   network
 */
router.get('/:address', addressController.getAddress);

/**
 * @route   GET /api/addresses/:address/transactions
 * @desc    Get address transaction history
 * @query   network, page, limit
 */
router.get('/:address/transactions', addressController.getAddressTransactions);

/**
 * @route   GET /api/addresses/:address/utxos
 * @desc    Get unspent outputs (Bitcoin only)
 * @query   page, limit
 */
router.get('/:address/utxos', addressController.getAddressUtxos);

export default router;
