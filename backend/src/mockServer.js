/**
 * DYNAMIC MOCK API SERVER
 * =========================
 * Generates realistic, dynamic blockchain data that updates in real-time.
 * ETH and BTC have completely different data patterns.
 */

import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// ============================================
// DYNAMIC DATA GENERATORS
// ============================================

// ETH configuration (faster blocks, smaller values)
const ETH_CONFIG = {
    startHeight: 21500000,
    blockTime: 12000,       // 12 seconds
    txPerBlock: [80, 250],  // 80-250 txs
    gasLimit: 30000000,
    avgGasUsed: 15000000,
};

// BTC configuration (slower blocks, different format)
const BTC_CONFIG = {
    startHeight: 879000,
    blockTime: 600000,      // 10 minutes
    txPerBlock: [1500, 4000], // 1500-4000 txs
    avgSize: 1500000,
};

// Track state for dynamic updates
let ethState = {
    currentHeight: ETH_CONFIG.startHeight,
    lastUpdate: Date.now(),
    blocks: [],
    txs: []
};

let btcState = {
    currentHeight: BTC_CONFIG.startHeight,
    lastUpdate: Date.now(),
    blocks: [],
    txs: []
};

// Generate random ETH address
function randomEthAddress() {
    return '0x' + Array.from({ length: 40 }, () =>
        Math.floor(Math.random() * 16).toString(16)
    ).join('');
}

// Generate random ETH hash
function randomEthHash() {
    return '0x' + Array.from({ length: 64 }, () =>
        Math.floor(Math.random() * 16).toString(16)
    ).join('');
}

// Generate random BTC address (starts with 1, 3, or bc1)
function randomBtcAddress() {
    const prefixes = ['1', '3', 'bc1q'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    const length = prefix === 'bc1q' ? 39 : 33;
    return prefix + Array.from({ length: length - prefix.length }, () =>
        chars[Math.floor(Math.random() * chars.length)]
    ).join('');
}

// Generate random BTC hash
function randomBtcHash() {
    return Array.from({ length: 64 }, () =>
        Math.floor(Math.random() * 16).toString(16)
    ).join('');
}

// Generate ETH block
function generateEthBlock(height, timestamp) {
    const txCount = ETH_CONFIG.txPerBlock[0] +
        Math.floor(Math.random() * (ETH_CONFIG.txPerBlock[1] - ETH_CONFIG.txPerBlock[0]));

    return {
        id: height,
        height,
        hash: randomEthHash(),
        parent_hash: randomEthHash(),
        block_timestamp: new Date(timestamp).toISOString(),
        miner: randomEthAddress(),
        tx_count: txCount,
        gas_used: (ETH_CONFIG.avgGasUsed + Math.floor(Math.random() * 5000000)).toString(),
        gas_limit: ETH_CONFIG.gasLimit.toString(),
        status: 'CONFIRMED',
        network: 'ethereum',
        symbol: 'ETH'
    };
}

// Generate BTC block
function generateBtcBlock(height, timestamp) {
    const txCount = BTC_CONFIG.txPerBlock[0] +
        Math.floor(Math.random() * (BTC_CONFIG.txPerBlock[1] - BTC_CONFIG.txPerBlock[0]));

    return {
        id: height,
        height,
        hash: '0000000000000000000' + randomBtcHash().slice(0, 45),
        parent_hash: '0000000000000000000' + randomBtcHash().slice(0, 45),
        block_timestamp: new Date(timestamp).toISOString(),
        miner: ['F2Pool', 'AntPool', 'ViaBTC', 'Foundry USA', 'Binance Pool'][Math.floor(Math.random() * 5)],
        tx_count: txCount,
        size_bytes: BTC_CONFIG.avgSize + Math.floor(Math.random() * 500000),
        status: 'CONFIRMED',
        network: 'bitcoin',
        symbol: 'BTC'
    };
}

// Generate ETH transaction
function generateEthTx(blockHeight, timestamp) {
    const value = BigInt(Math.floor(Math.random() * 100)) * BigInt('10000000000000000'); // 0-100 ETH
    const gasPrice = BigInt(20 + Math.floor(Math.random() * 80)) * BigInt('1000000000'); // 20-100 gwei

    return {
        id: Math.floor(Math.random() * 1000000),
        tx_hash: randomEthHash(),
        from_address: randomEthAddress(),
        to_address: randomEthAddress(),
        value: value.toString(),
        gas_price: gasPrice.toString(),
        gas_used: (21000 + Math.floor(Math.random() * 200000)).toString(),
        block_height: blockHeight,
        status: 'SUCCESS',
        network: 'ethereum',
        symbol: 'ETH',
        created_at: new Date(timestamp).toISOString()
    };
}

// Generate BTC transaction
function generateBtcTx(blockHeight, timestamp) {
    const value = Math.floor(Math.random() * 100000000); // 0-1 BTC in satoshis
    const fee = Math.floor(Math.random() * 50000) + 1000; // 1000-51000 satoshis

    return {
        id: Math.floor(Math.random() * 1000000),
        tx_hash: randomBtcHash(),
        from_address: randomBtcAddress(),
        to_address: randomBtcAddress(),
        value: value.toString(),
        fee: fee.toString(),
        block_height: blockHeight,
        status: 'CONFIRMED',
        network: 'bitcoin',
        symbol: 'BTC',
        created_at: new Date(timestamp).toISOString()
    };
}

// Update ETH state (simulates new blocks)
function updateEthState() {
    const now = Date.now();
    const elapsed = now - ethState.lastUpdate;
    const newBlocks = Math.floor(elapsed / ETH_CONFIG.blockTime);

    if (newBlocks > 0) {
        for (let i = 0; i < Math.min(newBlocks, 5); i++) {
            ethState.currentHeight++;
            const blockTime = now - (newBlocks - i - 1) * ETH_CONFIG.blockTime;
            const block = generateEthBlock(ethState.currentHeight, blockTime);
            ethState.blocks.unshift(block);

            // Generate 3-5 txs per block for display
            for (let t = 0; t < 3 + Math.floor(Math.random() * 3); t++) {
                ethState.txs.unshift(generateEthTx(ethState.currentHeight, blockTime - t * 1000));
            }
        }

        // Keep only last 50 items
        ethState.blocks = ethState.blocks.slice(0, 50);
        ethState.txs = ethState.txs.slice(0, 100);
        ethState.lastUpdate = now;

        console.log(`⛓️ ETH: New block ${ethState.currentHeight}`);
    }

    return ethState;
}

// Update BTC state (simulates new blocks - less frequent)
function updateBtcState() {
    const now = Date.now();
    const elapsed = now - btcState.lastUpdate;

    // BTC blocks every ~10 minutes, but for demo we use 30 seconds
    const newBlocks = Math.floor(elapsed / 30000); // 30 second demo interval

    if (newBlocks > 0) {
        for (let i = 0; i < Math.min(newBlocks, 2); i++) {
            btcState.currentHeight++;
            const blockTime = now - (newBlocks - i - 1) * 30000;
            const block = generateBtcBlock(btcState.currentHeight, blockTime);
            btcState.blocks.unshift(block);

            // Generate 3-5 txs per block for display
            for (let t = 0; t < 3 + Math.floor(Math.random() * 3); t++) {
                btcState.txs.unshift(generateBtcTx(btcState.currentHeight, blockTime - t * 1000));
            }
        }

        // Keep only last 50 items
        btcState.blocks = btcState.blocks.slice(0, 50);
        btcState.txs = btcState.txs.slice(0, 100);
        btcState.lastUpdate = now;

        console.log(`₿ BTC: New block ${btcState.currentHeight}`);
    }

    return btcState;
}

// Initialize with some data
function initializeData() {
    const now = Date.now();

    // Generate initial ETH blocks
    for (let i = 0; i < 20; i++) {
        const height = ETH_CONFIG.startHeight - i;
        const blockTime = now - i * ETH_CONFIG.blockTime;
        ethState.blocks.push(generateEthBlock(height, blockTime));

        for (let t = 0; t < 3; t++) {
            ethState.txs.push(generateEthTx(height, blockTime - t * 1000));
        }
    }

    // Generate initial BTC blocks
    for (let i = 0; i < 20; i++) {
        const height = BTC_CONFIG.startHeight - i;
        const blockTime = now - i * 30000; // 30 sec demo interval
        btcState.blocks.push(generateBtcBlock(height, blockTime));

        for (let t = 0; t < 3; t++) {
            btcState.txs.push(generateBtcTx(height, blockTime - t * 1000));
        }
    }

    console.log('📦 Initialized ETH with', ethState.blocks.length, 'blocks');
    console.log('📦 Initialized BTC with', btcState.blocks.length, 'blocks');
}

// ============================================
// UTILITY
// ============================================
const paginate = (data, page, limit) => {
    const start = (page - 1) * limit;
    const end = start + limit;
    return {
        data: data.slice(start, end),
        pagination: {
            page, limit, total: data.length,
            totalPages: Math.ceil(data.length / limit),
            hasNext: end < data.length,
            hasPrev: page > 1
        }
    };
};

// ============================================
// ROUTES
// ============================================
app.get('/api/health', (req, res) => {
    res.json({ success: true, data: { status: 'healthy', mode: 'DYNAMIC_SIMULATION' } });
});

app.get('/api/stats', (req, res) => {
    const eth = updateEthState();
    const btc = updateBtcState();

    res.json({
        success: true,
        data: [
            {
                id: 1, network: 'ethereum', symbol: 'ETH', chain_type: 'account',
                current_height: eth.currentHeight,
                total_blocks: eth.blocks.length,
                total_transactions: eth.txs.length,
                total_addresses: eth.txs.length * 2,
                is_syncing: false
            },
            {
                id: 2, network: 'bitcoin', symbol: 'BTC', chain_type: 'utxo',
                current_height: btc.currentHeight,
                total_blocks: btc.blocks.length,
                total_transactions: btc.txs.length,
                total_addresses: btc.txs.length * 2,
                is_syncing: false
            }
        ],
        timestamp: new Date().toISOString()
    });
});

app.get('/api/networks', (req, res) => {
    updateEthState();
    updateBtcState();

    res.json({
        success: true,
        data: [
            { id: 1, name: 'ethereum', symbol: 'ETH', is_active: true, last_indexed_height: ethState.currentHeight },
            { id: 2, name: 'bitcoin', symbol: 'BTC', is_active: true, last_indexed_height: btcState.currentHeight }
        ],
        timestamp: new Date().toISOString()
    });
});

app.get('/api/networks/:network', (req, res) => {
    const { network } = req.params;
    const data = network === 'ethereum' ? updateEthState() : updateBtcState();

    res.json({
        success: true,
        data: {
            network,
            symbol: network === 'ethereum' ? 'ETH' : 'BTC',
            current_height: data.currentHeight,
            total_blocks: data.blocks.length,
            total_transactions: data.txs.length,
            total_addresses: data.txs.length * 2,
            is_syncing: false
        },
        timestamp: new Date().toISOString()
    });
});

app.get('/api/blocks', (req, res) => {
    const { network, page = 1, limit = 20 } = req.query;
    const eth = updateEthState();
    const btc = updateBtcState();

    let allBlocks = [];
    if (!network || network === 'all') {
        allBlocks = [...eth.blocks, ...btc.blocks].sort((a, b) =>
            new Date(b.block_timestamp) - new Date(a.block_timestamp)
        );
    } else if (network === 'ethereum') {
        allBlocks = eth.blocks;
    } else {
        allBlocks = btc.blocks;
    }

    const result = paginate(allBlocks, parseInt(page), parseInt(limit));
    res.json({ success: true, ...result, timestamp: new Date().toISOString() });
});

app.get('/api/blocks/:identifier', (req, res) => {
    const eth = updateEthState();
    const btc = updateBtcState();
    const allBlocks = [...eth.blocks, ...btc.blocks];
    const block = allBlocks.find(b =>
        b.hash === req.params.identifier || b.height.toString() === req.params.identifier
    ) || allBlocks[0];

    res.json({ success: true, data: block, timestamp: new Date().toISOString() });
});

app.get('/api/transactions', (req, res) => {
    const { network, page = 1, limit = 20 } = req.query;
    const eth = updateEthState();
    const btc = updateBtcState();

    let allTxs = [];
    if (!network || network === 'all') {
        allTxs = [...eth.txs, ...btc.txs].sort((a, b) =>
            new Date(b.created_at) - new Date(a.created_at)
        );
    } else if (network === 'ethereum') {
        allTxs = eth.txs;
    } else {
        allTxs = btc.txs;
    }

    const result = paginate(allTxs, parseInt(page), parseInt(limit));
    res.json({ success: true, ...result, timestamp: new Date().toISOString() });
});

app.get('/api/transactions/:hash', (req, res) => {
    const eth = updateEthState();
    const btc = updateBtcState();
    const allTxs = [...eth.txs, ...btc.txs];
    const tx = allTxs.find(t => t.tx_hash === req.params.hash) || allTxs[0];

    res.json({ success: true, data: tx, timestamp: new Date().toISOString() });
});

app.get('/api/addresses/:address', (req, res) => {
    const isEth = req.params.address.startsWith('0x');

    res.json({
        success: true,
        data: [{
            address: req.params.address,
            network: isEth ? 'ethereum' : 'bitcoin',
            symbol: isEth ? 'ETH' : 'BTC',
            tx_count: Math.floor(Math.random() * 100) + 1,
            balance: isEth ? String(BigInt(Math.floor(Math.random() * 100)) * BigInt('1000000000000000000')) : String(Math.floor(Math.random() * 100000000)),
            first_seen_at: new Date(Date.now() - 86400000 * 30).toISOString(),
            last_seen_at: new Date().toISOString()
        }],
        timestamp: new Date().toISOString()
    });
});

app.get('/api/addresses/:address/transactions', (req, res) => {
    const isEth = req.params.address.startsWith('0x');
    const data = isEth ? updateEthState() : updateBtcState();
    const result = paginate(data.txs.slice(0, 10), 1, 10);
    res.json({ success: true, ...result, timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
    console.log('');
    console.log('🚀 DYNAMIC SIMULATION API running at http://localhost:' + PORT);
    console.log('');
    console.log('📊 Features:');
    console.log('   • ETH blocks: Every ~12 seconds (real timing)');
    console.log('   • BTC blocks: Every ~30 seconds (accelerated for demo)');
    console.log('   • Unique addresses/hashes for each chain');
    console.log('   • Data updates on every request');
    console.log('');

    initializeData();
});
