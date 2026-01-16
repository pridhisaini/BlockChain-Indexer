-- ============================================
-- BTC & ETH INDEXER DATABASE SCHEMA
-- Run this script to initialize the database
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- NETWORKS TABLE (Chain-agnostic registry)
-- ============================================
CREATE TABLE IF NOT EXISTS networks (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(50) NOT NULL UNIQUE,
    symbol          VARCHAR(10) NOT NULL,
    chain_type      VARCHAR(20) NOT NULL,
    rpc_url         TEXT NOT NULL,
    ws_url          TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

-- Seed data
INSERT INTO networks (name, symbol, chain_type, rpc_url, ws_url) VALUES
('ethereum', 'ETH', 'account', 'https://eth-mainnet.g.alchemy.com/v2/demo', 'wss://eth-mainnet.g.alchemy.com/v2/demo'),
('bitcoin', 'BTC', 'utxo', 'http://localhost:8332', NULL)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- BLOCKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS blocks (
    id              BIGSERIAL PRIMARY KEY,
    network_id      INTEGER NOT NULL REFERENCES networks(id),
    height          BIGINT NOT NULL,
    hash            VARCHAR(66) NOT NULL,
    parent_hash     VARCHAR(66) NOT NULL,
    block_timestamp TIMESTAMP NOT NULL,
    miner           VARCHAR(66),
    difficulty      NUMERIC(78),
    gas_used        BIGINT,
    gas_limit       BIGINT,
    size_bytes      INTEGER,
    tx_count        INTEGER NOT NULL DEFAULT 0,
    status          VARCHAR(20) DEFAULT 'PENDING',
    data            JSONB,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT blocks_network_hash_unique UNIQUE (network_id, hash)
);

-- Indexes for blocks
CREATE INDEX IF NOT EXISTS idx_blocks_network_height ON blocks(network_id, height DESC);
CREATE INDEX IF NOT EXISTS idx_blocks_network_status ON blocks(network_id, status);
CREATE INDEX IF NOT EXISTS idx_blocks_timestamp ON blocks(block_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_blocks_hash ON blocks(hash);

-- ============================================
-- TRANSACTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS transactions (
    id              BIGSERIAL PRIMARY KEY,
    network_id      INTEGER NOT NULL REFERENCES networks(id),
    block_id        BIGINT REFERENCES blocks(id) ON DELETE CASCADE,
    tx_hash         VARCHAR(66) NOT NULL,
    tx_index        INTEGER,
    from_address    VARCHAR(66),
    to_address      VARCHAR(66),
    value           NUMERIC(78) NOT NULL DEFAULT 0,
    gas_price       NUMERIC(78),
    gas_used        BIGINT,
    gas_limit       BIGINT,
    nonce           BIGINT,
    input_data      TEXT,
    fee             NUMERIC(78),
    status          VARCHAR(20) DEFAULT 'PENDING',
    is_coinbase     BOOLEAN DEFAULT FALSE,
    data            JSONB,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT transactions_network_hash_unique UNIQUE (network_id, tx_hash)
);

-- Indexes for transactions
CREATE INDEX IF NOT EXISTS idx_transactions_block ON transactions(block_id);
CREATE INDEX IF NOT EXISTS idx_transactions_network_hash ON transactions(network_id, tx_hash);
CREATE INDEX IF NOT EXISTS idx_transactions_from ON transactions(from_address) WHERE from_address IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_to ON transactions(to_address) WHERE to_address IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at DESC);

-- ============================================
-- ADDRESSES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS addresses (
    id              BIGSERIAL PRIMARY KEY,
    network_id      INTEGER NOT NULL REFERENCES networks(id),
    address         VARCHAR(66) NOT NULL,
    balance         NUMERIC(78) DEFAULT 0,
    tx_count        BIGINT DEFAULT 0,
    first_seen_at   TIMESTAMP,
    last_seen_at    TIMESTAMP,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT addresses_network_address_unique UNIQUE (network_id, address)
);

-- Indexes for addresses
CREATE INDEX IF NOT EXISTS idx_addresses_network_address ON addresses(network_id, address);
CREATE INDEX IF NOT EXISTS idx_addresses_balance ON addresses(network_id, balance DESC);

-- ============================================
-- TRANSACTION_INPUTS TABLE (BTC UTXO)
-- ============================================
CREATE TABLE IF NOT EXISTS transaction_inputs (
    id              BIGSERIAL PRIMARY KEY,
    transaction_id  BIGINT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    vin_index       INTEGER NOT NULL,
    prev_tx_hash    VARCHAR(64),
    prev_vout_index BIGINT,
    address_id      BIGINT REFERENCES addresses(id),
    address         VARCHAR(66),
    value           NUMERIC(78),
    script_sig      JSONB,
    sequence        BIGINT,
    witness         JSONB,
    is_coinbase     BOOLEAN DEFAULT FALSE,
    coinbase_data   TEXT,
    created_at      TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT tx_inputs_tx_index_unique UNIQUE (transaction_id, vin_index)
);

-- Indexes for transaction_inputs
CREATE INDEX IF NOT EXISTS idx_tx_inputs_transaction ON transaction_inputs(transaction_id);
CREATE INDEX IF NOT EXISTS idx_tx_inputs_prev_tx ON transaction_inputs(prev_tx_hash, prev_vout_index);
CREATE INDEX IF NOT EXISTS idx_tx_inputs_address ON transaction_inputs(address) WHERE address IS NOT NULL;

-- ============================================
-- TRANSACTION_OUTPUTS TABLE (BTC UTXO)
-- ============================================
CREATE TABLE IF NOT EXISTS transaction_outputs (
    id              BIGSERIAL PRIMARY KEY,
    transaction_id  BIGINT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    vout_index      INTEGER NOT NULL,
    address_id      BIGINT REFERENCES addresses(id),
    address         VARCHAR(66),
    value           NUMERIC(78) NOT NULL,
    script_pubkey   JSONB,
    script_type     VARCHAR(20),
    is_spent        BOOLEAN DEFAULT FALSE,
    spent_by_tx     VARCHAR(64),
    spent_at        TIMESTAMP,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT tx_outputs_tx_index_unique UNIQUE (transaction_id, vout_index)
);

-- Indexes for transaction_outputs
CREATE INDEX IF NOT EXISTS idx_tx_outputs_transaction ON transaction_outputs(transaction_id);
CREATE INDEX IF NOT EXISTS idx_tx_outputs_address ON transaction_outputs(address) WHERE address IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tx_outputs_unspent ON transaction_outputs(address, is_spent) WHERE is_spent = FALSE;
CREATE INDEX IF NOT EXISTS idx_tx_outputs_spent_by ON transaction_outputs(spent_by_tx) WHERE spent_by_tx IS NOT NULL;

-- ============================================
-- INDEXER_STATE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS indexer_state (
    id                  SERIAL PRIMARY KEY,
    network_id          INTEGER NOT NULL REFERENCES networks(id) UNIQUE,
    last_indexed_height BIGINT NOT NULL DEFAULT 0,
    last_indexed_hash   VARCHAR(66),
    last_indexed_at     TIMESTAMP,
    is_syncing          BOOLEAN DEFAULT FALSE,
    sync_started_at     TIMESTAMP,
    error_message       TEXT,
    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW()
);

-- Initialize state for each network
INSERT INTO indexer_state (network_id, last_indexed_height)
SELECT id, 0 FROM networks
ON CONFLICT (network_id) DO NOTHING;

-- ============================================
-- HELPER FUNCTION: Update address stats
-- ============================================
CREATE OR REPLACE FUNCTION update_address_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.from_address IS NOT NULL THEN
        INSERT INTO addresses (network_id, address, tx_count, first_seen_at, last_seen_at)
        VALUES (NEW.network_id, NEW.from_address, 1, NOW(), NOW())
        ON CONFLICT (network_id, address) 
        DO UPDATE SET 
            tx_count = addresses.tx_count + 1,
            last_seen_at = NOW(),
            updated_at = NOW();
    END IF;
    
    IF NEW.to_address IS NOT NULL THEN
        INSERT INTO addresses (network_id, address, tx_count, first_seen_at, last_seen_at)
        VALUES (NEW.network_id, NEW.to_address, 1, NOW(), NOW())
        ON CONFLICT (network_id, address) 
        DO UPDATE SET 
            tx_count = addresses.tx_count + 1,
            last_seen_at = NOW(),
            updated_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_address_stats ON transactions;
CREATE TRIGGER trigger_update_address_stats
AFTER INSERT ON transactions
FOR EACH ROW
EXECUTE FUNCTION update_address_stats();

-- ============================================
-- HELPFUL VIEWS
-- ============================================
CREATE OR REPLACE VIEW v_recent_blocks AS
SELECT 
    b.id,
    n.name AS network,
    n.symbol,
    b.height,
    b.hash,
    b.block_timestamp,
    b.tx_count,
    b.status
FROM blocks b
JOIN networks n ON n.id = b.network_id
ORDER BY b.block_timestamp DESC
LIMIT 100;

CREATE OR REPLACE VIEW v_recent_transactions AS
SELECT 
    t.id,
    n.name AS network,
    n.symbol,
    t.tx_hash,
    t.from_address,
    t.to_address,
    t.value,
    t.fee,
    t.status,
    t.created_at
FROM transactions t
JOIN networks n ON n.id = t.network_id
ORDER BY t.created_at DESC
LIMIT 100;

-- Grant message
DO $$
BEGIN
    RAISE NOTICE 'Database schema created successfully!';
END $$;
