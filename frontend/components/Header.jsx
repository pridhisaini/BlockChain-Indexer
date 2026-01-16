/**
 * HEADER COMPONENT
 * =================
 * WHY: Consistent navigation header across all pages.
 * Contains logo, search bar, and quick actions.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Header.css';

function Header() {
    const [searchValue, setSearchValue] = useState('');
    const navigate = useNavigate();

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchValue.trim()) {
            // Detect if it's a hash (tx or block) or address
            const query = searchValue.trim();
            if (query.startsWith('0x') && query.length === 66) {
                // Could be tx hash or block hash
                navigate(`/transactions/${query}`);
            } else if (query.length >= 26 && query.length <= 66) {
                // Likely an address
                navigate(`/address/${query}`);
            } else if (/^\d+$/.test(query)) {
                // Block height
                navigate(`/blocks/${query}`);
            } else {
                navigate(`/transactions/${query}`);
            }
            setSearchValue('');
        }
    };

    return (
        <header className="header">
            <div className="header-left">
                <a href="/" className="logo">
                    <span className="logo-icon">⛓️</span>
                    <span className="logo-text">BlockIndexer</span>
                </a>
            </div>

            <form className="search-form" onSubmit={handleSearch}>
                <input
                    type="text"
                    className="search-input"
                    placeholder="Search by address, tx hash, or block..."
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                />
                <button type="submit" className="search-btn">
                    🔍
                </button>
            </form>

            <div className="header-right">
                <span className="live-badge">
                    <span className="pulse"></span>
                    Live
                </span>
            </div>
        </header>
    );
}

export default Header;
