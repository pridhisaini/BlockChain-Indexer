/**
 * NETWORK OVERVIEW PAGE
 * ======================
 * Network-specific page showing detailed stats for ETH or BTC.
 */

import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { getNetworkStats, getBlocks, getTransactions } from '../../services/api';
import StatsCard from '../../components/StatsCard';
import DataTable from '../../components/DataTable';
import Pagination from '../../components/Pagination';
import Loading from '../../components/Loading';
import ErrorMessage from '../../components/ErrorMessage';
import './NetworkOverview.css';

function NetworkOverview() {
    // Use pathname to determine network since routes are static (/ethereum, /bitcoin)
    const location = useLocation();
    const networkName = location.pathname.includes('ethereum') ? 'ethereum' : 'bitcoin';
    const isEth = networkName === 'ethereum';

    const [stats, setStats] = useState(null);
    const [blocks, setBlocks] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });
    const [txPagination, setTxPagination] = useState({ page: 1, limit: 10, total: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);

    // Fetch stats only (silent update - no loading spinner)
    const fetchStats = async () => {
        try {
            const [statsRes, blocksRes, txRes] = await Promise.all([
                getNetworkStats(networkName),
                getBlocks({ network: networkName, page: pagination.page, limit: 10 }),
                getTransactions({ network: networkName, page: txPagination.page, limit: 10 }),
            ]);
            setStats(statsRes.data);
            setBlocks(blocksRes.data || []);
            setTransactions(txRes.data || []);
            if (blocksRes.pagination) setPagination(blocksRes.pagination);
            if (txRes.pagination) setTxPagination(txRes.pagination);
            setLastUpdated(new Date());
            setError(null);
        } catch (err) {
            // Silent fail for auto-refresh, don't overwrite existing data
            console.warn('Auto-refresh failed:', err.message);
        }
    };

    // Full fetch with loading indicator (initial load and page changes)
    const fetchData = async (page = 1) => {
        try {
            setLoading(true);
            const [statsRes, blocksRes, txRes] = await Promise.all([
                getNetworkStats(networkName),
                getBlocks({ network: networkName, page, limit: 10 }),
                getTransactions({ network: networkName, page: 1, limit: 10 }),
            ]);
            setStats(statsRes.data);
            setBlocks(blocksRes.data || []);
            setTransactions(txRes.data || []);
            if (blocksRes.pagination) setPagination(blocksRes.pagination);
            if (txRes.pagination) setTxPagination(txRes.pagination);
            setLastUpdated(new Date());
            setError(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Initial fetch when network changes
    useEffect(() => {
        fetchData();
    }, [networkName]);

    // Auto-refresh every 10 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            fetchStats();
        }, 10000); // 10 seconds

        return () => clearInterval(interval);
    }, [networkName, pagination.page]);

    const handlePageChange = (page) => {
        fetchData(page);
    };

    if (loading && !stats) {
        return <Loading message={`Loading ${networkName} data...`} />;
    }

    if (error && !stats) {
        return <ErrorMessage message={error} onRetry={() => fetchData()} />;
    }

    // Mock chart data
    const chartData = blocks.slice(0, 10).map((b, i) => ({
        name: `#${b.height}`,
        txs: b.tx_count || 0,
    })).reverse();

    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const truncateHash = (hash) => {
        if (!hash) return '-';
        return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
    };

    const blockColumns = [
        {
            key: 'height', label: 'Height', className: 'number',
            render: (v, row) => <Link to={`/blocks/${v}?network=${row.network}`}>{v?.toLocaleString()}</Link>
        },
        {
            key: 'hash',
            label: 'Hash',
            className: 'hash',
            render: (v) => <span className="hash-text">{truncateHash(v)}</span>
        },
        { key: 'tx_count', label: 'Txns', className: 'number' },
        {
            key: 'block_timestamp',
            label: 'Time',
            className: 'time',
            render: (v) => formatTime(v)
        },
        {
            key: 'status',
            label: 'Status',
            render: (v) => <span className={`badge badge-${v?.toLowerCase()}`}>{v}</span>
        },
    ];

    const formatValue = (value, symbol) => {
        if (!value) return '0';
        const num = BigInt(value);
        if (symbol === 'ETH') {
            return `${(Number(num) / 1e18).toFixed(4)} ETH`;
        } else {
            return `${(Number(num) / 1e8).toFixed(8)} BTC`;
        }
    };

    const transactionColumns = [
        {
            key: 'tx_hash', label: 'Hash', className: 'hash',
            render: (v) => <Link to={`/transactions/${v}`}>{truncateHash(v)}</Link>
        },
        {
            key: 'from_address', label: 'From', className: 'address',
            render: (v) => v ? truncateHash(v) : 'Coinbase'
        },
        {
            key: 'to_address', label: 'To', className: 'address',
            render: (v) => v ? truncateHash(v) : '-'
        },
        {
            key: 'value', label: 'Value', className: 'value',
            render: (v, row) => formatValue(v, row.symbol)
        },
        {
            key: 'status', label: 'Status',
            render: (v) => <span className={`badge badge-${v?.toLowerCase()}`}>{v}</span>
        },
    ];

    return (
        <div className="network-overview">
            <div className="page-header">
                <div className={`network-icon large ${isEth ? 'eth' : 'btc'}`}>
                    {isEth ? '💎' : '₿'}
                </div>
                <div>
                    <h1 style={{ textTransform: 'capitalize' }}>{networkName}</h1>
                    <p className="subtitle">{isEth ? 'Ethereum Mainnet' : 'Bitcoin Network'} Overview</p>
                </div>
                <div className={`sync-badge ${stats?.is_syncing ? 'syncing' : 'synced'}`}>
                    {stats?.is_syncing ? '⟳ Syncing' : '● Synced'}
                </div>
            </div>

            {/* Stats */}
            <section className="section">
                <div className="stats-grid">
                    <StatsCard
                        icon="📊"
                        value={Number(stats?.current_height || 0).toLocaleString()}
                        label="Current Height"
                    />
                    <StatsCard
                        icon="📦"
                        value={Number(stats?.total_blocks || 0).toLocaleString()}
                        label="Indexed Blocks"
                    />
                    <StatsCard
                        icon="💸"
                        value={Number(stats?.total_transactions || 0).toLocaleString()}
                        label="Transactions"
                    />
                    <StatsCard
                        icon="👛"
                        value={Number(stats?.total_addresses || 0).toLocaleString()}
                        label="Addresses"
                    />
                </div>
            </section>

            {/* Chart */}
            <section className="section">
                <h2 className="section-title">Transactions per Block</h2>
                <div className="chart-container glass">
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={chartData}>
                            <XAxis dataKey="name" stroke="#6b6b7b" fontSize={11} />
                            <YAxis stroke="#6b6b7b" fontSize={11} />
                            <Tooltip
                                contentStyle={{
                                    background: '#1a1a25',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '8px'
                                }}
                            />
                            <Bar
                                dataKey="txs"
                                fill={isEth ? '#627eea' : '#f7931a'}
                                radius={[4, 4, 0, 0]}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </section>

            {/* Recent Blocks */}
            <section className="section">
                <div className="section-header">
                    <h2 className="section-title">Recent Blocks</h2>
                    <Link to={`/blocks?network=${networkName}`} className="view-all">View All →</Link>
                </div>
                <DataTable
                    columns={blockColumns}
                    data={blocks}
                    loading={loading}
                    emptyMessage="No blocks indexed yet"
                />
                <Pagination pagination={pagination} onPageChange={handlePageChange} />
            </section>

            {/* Recent Transactions */}
            <section className="section">
                <div className="section-header">
                    <h2 className="section-title">Recent Transactions</h2>
                    <Link to={`/transactions?network=${networkName}`} className="view-all">View All →</Link>
                </div>
                <DataTable
                    columns={transactionColumns}
                    data={transactions}
                    loading={loading}
                    emptyMessage="No transactions indexed yet"
                />
            </section>
        </div>
    );
}

export default NetworkOverview;
