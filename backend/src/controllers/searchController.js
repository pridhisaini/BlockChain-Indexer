import db from '../database/connection.js';
import logger from '../utils/logger.js';

class SearchController {
    /**
     * Search for blocks, transactions, or addresses
     * GET /api/search?q=<query>
     */
    async search(req, res) {
        try {
            const { q } = req.query;

            if (!q) {
                return res.status(400).json({
                    success: false,
                    error: 'Search query is required'
                });
            }

            const query = q.trim();

            // 1. Check if it's a Block Height (number)
            if (/^\d+$/.test(query)) {
                const height = parseInt(query, 10);
                const block = await db.query(
                    'SELECT hash, network_id FROM blocks WHERE height = $1 LIMIT 1',
                    [height]
                );

                if (block.rows.length > 0) {
                    return res.json({
                        success: true,
                        data: {
                            type: 'block',
                            id: block.rows[0].hash,
                            network_id: block.rows[0].network_id
                        }
                    });
                }
            }

            // 2. Check if it's a Hash (Block or Transaction)
            // Common lengths: 66 chars (0x + 64 hex) for ETH, 64 chars for BTC
            if (/^(0x)?[0-9a-fA-F]{64}$/.test(query)) {
                // Check Block Hash
                const block = await db.query(
                    'SELECT hash, network_id FROM blocks WHERE hash = $1 LIMIT 1',
                    [query]
                );

                if (block.rows.length > 0) {
                    return res.json({
                        success: true,
                        data: {
                            type: 'block',
                            id: block.rows[0].hash,
                            network_id: block.rows[0].network_id
                        }
                    });
                }

                // Check Transaction Hash
                const tx = await db.query(
                    'SELECT tx_hash, network_id FROM transactions WHERE tx_hash = $1 LIMIT 1',
                    [query]
                );

                if (tx.rows.length > 0) {
                    return res.json({
                        success: true,
                        data: {
                            type: 'transaction',
                            id: tx.rows[0].tx_hash,
                            network_id: tx.rows[0].network_id
                        }
                    });
                }
            }

            // 3. Check if it's an Address
            // ETH: 42 chars (0x + 40 hex)
            // BTC: 26-35 chars (alphanumeric)
            // We'll just check if it exists in the addresses table
            const address = await db.query(
                'SELECT address, network_id FROM addresses WHERE address = $1 LIMIT 1',
                [query]
            );

            if (address.rows.length > 0) {
                return res.json({
                    success: true,
                    data: {
                        type: 'address',
                        id: address.rows[0].address,
                        network_id: address.rows[0].network_id
                    }
                });
            }

            // Not found
            return res.status(404).json({
                success: false,
                error: 'No results found'
            });

        } catch (error) {
            logger.error('Search failed', { query: req.query.q, error: error.message });
            return res.status(500).json({
                success: false,
                error: 'Search failed'
            });
        }
    }
}

export default new SearchController();
