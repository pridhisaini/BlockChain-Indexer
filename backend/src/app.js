/**
 * EXPRESS APP - MAIN ENTRY POINT
 * ================================
 * WHY: Central application setup and configuration.
 * Registers middleware, routes, and error handlers.
 * Starts the HTTP server.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import config, { validateConfig } from './config/index.js';
import routes from './routes/index.js';
import db from './database/connection.js';
import { startAllCrons } from './workers/cronJobs.js';
import logger from './utils/logger.js';

// Validate configuration
validateConfig();

// Create Express app
const app = express();

// ==========================================
// SECURITY & PERFORMANCE MIDDLEWARE
// ==========================================

// Security headers (helmet) - production only for stricter settings
if (config.nodeEnv === 'production') {
    app.use(helmet());
} else {
    // Relaxed helmet for development
    app.use(helmet({
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false,
    }));
}

// Rate limiting - protect against DoS attacks
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: config.nodeEnv === 'production' ? 100 : 1000, // Limit requests per window
    message: {
        success: false,
        error: {
            message: 'Too many requests, please try again later',
            code: 429,
        },
        timestamp: new Date().toISOString(),
    },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api', limiter);

// Compression for responses
app.use(compression());

// CORS - configure based on environment
const corsOptions = {
    origin: config.nodeEnv === 'production'
        ? process.env.FRONTEND_URL || 'https://your-production-domain.com'
        : process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
};
app.use(cors(corsOptions));

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));

// Request logging with IP tracking
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.debug(`${req.method} ${req.path}`, {
            status: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip,
        });
    });
    next();
});

// ==========================================
// ROUTES
// ==========================================

// API routes (all prefixed with /api)
app.use('/api', routes);

// Root redirect
app.get('/', (req, res) => {
    res.json({
        name: 'BTC & ETH Indexer API',
        version: '1.0.0',
        docs: '/api/health',
        endpoints: {
            health: 'GET /api/health',
            stats: 'GET /api/stats',
            networks: 'GET /api/networks',
            blocks: 'GET /api/blocks',
            transactions: 'GET /api/transactions',
            addresses: 'GET /api/addresses/:address',
        },
    });
});

// ==========================================
// ERROR HANDLING
// ==========================================

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: {
            message: 'Endpoint not found',
            code: 404,
        },
        timestamp: new Date().toISOString(),
    });
});

// Global error handler
app.use((err, req, res, next) => {
    logger.error('Unhandled error', {
        error: err.message,
        stack: err.stack,
        path: req.path,
    });

    res.status(500).json({
        success: false,
        error: {
            message: config.nodeEnv === 'production'
                ? 'Internal server error'
                : err.message,
            code: 500,
        },
        timestamp: new Date().toISOString(),
    });
});

// ==========================================
// SERVER STARTUP
// ==========================================

async function startServer() {
    // Test database connection
    const dbConnected = await db.testConnection();
    if (!dbConnected) {
        logger.error('Cannot start server without database connection');
        process.exit(1);
    }

    // Start HTTP server
    const server = app.listen(config.port, () => {
        logger.info(`🚀 Server running on http://localhost:${config.port}`);
        logger.info(`📡 Environment: ${config.nodeEnv}`);
    });

    // Start cron jobs if enabled
    const enableCrons = process.env.ENABLE_CRONS !== 'false';
    if (enableCrons) {
        startAllCrons();
    } else {
        logger.info('Cron jobs disabled (ENABLE_CRONS=false)');
    }

    // Graceful shutdown
    const shutdown = async () => {
        logger.info('Shutting down gracefully...');

        server.close(() => {
            logger.info('HTTP server closed');
        });

        await db.closePool();
        process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    return server;
}

// Start the server
startServer().catch(err => {
    logger.error('Failed to start server', { error: err.message });
    process.exit(1);
});

export { app };
export default app;
