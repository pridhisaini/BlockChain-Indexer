/**
 * NETWORK CARD COMPONENT
 * =======================
 * WHY: Displays network statistics (ETH/BTC) in a visual card.
 */

import { Link } from 'react-router-dom';
import './NetworkCard.css';

function NetworkCard({ network }) {
    const isEth = network.symbol === 'ETH';
    const path = isEth ? '/ethereum' : '/bitcoin';

    return (
        <Link to={path} className={`network-card ${isEth ? 'eth' : 'btc'}`}>
            <div className="network-header">
                <div className="network-icon">
                    {isEth ? '💎' : '₿'}
                </div>
                <div className="network-info">
                    <h3>{network.name}</h3>
                    <span className="symbol">{network.symbol}</span>
                </div>
                <div className={`sync-status ${network.is_syncing ? 'syncing' : 'idle'}`}>
                    {network.is_syncing ? '⟳ Syncing' : '● Synced'}
                </div>
            </div>

            <div className="network-stats">
                <div className="stat">
                    <span className="stat-value">{Number(network.current_height || 0).toLocaleString()}</span>
                    <span className="stat-label">Block Height</span>
                </div>
                <div className="stat">
                    <span className="stat-value">{Number(network.total_blocks || 0).toLocaleString()}</span>
                    <span className="stat-label">Indexed Blocks</span>
                </div>
                <div className="stat">
                    <span className="stat-value">{Number(network.total_transactions || 0).toLocaleString()}</span>
                    <span className="stat-label">Transactions</span>
                </div>
            </div>
        </Link>
    );
}

export default NetworkCard;
