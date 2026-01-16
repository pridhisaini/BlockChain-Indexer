/**
 * LOGGER UTILITY
 * ===============
 * WHY: Provides consistent, structured logging across the application.
 * Supports different log levels and outputs (console, file).
 * Makes debugging and monitoring easier in production.
 */

import winston from 'winston';
import config from '../config/index.js';

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Custom log format
const logFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    if (Object.keys(meta).length > 0) {
        log += ` ${JSON.stringify(meta)}`;
    }
    if (stack) {
        log += `\n${stack}`;
    }
    return log;
});

// Create logger instance
const logger = winston.createLogger({
    level: config.logLevel,
    format: combine(
        errors({ stack: true }),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        logFormat
    ),
    transports: [
        // Console output with colors
        new winston.transports.Console({
            format: combine(colorize(), logFormat),
        }),
    ],
});

// Add file transports in production
if (config.nodeEnv === 'production') {
    logger.add(new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error'
    }));
    logger.add(new winston.transports.File({
        filename: 'logs/combined.log'
    }));
}

export default logger;
