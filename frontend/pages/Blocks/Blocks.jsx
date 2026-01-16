/**
 * BLOCKS LIST PAGE + DETAILS VIEW
 * Shows list by default, or details when identifier param is present
 */

import { useState, useEffect } from 'react';
import { Link, useSearchParams, useParams, useNavigate } from 'react-router-dom';
import { getBlocks, getBlock, getBlockTransactions } from '../../services/api';
import DataTable from '../../components/DataTable';
import Pagination from '../../components/Pagination';
import Loading from '../../components/Loading';
import ErrorMessage from '../../components/ErrorMessage';
import './Blocks.css';

// ==========================================
// BLOCK DETAILS COMPONENT
// ==========================================
function BlockDetails({ identifier }) {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const network = searchParams.get('network');

    const [block, setBlock] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchBlock = async () => {
            try {
                setLoading(true);
                const res = await getBlock(identifier, network);
                setBlock(res.data || res);

                // Also fetch block transactions
                try {
                    const txRes = await getBlockTransactions(identifier, { limit: 10 });
                    setTransactions(txRes.data || []);
                } catch (e) {
                    // Transactions fetch may fail, that's ok
                }

                setError(null);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchBlock();
    }, [identifier, network]);

    const formatTime = (timestamp) => {
        if (!timestamp) return '-';
        return new Date(timestamp).toLocaleString();
    };

    const formatSize = (bytes) => {
        if (!bytes) return '-';
        if (bytes > 1000000) return `${(bytes / 1000000).toFixed(2)} MB`;
        if (bytes > 1000) return `${(bytes / 1000).toFixed(2)} KB`;
        return `${bytes} bytes`;
    };

    const truncate = (hash) => hash ? `${hash.slice(0, 10)}...${hash.slice(-6)}` : '-';

    if (loading) return <Loading />;
    if (error) return <ErrorMessage message={error} onRetry={() => window.location.reload()} />;
    if (!block) return <ErrorMessage message="Block not found" />;

    const isEth = block.network === 'ethereum' || block.symbol === 'ETH';

    const txColumns = [
        {
            key: 'tx_hash', label: 'Hash', className: 'hash',
            render: (v) => <Link to={`/transactions/${v}`}>{truncate(v)}</Link>
        },
        { key: 'from_address', label: 'From', render: (v) => v ? truncate(v) : 'Coinbase' },
        { key: 'to_address', label: 'To', render: (v) => v ? truncate(v) : '-' },
    ];

    return (
        <div className="block-details">
            <button className="back-btn" onClick={() => navigate('/blocks')}>
                ← Back to Blocks
            </button>

            <div className="details-header">
                <h1>Block Details</h1>
                <span className={`badge badge-${isEth ? 'eth' : 'btc'}`}>
                    {block.symbol || (isEth ? 'ETH' : 'BTC')}
                </span>
            </div>

            <div className="details-card">
                <div className="detail-row">
                    <span className="detail-label">Block Height</span>
                    <span className="detail-value">{block.height?.toLocaleString()}</span>
                </div>

                <div className="detail-row">
                    <span className="detail-label">Block Hash</span>
                    <span className="detail-value hash-full">{block.hash}</span>
                </div>

                <div className="detail-row">
                    <span className="detail-label">Status</span>
                    <span className={`badge badge-${block.status?.toLowerCase() || 'confirmed'}`}>
                        {block.status || 'Confirmed'}
                    </span>
                </div>

                <div className="detail-row">
                    <span className="detail-label">Timestamp</span>
                    <span className="detail-value">{formatTime(block.block_timestamp || block.timestamp)}</span>
                </div>

                <div className="detail-row">
                    <span className="detail-label">Transactions</span>
                    <span className="detail-value">{block.tx_count || 0}</span>
                </div>

                {block.parent_hash && (
                    <div className="detail-row">
                        <span className="detail-label">Parent Hash</span>
                        <span className="detail-value hash-full">
                            <Link to={`/blocks/${block.parent_hash}`}>{block.parent_hash}</Link>
                        </span>
                    </div>
                )}

                {(block.miner || block.miner_address) && (
                    <div className="detail-row">
                        <span className="detail-label">{isEth ? 'Miner' : 'Miner'}</span>
                        <span className="detail-value address-full">
                            <Link to={`/address/${block.miner || block.miner_address}?network=${block.network}`}>
                                {block.miner || block.miner_address}
                            </Link>
                        </span>
                    </div>
                )}

                {block.size && (
                    <div className="detail-row">
                        <span className="detail-label">Size</span>
                        <span className="detail-value">{formatSize(block.size)}</span>
                    </div>
                )}

                {isEth && block.gas_used !== undefined && (
                    <>
                        <div className="detail-row">
                            <span className="detail-label">Gas Used</span>
                            <span className="detail-value">{Number(block.gas_used).toLocaleString()}</span>
                        </div>
                        {block.gas_limit && (
                            <div className="detail-row">
                                <span className="detail-label">Gas Limit</span>
                                <span className="detail-value">{Number(block.gas_limit).toLocaleString()}</span>
                            </div>
                        )}
                        {block.base_fee_per_gas && (
                            <div className="detail-row">
                                <span className="detail-label">Base Fee</span>
                                <span className="detail-value">
                                    {(Number(block.base_fee_per_gas) / 1e9).toFixed(2)} Gwei
                                </span>
                            </div>
                        )}
                    </>
                )}

                {!isEth && block.difficulty !== undefined && (
                    <div className="detail-row">
                        <span className="detail-label">Difficulty</span>
                        <span className="detail-value">{Number(block.difficulty).toLocaleString()}</span>
                    </div>
                )}

                {block.nonce && (
                    <div className="detail-row">
                        <span className="detail-label">Nonce</span>
                        <span className="detail-value">{block.nonce}</span>
                    </div>
                )}
            </div>

            {/* Transactions in this block */}
            {transactions.length > 0 && (
                <div className="block-transactions">
                    <h2>Transactions in Block</h2>
                    <DataTable
                        columns={txColumns}
                        data={transactions}
                        loading={false}
                        emptyMessage="No transactions"
                    />
                    {block.tx_count > 10 && (
                        <p className="more-txs">
                            Showing 10 of {block.tx_count} transactions
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

// ==========================================
// BLOCKS LIST COMPONENT
// ==========================================
function Blocks() {
    const { identifier } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    const network = searchParams.get('network') || '';

    // All hooks must be called unconditionally (before any returns)
    const [blocks, setBlocks] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = async (page = 1) => {
        try {
            setLoading(true);
            const res = await getBlocks({ network: network || undefined, page, limit: 20 });
            setBlocks(res.data || []);
            if (res.pagination) setPagination(res.pagination);
            setError(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Only fetch if not viewing details
        if (!identifier) {
            fetchData();
        }
    }, [network, identifier]);

    // If identifier param exists, show details view
    if (identifier) {
        return <BlockDetails identifier={identifier} />;
    }

    const handleNetworkFilter = (net) => {
        if (net) {
            setSearchParams({ network: net });
        } else {
            setSearchParams({});
        }
    };

    const formatTime = (timestamp) => new Date(timestamp).toLocaleString();
    const truncate = (hash) => hash ? `${hash.slice(0, 10)}...${hash.slice(-8)}` : '-';

    const columns = [
        {
            key: 'symbol', label: 'Network',
            render: (v, row) => (
                <span className={`badge badge-${row.network === 'ethereum' ? 'eth' : 'btc'}`}>{v}</span>
            )
        },
        {
            key: 'height', label: 'Height', className: 'number',
            render: (v, row) => (
                <Link to={`/blocks/${v}?network=${row.network}`}>{v?.toLocaleString()}</Link>
            )
        },
        {
            key: 'hash', label: 'Hash', className: 'hash',
            render: (v) => <span className="hash-text">{truncate(v)}</span>
        },
        { key: 'tx_count', label: 'Txns', className: 'number' },
        { key: 'block_timestamp', label: 'Time', className: 'time', render: formatTime },
        {
            key: 'status', label: 'Status',
            render: (v) => <span className={`badge badge-${v?.toLowerCase()}`}>{v}</span>
        },
    ];

    return (
        <div className="blocks-page">
            <div className="page-header">
                <h1>Blocks</h1>
                <div className="filters">
                    <button
                        className={`filter-btn ${!network ? 'active' : ''}`}
                        onClick={() => handleNetworkFilter('')}
                    >All</button>
                    <button
                        className={`filter-btn ${network === 'ethereum' ? 'active' : ''}`}
                        onClick={() => handleNetworkFilter('ethereum')}
                    >ETH</button>
                    <button
                        className={`filter-btn ${network === 'bitcoin' ? 'active' : ''}`}
                        onClick={() => handleNetworkFilter('bitcoin')}
                    >BTC</button>
                </div>
            </div>

            {error && <ErrorMessage message={error} onRetry={() => fetchData()} />}

            <DataTable
                columns={columns}
                data={blocks}
                loading={loading}
                emptyMessage="No blocks found"
            />

            <Pagination pagination={pagination} onPageChange={fetchData} />
        </div>
    );
}

export default Blocks;
