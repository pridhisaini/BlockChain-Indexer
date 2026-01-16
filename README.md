# BTC & ETH Indexer System

A **production-grade blockchain indexer** for Bitcoin and Ethereum with a modern React dashboard.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (React)                                │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │  Dashboard  │ │ ETH/BTC     │ │   Blocks    │ │Transactions │           │
│  │   + Charts  │ │  Overview   │ │    List     │ │    List     │           │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘           │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │ HTTP/REST API
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            BACKEND (Express.js)                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Routes: /blocks, /transactions, /addresses, /stats, /networks      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐                  │
│  │  Controllers   │ │    Services    │ │   Indexers     │                  │
│  │ (HTTP logic)   │ │ (Business)     │ │ (ETH/BTC)      │                  │
│  └────────────────┘ └────────────────┘ └────────────────┘                  │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DATABASE (PostgreSQL)                               │
│  ┌─────────┐ ┌─────────┐ ┌──────────────┐ ┌───────────┐ ┌───────────────┐  │
│  │networks │ │ blocks  │ │ transactions │ │ addresses │ │ UTXO tables   │  │
│  └─────────┘ └─────────┘ └──────────────┘ └───────────┘ └───────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                ▲
                                │ RPC Calls
┌───────────────────────────────┴─────────────────────────────────────────────┐
│                         BLOCKCHAIN NODES                                     │
│      ┌─────────────────────┐           ┌─────────────────────┐              │
│      │   Ethereum RPC      │           │    Bitcoin Core     │              │
│      │   (ethers.js)       │           │    (JSON-RPC)       │              │
│      └─────────────────────┘           └─────────────────────┘              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### Complete Flow: Indexer → DB → API → UI

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ 1. INDEXING PHASE                                                            │
│                                                                              │
│    RPC Node ──[getBlock]──► Indexer ──[parse]──► DB Transaction             │
│                                │                      │                      │
│                                │                      ├─► blocks table       │
│                                │                      ├─► transactions       │
│                                │                      └─► addresses          │
│                                │                                             │
│                                └──► Update indexer_state                     │
└──────────────────────────────────────────────────────────────────────────────┘
                                          │
                                          ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ 2. API PHASE                                                                 │
│                                                                              │
│    Client ──[GET /blocks]──► Controller ──► Service ──► PostgreSQL          │
│       ▲                                                      │               │
│       └──────────────[JSON Response]─────────────────────────┘               │
└──────────────────────────────────────────────────────────────────────────────┘
                                          │
                                          ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ 3. UI PHASE                                                                  │
│                                                                              │
│    React App ──[useApi hook]──► fetch() ──► API                             │
│        │                                      │                              │
│        └───────[setState]◄────[response]──────┘                              │
│        │                                                                     │
│        └───► Render Charts, Tables, Cards                                    │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## ETH Indexing Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ETHEREUM INDEXING FLOW                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐                                                            │
│  │  CRON JOB    │  Runs every 15 seconds                                    │
│  │ (node-cron)  │                                                            │
│  └──────┬───────┘                                                            │
│         │                                                                    │
│         ▼                                                                    │
│  ┌──────────────┐     ┌──────────────┐                                      │
│  │ ETH INDEXER  │────►│ eth_blockNum │ Get current chain height             │
│  │              │     └──────────────┘                                      │
│  │              │                                                            │
│  │              │  ┌────────────────────────────────────────┐               │
│  │              │  │ Compare:                               │               │
│  │              │  │   current_height - 12 confirmations   │               │
│  │              │  │   vs. last_indexed_height             │               │
│  │              │  └────────────────────────────────────────┘               │
│  │              │                                                            │
│  │              │         If new blocks exist                               │
│  │              │                │                                          │
│  └──────┬───────┘                ▼                                          │
│         │             ┌──────────────────────┐                              │
│         │             │ FOR each block:      │                              │
│         │             │                      │                              │
│         │             │  1. eth_getBlock     │◄── ethers.js                 │
│         │             │  2. Parse block      │                              │
│         │             │  3. FOR each tx:     │                              │
│         │             │     - Get receipt    │                              │
│         │             │     - Parse fields   │                              │
│         │             │  4. DB TRANSACTION:  │                              │
│         │             │     - Upsert block   │                              │
│         │             │     - Upsert txs     │                              │
│         │             │     - Update state   │                              │
│         │             └──────────────────────┘                              │
│         │                        │                                          │
│         ▼                        ▼                                          │
│  ┌──────────────┐     ┌──────────────────────┐                              │
│  │ indexer_     │◄────│ UPDATE last_indexed  │                              │
│  │ state table  │     │ _height = N          │                              │
│  └──────────────┘     └──────────────────────┘                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

Key Features:
• 12-block confirmation delay (prevents re-org issues)
• Batch processing (up to 10 blocks per cycle)
• Atomic DB transactions (rollback on failure)
• Idempotent upserts (ON CONFLICT DO UPDATE)
```

---

## BTC Indexing Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         BITCOIN INDEXING FLOW                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐                                                            │
│  │  CRON JOB    │  Runs every 60 seconds                                    │
│  │ (node-cron)  │                                                            │
│  └──────┬───────┘                                                            │
│         │                                                                    │
│         ▼                                                                    │
│  ┌──────────────┐     ┌──────────────┐                                      │
│  │ BTC INDEXER  │────►│getblockcount │ Get current chain height             │
│  │              │     └──────────────┘                                      │
│  │              │                                                            │
│  │              │  ┌────────────────────────────────────────┐               │
│  │              │  │ Compare:                               │               │
│  │              │  │   current_height - 6 confirmations    │               │
│  │              │  │   vs. last_indexed_height             │               │
│  │              │  └────────────────────────────────────────┘               │
│  │              │                                                            │
│  │              │         If new blocks exist                               │
│  └──────┬───────┘                │                                          │
│         │                        ▼                                          │
│         │             ┌──────────────────────┐                              │
│         │             │ FOR each block:      │                              │
│         │             │                      │                              │
│         │             │  1. getblockhash(h)  │◄── Bitcoin RPC              │
│         │             │  2. getblock(hash,2) │    (verbosity=2)            │
│         │             │  3. Parse block      │                              │
│         │             │  4. FOR each tx:     │                              │
│         │             │     ┌────────────────┴──────────────┐              │
│         │             │     │ UTXO Processing:              │              │
│         │             │     │                               │              │
│         │             │     │ INPUTS (vin[]):               │              │
│         │             │     │  - prev_tx_hash, vout_index   │              │
│         │             │     │  - Mark prev output as SPENT  │              │
│         │             │     │                               │              │
│         │             │     │ OUTPUTS (vout[]):             │              │
│         │             │     │  - Extract address            │              │
│         │             │     │  - Store value (satoshis)     │              │
│         │             │     │  - is_spent = false           │              │
│         │             │     └────────────────┬──────────────┘              │
│         │             │  5. DB TRANSACTION   │                              │
│         │             └──────────────────────┘                              │
│         │                        │                                          │
│         ▼                        ▼                                          │
│  ┌──────────────┐     ┌──────────────────────┐                              │
│  │   Database   │◄────│ Tables updated:      │                              │
│  │              │     │  - blocks            │                              │
│  │              │     │  - transactions      │                              │
│  │              │     │  - transaction_inputs│                              │
│  │              │     │  - transaction_outputs│                             │
│  │              │     │  - addresses         │                              │
│  │              │     │  - indexer_state     │                              │
│  └──────────────┘     └──────────────────────┘                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

UTXO Model Explained:
• Bitcoin has no account balances - only UTXOs
• Each output can be spent only once
• Inputs reference previous outputs (prev_tx:vout_index)
• Address balance = SUM of unspent outputs
```

---

## Folder Structure Explained

### Backend (`/backend/src/`)

| Folder | Purpose |
|--------|---------|
| `config/` | Centralized env vars, validation. Single source of truth. |
| `utils/` | Logger, response helpers. Reusable across modules. |
| `database/` | PostgreSQL pool, transactions. Abstracts DB access. |
| `services/` | Business logic, NO HTTP. Testable, reusable. |
| `controllers/` | HTTP handlers. Maps requests to services. |
| `routes/` | URL definitions. Separation of concerns. |
| `indexers/` | Chain-specific data fetching. ETH & BTC logic. |
| `workers/` | Cron jobs. Scheduled, background processing. |

### Frontend (`/src/`)

| Folder | Purpose |
|--------|---------|
| `pages/` | Route components. One folder per route. |
| `components/` | Reusable UI pieces. Header, Table, Cards, etc. |
| `hooks/` | Custom React hooks. useApi, usePagination. |
| `services/` | API client. Centralized fetch logic. |

---

## Key Design Decisions

### 1. **Separation of Services and Controllers**
- Controllers handle HTTP concerns (validation, response formatting)
- Services contain business logic (database queries, calculations)
- Makes testing easier and allows reuse across different interfaces

### 2. **Idempotent Indexing**
- Uses `ON CONFLICT DO UPDATE` for all inserts
- Same block can be processed multiple times safely
- Critical for crash recovery and re-indexing

### 3. **12/6 Confirmation Delay**
- ETH: 12 blocks (~3 minutes) before considering final
- BTC: 6 blocks (~60 minutes) before considering final
- Prevents storing orphaned blocks from re-orgs

### 4. **UTXO Storage for BTC**
- Separate `transaction_inputs` and `transaction_outputs` tables
- Allows tracking spent/unspent state
- Enables address balance calculation via query

### 5. **Cron-Based Polling**
- Simple, reliable, no complex WebSocket management
- ETH: 15s interval (block time ~12s)
- BTC: 60s interval (block time ~10min)
- Overlap prevention via `isRunning` flags

---

## Setup & Run Guide

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- Ethereum RPC endpoint (Alchemy, Infura)
- Bitcoin Core (optional, for BTC indexing)

### Quick Start

```bash
# 1. Clone and install
cd Btc-ETH-indexer

# Backend
cd backend
npm install
cp .env.example .env
# Edit .env with database and RPC credentials

# 2. Database setup
createdb blockchain_indexer
psql -d blockchain_indexer -f database/schema.sql

# 3. Start backend
npm start

# 4. Frontend (new terminal)
cd ..
npm install
npm run dev
```

### Environment Variables

```env
# Database
DB_HOST=localhost
DB_NAME=blockchain_indexer
DB_USER=postgres
DB_PASSWORD=password

# Ethereum (required)
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY

# Bitcoin (optional)
BTC_RPC_URL=http://localhost:8332
BTC_RPC_USER=rpcuser
BTC_RPC_PASSWORD=rpcpassword
```

---

## API Endpoints Summary

| Endpoint | Method | Query Params | Description |
|----------|--------|--------------|-------------|
| `/api/health` | GET | - | Health check |
| `/api/stats` | GET | - | System statistics |
| `/api/networks` | GET | - | List networks |
| `/api/blocks` | GET | `network`, `page`, `limit` | Paginated blocks |
| `/api/blocks/:id` | GET | - | Block by hash/height |
| `/api/transactions` | GET | `network`, `address`, `page`, `limit` | Paginated transactions |
| `/api/transactions/:hash` | GET | - | Transaction details |
| `/api/addresses/:addr` | GET | `network` | Address details |
| `/api/addresses/:addr/transactions` | GET | `page`, `limit` | Address transaction history |
