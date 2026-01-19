/**
 * TRANSACTIONS LIST PAGE + DETAILS VIEW
 * Shows list by default, or details when hash param is present
 */

import { useState, useEffect } from 'react';
import { Link, useSearchParams, useParams, useNavigate } from 'react-router-dom';
import { getTransactions, getTransaction } from '../../services/api';
import DataTable from '../../components/DataTable';
import Pagination from '../../components/Pagination';
import ErrorMessage from '../../components/ErrorMessage';
import Loading from '../../components/Loading';
import './Transactions.css';

// ==========================================
// TRANSACTION DETAILS COMPONENT
// ==========================================
function TransactionDetails({ hash }) {
    const navigate = useNavigate();
    const [tx, setTx] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchTx = async () => {
            try {
                setLoading(true);
                const res = await getTransaction(hash);
                setTx(res.data || res);
                setError(null);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchTx();
    }, [hash]);

    const formatValue = (value, symbol) => {
        if (!value) return '0';
        const num = BigInt(value);
        if (symbol === 'ETH') {
            return `${(Number(num) / 1e18).toFixed(6)} ETH`;
        } else {
            return `${(Number(num) / 1e8).toFixed(8)} BTC`;
        }
    };

    const formatGas = (gas) => {
        if (!gas) return '-';
        return Number(gas).toLocaleString();
    };

    const formatGwei = (wei) => {
        if (!wei) return '-';
        return `${(Number(wei) / 1e9).toFixed(2)} Gwei`;
    };

    if (loading) return <Loading />;
    if (error) return <ErrorMessage message={error} onRetry={() => window.location.reload()} />;
    if (!tx) return <ErrorMessage message="Transaction not found" />;

    const isEth = tx.network === 'ethereum' || tx.symbol === 'ETH';

    return (
        <div className="transaction-details">
            <button className="back-btn" onClick={() => navigate('/transactions')}>
                ← Back to Transactions
            </button>

            <div className="details-header">
                <h1>Transaction Details</h1>
                <span className={`badge badge-${isEth ? 'eth' : 'btc'}`}>
                    {tx.symbol || (isEth ? 'ETH' : 'BTC')}
                </span>
            </div>

            <div className="details-card">
                <div className="detail-row">
                    <span className="detail-label">Transaction Hash</span>
                    <span className="detail-value hash-full">{tx.tx_hash || tx.hash}</span>
                </div>

                <div className="detail-row">
                    <span className="detail-label">Status</span>
                    <span className={`badge badge-${tx.status?.toLowerCase()}`}>
                        {tx.status || 'Confirmed'}
                    </span>
                </div>

                <div className="detail-row">
                    <span className="detail-label">Block</span>
                    <span className="detail-value">
                        <Link to={`/blocks/${tx.block_height || tx.block_number}`}>
                            {tx.block_height || tx.block_number || '-'}
                        </Link>
                    </span>
                </div>

                <div className="detail-row">
                    <span className="detail-label">From</span>
                    <span className="detail-value address-full">
                        {tx.from_address ? (
                            <Link to={`/address/${tx.from_address}?network=${tx.network}`}>
                                {tx.from_address}
                            </Link>
                        ) : tx.inputs && tx.inputs.length > 0 ? (
                            // For BTC, show input addresses
                            <div className="btc-addresses">
                                {tx.inputs.filter(i => i.prevout_address).slice(0, 3).map((input, idx) => (
                                    <div key={idx}>
                                        <Link to={`/address/${input.prevout_address}?network=${tx.network}`}>
                                            {input.prevout_address}
                                        </Link>
                                        {input.prevout_value && ` (${(Number(input.prevout_value) / 1e8).toFixed(8)} BTC)`}
                                    </div>
                                ))}
                                {tx.inputs.filter(i => i.prevout_address).length > 3 && (
                                    <div>...and {tx.inputs.filter(i => i.prevout_address).length - 3} more</div>
                                )}
                            </div>
                        ) : 'Coinbase (Mining Reward)'}
                    </span>
                </div>

                <div className="detail-row">
                    <span className="detail-label">To</span>
                    <span className="detail-value address-full">
                        {tx.to_address ? (
                            <Link to={`/address/${tx.to_address}?network=${tx.network}`}>
                                {tx.to_address}
                            </Link>
                        ) : tx.outputs && tx.outputs.length > 0 ? (
                            // For BTC, show output addresses
                            <div className="btc-addresses">
                                {tx.outputs.filter(o => o.address).slice(0, 3).map((output, idx) => (
                                    <div key={idx}>
                                        <Link to={`/address/${output.address}?network=${tx.network}`}>
                                            {output.address}
                                        </Link>
                                        {` (${(Number(output.value) / 1e8).toFixed(8)} BTC)`}
                                    </div>
                                ))}
                                {tx.outputs.filter(o => o.address).length > 3 && (
                                    <div>...and {tx.outputs.filter(o => o.address).length - 3} more</div>
                                )}
                            </div>
                        ) : 'No outputs'}
                    </span>
                </div>

                <div className="detail-row">
                    <span className="detail-label">Value</span>
                    <span className="detail-value value-highlight">
                        {formatValue(tx.value, tx.symbol || (isEth ? 'ETH' : 'BTC'))}
                    </span>
                </div>

                {isEth && (
                    <>
                        <div className="detail-row">
                            <span className="detail-label">Gas Used</span>
                            <span className="detail-value">{formatGas(tx.gas_used)}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Gas Price</span>
                            <span className="detail-value">{formatGwei(tx.gas_price)}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Transaction Fee</span>
                            <span className="detail-value">
                                {tx.gas_used && tx.gas_price
                                    ? `${((Number(tx.gas_used) * Number(tx.gas_price)) / 1e18).toFixed(6)} ETH`
                                    : '0 ETH'}
                            </span>
                        </div>
                        {tx.nonce !== undefined && (
                            <div className="detail-row">
                                <span className="detail-label">Nonce</span>
                                <span className="detail-value">{tx.nonce}</span>
                            </div>
                        )}
                    </>
                )}

                {!isEth && (
                    <div className="detail-row">
                        <span className="detail-label">Transaction Fee</span>
                        <span className="detail-value">
                            {tx.fee ? `${Number(tx.fee).toLocaleString()} satoshis (${(Number(tx.fee) / 1e8).toFixed(8)} BTC)` : '0 satoshis'}
                        </span>
                    </div>
                )}

                {tx.timestamp && (
                    <div className="detail-row">
                        <span className="detail-label">Timestamp</span>
                        <span className="detail-value">
                            {new Date(tx.timestamp).toLocaleString()}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}

// ==========================================
// TRANSACTIONS LIST COMPONENT
// ==========================================
function Transactions() {
    const { hash } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    const network = searchParams.get('network') || '';

    // All hooks must be called unconditionally (before any returns)
    const [txs, setTxs] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = async (page = 1) => {
        try {
            setLoading(true);
            const res = await getTransactions({ network: network || undefined, page, limit: 20 });
            setTxs(res.data || []);
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
        if (!hash) {
            fetchData();
        }
    }, [network, hash]);

    // If hash param exists, show details view
    if (hash) {
        return <TransactionDetails hash={hash} />;
    }

    const handleNetworkFilter = (net) => {
        if (net) {
            setSearchParams({ network: net });
        } else {
            setSearchParams({});
        }
    };

    const truncate = (hash) => hash ? `${hash.slice(0, 10)}...${hash.slice(-6)}` : '-';

    const formatValue = (value, symbol) => {
        if (!value) return '0';
        const num = BigInt(value);
        if (symbol === 'ETH') {
            return `${(Number(num) / 1e18).toFixed(4)} ETH`;
        } else {
            return `${(Number(num) / 1e8).toFixed(8)} BTC`;
        }
    };

    const columns = [
        {
            key: 'symbol', label: 'Network',
            render: (v, row) => (
                <span className={`badge badge-${row.network === 'ethereum' ? 'eth' : 'btc'}`}>{v}</span>
            )
        },
        {
            key: 'tx_hash', label: 'Hash', className: 'hash',
            render: (v) => <Link to={`/transactions/${v}`}>{truncate(v)}</Link>
        },
        { key: 'from_address', label: 'From', className: 'address', render: (v) => v ? truncate(v) : 'Coinbase' },
        { key: 'to_address', label: 'To', className: 'address', render: (v, row) => v ? truncate(v) : (row.network === 'bitcoin' ? 'Multiple (See Details)' : 'Contract Creation') },
        { key: 'value', label: 'Value', className: 'value', render: (v, row) => formatValue(v, row.symbol) },
        {
            key: 'gas_used', label: 'Gas/Fee', className: 'gas',
            render: (v, row) => {
                if (row.network === 'ethereum') {
                    return v ? Number(v).toLocaleString() : '0';
                } else {
                    // For BTC, show fee in satoshis
                    return row.fee ? `${Number(row.fee).toLocaleString()} sats` : '0 sats';
                }
            }
        },
        {
            key: 'status', label: 'Status',
            render: (v) => <span className={`badge badge-${v?.toLowerCase()}`}>{v}</span>
        },
    ];

    return (
        <div className="transactions-page">
            <div className="page-header">
                <h1>Transactions</h1>
                <div className="filters">
                    <button className={`filter-btn ${!network ? 'active' : ''}`} onClick={() => handleNetworkFilter('')}>All</button>
                    <button className={`filter-btn ${network === 'ethereum' ? 'active' : ''}`} onClick={() => handleNetworkFilter('ethereum')}>ETH</button>
                    <button className={`filter-btn ${network === 'bitcoin' ? 'active' : ''}`} onClick={() => handleNetworkFilter('bitcoin')}>BTC</button>
                </div>
            </div>

            {error && <ErrorMessage message={error} onRetry={() => fetchData()} />}

            <DataTable columns={columns} data={txs} loading={loading} emptyMessage="No transactions found" />
            <Pagination pagination={pagination} onPageChange={fetchData} />
        </div>
    );
}

export default Transactions;
