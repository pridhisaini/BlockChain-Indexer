/**
 * DASHBOARD PAGE
 * ================
 * WHY: Main overview page showing network stats and recent activity.
 * Uses charts for analytics visualization.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { getStats, getBlocks, getTransactions } from '../../services/api';
import NetworkCard from '../../components/NetworkCard';
import StatsCard from '../../components/StatsCard';
import Loading from '../../components/Loading';
import ErrorMessage from '../../components/ErrorMessage';
import './Dashboard.css';

function Dashboard() {
    const [stats, setStats] = useState([]);
    const [blocks, setBlocks] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [statsRes, blocksRes, txRes] = await Promise.all([
                getStats(),
                getBlocks({ limit: 6 }),
                getTransactions({ limit: 6 }),
            ]);
            setStats(statsRes.data || []);
            setBlocks(blocksRes.data || []);
            setTransactions(txRes.data || []);
            setError(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, []);

    if (loading && stats.length === 0) {
        return <Loading message="Loading dashboard..." />;
    }

    if (error && stats.length === 0) {
        return <ErrorMessage message={error} onRetry={fetchData} />;
    }

    // Calculate totals
    const totalBlocks = stats.reduce((sum, s) => sum + parseInt(s.total_blocks || 0), 0);
    const totalTxs = stats.reduce((sum, s) => sum + parseInt(s.total_transactions || 0), 0);
    const totalAddresses = stats.reduce((sum, s) => sum + parseInt(s.total_addresses || 0), 0);

    // Mock chart data (would come from API in production)
    const chartData = blocks.map((b, i) => ({
        name: `Block ${i + 1}`,
        txs: b.tx_count || 0,
    })).reverse();

    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const truncateHash = (hash) => {
        if (!hash) return '-';
        return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
    };

    return (
        <div className="dashboard">
            <div className="page-header">
                <h1>Dashboard</h1>
                <p className="subtitle">Blockchain Indexer Overview</p>
            </div>

            {/* Networks */}
            <section className="section">
                <h2 className="section-title">Networks</h2>
                <div className="networks-grid">
                    {stats.map((network) => (
                        <NetworkCard key={network.network} network={network} />
                    ))}
                </div>
            </section>

            {/* Stats Overview */}
            <section className="section">
                <div className="stats-grid">
                    <StatsCard icon="📦" value={totalBlocks.toLocaleString()} label="Total Blocks" />
                    <StatsCard icon="💸" value={totalTxs.toLocaleString()} label="Transactions" />
                    <StatsCard icon="👛" value={totalAddresses.toLocaleString()} label="Addresses" />
                    <StatsCard icon="⛓️" value={stats.length} label="Networks" />
                </div>
            </section>

            {/* Chart */}
            <section className="section">
                <h2 className="section-title">Transaction Activity</h2>
                <div className="chart-container glass">
                    <ResponsiveContainer width="100%" height={250}>
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorTxs" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="name" stroke="#6b6b7b" fontSize={12} />
                            <YAxis stroke="#6b6b7b" fontSize={12} />
                            <Tooltip
                                contentStyle={{
                                    background: '#1a1a25',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '8px'
                                }}
                            />
                            <Area
                                type="monotone"
                                dataKey="txs"
                                stroke="#8b5cf6"
                                fillOpacity={1}
                                fill="url(#colorTxs)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </section>

            {/* Recent Activity */}
            <div className="recent-grid">
                {/* Recent Blocks */}
                <section className="section">
                    <div className="section-header">
                        <h2 className="section-title">Recent Blocks</h2>
                        <Link to="/blocks" className="view-all">View All →</Link>
                    </div>
                    <div className="recent-list glass">
                        {blocks.map((block) => (
                            <Link
                                to={`/blocks/${block.hash}`}
                                key={`${block.network}-${block.hash}`}
                                className="recent-item"
                            >
                                <div className="item-icon">📦</div>
                                <div className="item-content">
                                    <span className="item-primary">
                                        Block {block.height?.toLocaleString()}
                                    </span>
                                    <span className="item-secondary">
                                        {block.tx_count} txs • {formatTime(block.block_timestamp)}
                                    </span>
                                </div>
                                <span className={`badge badge-${block.network === 'ethereum' ? 'eth' : 'btc'}`}>
                                    {block.symbol}
                                </span>
                            </Link>
                        ))}
                    </div>
                </section>

                {/* Recent Transactions */}
                <section className="section">
                    <div className="section-header">
                        <h2 className="section-title">Recent Transactions</h2>
                        <Link to="/transactions" className="view-all">View All →</Link>
                    </div>
                    <div className="recent-list glass">
                        {transactions.map((tx) => (
                            <Link
                                to={`/transactions/${tx.tx_hash}`}
                                key={`${tx.network}-${tx.tx_hash}`}
                                className="recent-item"
                            >
                                <div className="item-icon">💸</div>
                                <div className="item-content">
                                    <span className="item-primary hash">
                                        {truncateHash(tx.tx_hash)}
                                    </span>
                                    <span className="item-secondary">
                                        {tx.from_address ? truncateHash(tx.from_address) : 'Coinbase'}
                                    </span>
                                </div>
                                <span className={`badge badge-${tx.network === 'ethereum' ? 'eth' : 'btc'}`}>
                                    {tx.symbol}
                                </span>
                            </Link>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}

export default Dashboard;
