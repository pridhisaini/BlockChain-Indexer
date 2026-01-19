/**
 * HEADER COMPONENT
 * =================
 * WHY: Consistent navigation header across all pages.
 * Contains logo, search bar, and quick actions.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { search } from '../services/api';
import './Header.css';

function Header() {
    const [searchValue, setSearchValue] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const handleSearch = async (e) => {
        e.preventDefault();
        const query = searchValue.trim();
        if (!query) return;

        setIsSearching(true);
        setError(null);

        try {
            const result = await search(query);
            if (result.success && result.data) {
                const { type, id } = result.data;
                setSearchValue('');
                switch (type) {
                    case 'block':
                        navigate(`/blocks/${id}`);
                        break;
                    case 'transaction':
                        navigate(`/transactions/${id}`);
                        break;
                    case 'address':
                        navigate(`/address/${id}`);
                        break;
                    default:
                        setError('Unknown result type');
                }
            } else {
                setError('No results found');
            }
        } catch (err) {
            setError(err.message || 'Search failed');
        } finally {
            setIsSearching(false);
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
                    className={`search-input ${error ? 'search-input-error' : ''}`}
                    placeholder={error || "Search by address, tx hash, or block..."}
                    value={searchValue}
                    onChange={(e) => {
                        setSearchValue(e.target.value);
                        if (error) setError(null);
                    }}
                    disabled={isSearching}
                />
                <button type="submit" className="search-btn" disabled={isSearching}>
                    {isSearching ? '⏳' : '🔍'}
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
