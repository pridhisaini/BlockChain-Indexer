/**
 * BADGE COMPONENT
 */

import './Badge.css';

function Badge({ type, children }) {
    return (
        <span className={`badge badge-${type}`}>
            {children}
        </span>
    );
}

export default Badge;
