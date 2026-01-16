/**
 * FORMAT UTILITIES
 * =================
 * WHY: Centralizes formatting logic used across components.
 * Keeps components clean by abstracting formatting.
 */

import config from '../config';

/**
 * Truncate a hash for display
 */
export function truncateHash(hash) {
    if (!hash) return '-';
    const { hashTruncateStart, hashTruncateEnd } = config.display;
    return `${hash.slice(0, hashTruncateStart)}...${hash.slice(-hashTruncateEnd)}`;
}

/**
 * Truncate an address for display
 */
export function truncateAddress(address) {
    if (!address) return '-';
    const { addressTruncateStart, addressTruncateEnd } = config.display;
    return `${address.slice(0, addressTruncateStart)}...${address.slice(-addressTruncateEnd)}`;
}

/**
 * Format a value in native units (wei/satoshi) to display units (ETH/BTC)
 */
export function formatValue(value, symbol) {
    if (!value) return '0';
    const num = BigInt(value);

    if (symbol === 'ETH') {
        return `${(Number(num) / 1e18).toFixed(4)} ETH`;
    } else if (symbol === 'BTC') {
        return `${(Number(num) / 1e8).toFixed(8)} BTC`;
    }

    return value;
}

/**
 * Format a timestamp to locale string
 */
export function formatTime(timestamp) {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Format a timestamp to full date/time
 */
export function formatDateTime(timestamp) {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleString();
}

/**
 * Format a number with commas
 */
export function formatNumber(num) {
    if (num === null || num === undefined) return '0';
    return Number(num).toLocaleString();
}

/**
 * Format bytes to human readable size
 */
export function formatBytes(bytes) {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    let size = bytes;
    while (size >= 1024 && i < units.length - 1) {
        size /= 1024;
        i++;
    }
    return `${size.toFixed(2)} ${units[i]}`;
}

export default {
    truncateHash,
    truncateAddress,
    formatValue,
    formatTime,
    formatDateTime,
    formatNumber,
    formatBytes,
};
