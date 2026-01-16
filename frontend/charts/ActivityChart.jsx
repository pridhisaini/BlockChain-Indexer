/**
 * CHARTS - AREA CHART
 * ====================
 * WHY: Separates chart components for reusability.
 * Consistent styling across all chart instances.
 */

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const chartTheme = {
    background: '#1a1a25',
    border: 'rgba(255,255,255,0.1)',
    text: '#6b6b7b',
    gradient: {
        purple: '#8b5cf6',
        blue: '#3b82f6',
    },
};

function ActivityChart({ data, dataKey = 'txs', color = chartTheme.gradient.purple, height = 250 }) {
    return (
        <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={data}>
                <defs>
                    <linearGradient id={`color${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke={chartTheme.text} fontSize={12} />
                <YAxis stroke={chartTheme.text} fontSize={12} />
                <Tooltip
                    contentStyle={{
                        background: chartTheme.background,
                        border: `1px solid ${chartTheme.border}`,
                        borderRadius: '8px',
                    }}
                />
                <Area
                    type="monotone"
                    dataKey={dataKey}
                    stroke={color}
                    fillOpacity={1}
                    fill={`url(#color${dataKey})`}
                />
            </AreaChart>
        </ResponsiveContainer>
    );
}

export default ActivityChart;
