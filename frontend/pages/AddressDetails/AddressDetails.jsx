/**
 * ADDRESS DETAILS PAGE
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getAddress, getAddressTransactions } from '../../services/api';
import DataTable from '../../components/DataTable';
import Pagination from '../../components/Pagination';
import Loading from '../../components/Loading';
import ErrorMessage from '../../components/ErrorMessage';
import './AddressDetails.css';

function AddressDetails() {
    const { address } = useParams();
    const [addressData, setAddressData] = useState([]);
    const [txs, setTxs] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = async (page = 1) => {
        try {
            setLoading(true);
            const [addrRes, txRes] = await Promise.all([
                getAddress(address),
                getAddressTransactions(address, { page, limit: 20 }),
            ]);
            setAddressData(Array.isArray(addrRes.data) ? addrRes.data : [addrRes.data]);
            setTxs(txRes.data || []);
            if (txRes.pagination) setPagination(txRes.pagination);
            setError(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (address) fetchData();
    }, [address]);

    const truncate = (hash) => hash ? `${hash.slice(0, 10)}...${hash.slice(-6)}` : '-';

    const formatValue = (value, symbol) => {
        if (!value) return '0';
        const num = BigInt(value);
        if (symbol === 'ETH') return `${(Number(num) / 1e18).toFixed(4)} ETH`;
        return `${(Number(num) / 1e8).toFixed(8)} BTC`;
    };

    if (loading && addressData.length === 0) {
        return <Loading message="Loading address..." />;
    }

    if (error && addressData.length === 0) {
        return <ErrorMessage message={error} onRetry={() => fetchData()} />;
    }

    const columns = [
        {
            key: 'symbol', label: 'Network',
            render: (v, row) => <span className={`badge badge-${row.network === 'ethereum' ? 'eth' : 'btc'}`}>{v}</span>
        },
        {
            key: 'tx_hash', label: 'Hash', className: 'hash',
            render: (v) => <Link to={`/transactions/${v}`}>{truncate(v)}</Link>
        },
        {
            key: 'from_address', label: 'From', className: 'address',
            render: (v) => v === address ? <span className="highlight">This Address</span> : truncate(v)
        },
        {
            key: 'to_address', label: 'To', className: 'address',
            render: (v) => v === address ? <span className="highlight">This Address</span> : (v ? truncate(v) : '-')
        },
        { key: 'value', label: 'Value', className: 'value', render: (v, row) => formatValue(v, row.symbol) },
    ];

    return (
        <div className="address-page">
            <div className="page-header">
                <h1>Address Details</h1>
            </div>

            <div className="address-info glass">
                <div className="address-hash">
                    <span className="label">Address</span>
                    <code>{address}</code>
                </div>

                <div className="address-stats">
                    {addressData.map((addr) => (
                        <div key={addr.network} className="stat-block">
                            <span className={`badge badge-${addr.network === 'ethereum' ? 'eth' : 'btc'}`}>{addr.symbol}</span>
                            <div className="stat-row">
                                <span className="stat-label">Transactions</span>
                                <span className="stat-value">{Number(addr.tx_count || 0).toLocaleString()}</span>
                            </div>
                            <div className="stat-row">
                                <span className="stat-label">First Seen</span>
                                <span className="stat-value">{addr.first_seen_at ? new Date(addr.first_seen_at).toLocaleDateString() : '-'}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <section className="section">
                <h2 className="section-title">Transaction History</h2>
                <DataTable columns={columns} data={txs} loading={loading} emptyMessage="No transactions for this address" />
                <Pagination pagination={pagination} onPageChange={fetchData} />
            </section>
        </div>
    );
}

export default AddressDetails;
