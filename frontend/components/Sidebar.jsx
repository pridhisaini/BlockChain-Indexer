/**
 * SIDEBAR COMPONENT
 * ==================
 * WHY: Navigation sidebar for dashboard layout.
 * Provides quick access to all main pages.
 */

import { NavLink } from 'react-router-dom';
import './Sidebar.css';

const navItems = [
    { path: '/', icon: '📊', label: 'Dashboard' },
    { path: '/ethereum', icon: '💎', label: 'Ethereum' },
    { path: '/bitcoin', icon: '₿', label: 'Bitcoin' },
    { path: '/blocks', icon: '📦', label: 'Blocks' },
    { path: '/transactions', icon: '💸', label: 'Transactions' },
];

function Sidebar() {
    return (
        <aside className="sidebar">
            <nav className="sidebar-nav">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `nav-item ${isActive ? 'active' : ''}`
                        }
                        end={item.path === '/'}
                    >
                        <span className="nav-icon">{item.icon}</span>
                        <span className="nav-label">{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            <div className="sidebar-footer">
                <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="footer-link">
                    📚 Docs
                </a>
            </div>
        </aside>
    );
}

export default Sidebar;
