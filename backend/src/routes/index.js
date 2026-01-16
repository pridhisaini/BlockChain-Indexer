/**
 * ROUTES INDEX
 * =============
 * WHY: Central place to mount all route modules.
 * Makes it easy to add versioning (v1, v2) or new resource routes.
 */

import { Router } from 'express';
import blockRoutes from './blockRoutes.js';
import transactionRoutes from './transactionRoutes.js';
import addressRoutes from './addressRoutes.js';


import statsController from '../controllers/statsController.js';

const router = Router();

// Health check (no prefix)
router.get('/health', statsController.healthCheck);

// Stats and networks
router.get('/stats', statsController.getStats);
router.get('/networks', statsController.getNetworks);
router.get('/networks/:network', statsController.getNetworkStats);

// Search


// Resource routes
router.use('/blocks', blockRoutes);
router.use('/transactions', transactionRoutes);
router.use('/addresses', addressRoutes);

export default router;
