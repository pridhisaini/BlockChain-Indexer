/**
 * BLOCK ROUTES
 * ==============
 * WHY: Defines URL patterns for block-related endpoints.
 * Separates routing from controller logic.
 * Makes it easy to version APIs or add middleware.
 */

import { Router } from 'express';
import blockController from '../controllers/blockController.js';

const router = Router();

/**
 * @route   GET /api/blocks
 * @desc    Get paginated list of blocks
 * @query   network, page, limit
 */
router.get('/', blockController.getBlocks);

/**
 * @route   GET /api/blocks/:identifier
 * @desc    Get single block by hash or height
 * @query   network
 */
router.get('/:identifier', blockController.getBlock);

/**
 * @route   GET /api/blocks/:identifier/transactions
 * @desc    Get transactions for a block
 * @query   network, page, limit
 */
router.get('/:identifier/transactions', blockController.getBlockTransactions);

export default router;
