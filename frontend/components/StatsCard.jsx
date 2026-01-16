/**
 * STATS CARD COMPONENT
 * =====================
 * WHY: Displays a single statistic with icon and label.
 * Includes animation when values update for dynamic feel.
 */

import { useState, useEffect, useRef } from 'react';
import './StatsCard.css';

function StatsCard({ icon, value, label, trend }) {
    const [isUpdating, setIsUpdating] = useState(false);
    const prevValueRef = useRef(value);

    // Trigger animation when value changes
    useEffect(() => {
        if (prevValueRef.current !== value) {
            setIsUpdating(true);
            const timer = setTimeout(() => setIsUpdating(false), 600);
            prevValueRef.current = value;
            return () => clearTimeout(timer);
        }
    }, [value]);

    return (
        <div className={`stats-card ${isUpdating ? 'updating' : ''}`}>
            <div className="stats-icon">{icon}</div>
            <div className="stats-content">
                <span className={`stats-value ${isUpdating ? 'pulse' : ''}`}>{value}</span>
                <span className="stats-label">{label}</span>
            </div>
            {trend && (
                <span className={`stats-trend ${trend > 0 ? 'up' : 'down'}`}>
                    {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
                </span>
            )}
        </div>
    );
}

export default StatsCard;
