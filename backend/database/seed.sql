-- Seed data for development
-- This file runs after schema.sql

-- Insert sample ETH blocks
INSERT INTO blocks (network_id, height, hash, parent_hash, block_timestamp, miner, tx_count, gas_used, gas_limit, status)
SELECT 
  1, -- ethereum
  21500000 - i,
  '0x' || md5(random()::text || i),
  '0x' || md5(random()::text || (i-1)),
  NOW() - (i || ' minutes')::interval,
  '0x' || substr(md5(random()::text), 1, 40),
  floor(random() * 200 + 50)::int,
  floor(random() * 15000000 + 10000000)::bigint,
  30000000,
  'CONFIRMED'
FROM generate_series(0, 49) AS i
ON CONFLICT DO NOTHING;

-- Insert sample BTC blocks
INSERT INTO blocks (network_id, height, hash, parent_hash, block_timestamp, miner, tx_count, size_bytes, status)
SELECT 
  2, -- bitcoin
  879000 - i,
  '0000000000000000000' || substr(md5(random()::text || i), 1, 45),
  '0000000000000000000' || substr(md5(random()::text || (i-1)), 1, 45),
  NOW() - (i * 10 || ' minutes')::interval,
  (ARRAY['F2Pool', 'AntPool', 'ViaBTC', 'Foundry USA', 'Binance Pool'])[floor(random() * 5 + 1)::int],
  floor(random() * 3000 + 1500)::int,
  floor(random() * 1500000 + 1000000)::bigint,
  'CONFIRMED'
FROM generate_series(0, 49) AS i
ON CONFLICT DO NOTHING;

-- Insert sample ETH transactions
INSERT INTO transactions (network_id, block_id, tx_hash, from_address, to_address, value, gas_price, gas_used, status)
SELECT 
  1,
  b.id,
  '0x' || md5(random()::text || b.id || t),
  '0x' || substr(md5(random()::text), 1, 40),
  '0x' || substr(md5(random()::text), 1, 40),
  (floor(random() * 100)::numeric * 10^18)::numeric,
  (floor(random() * 100 + 20)::numeric * 10^9)::numeric,
  floor(random() * 200000 + 21000)::bigint,
  'SUCCESS'
FROM blocks b
CROSS JOIN generate_series(1, 5) AS t
WHERE b.network_id = 1
LIMIT 200
ON CONFLICT DO NOTHING;

-- Insert sample BTC transactions
INSERT INTO transactions (network_id, block_id, tx_hash, value, fee, status)
SELECT 
  2,
  b.id,
  substr(md5(random()::text || b.id || t), 1, 64),
  floor(random() * 100000000)::numeric, -- satoshis
  floor(random() * 50000 + 1000)::numeric,
  'CONFIRMED'
FROM blocks b
CROSS JOIN generate_series(1, 5) AS t
WHERE b.network_id = 2
LIMIT 200
ON CONFLICT DO NOTHING;

-- Insert sample addresses
INSERT INTO addresses (network_id, address, tx_count, first_seen_at, last_seen_at)
SELECT DISTINCT
  1,
  from_address,
  floor(random() * 100 + 1)::int,
  NOW() - '30 days'::interval,
  NOW()
FROM transactions
WHERE network_id = 1 AND from_address IS NOT NULL
ON CONFLICT DO NOTHING;

-- Update stats
UPDATE networks SET 
  current_height = (SELECT MAX(height) FROM blocks WHERE network_id = 1),
  last_indexed_at = NOW()
WHERE id = 1;

UPDATE networks SET 
  current_height = (SELECT MAX(height) FROM blocks WHERE network_id = 2),
  last_indexed_at = NOW()
WHERE id = 2;
