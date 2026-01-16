/**
 * TRANSACTION ROUTES
 * ===================
 * WHY: Defines URL patterns for transaction endpoints.
 */

import { Router } from 'express';
import transactionController from '../controllers/transactionController.js';

const router = Router();

/**
 * @route   GET /api/transactions
 * @desc    Get paginated list of transactions
 * @query   network, address, page, limit
 */
router.get('/', transactionController.getTransactions);

/**
 * @route   GET /api/transactions/:hash
 * @desc    Get single transaction by hash
 */
router.get('/:hash', transactionController.getTransaction);

export default router;
