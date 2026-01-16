/**
 * CHARTS - BAR CHART
 * ===================
 * WHY: Reusable bar chart for block transaction counts.
 */

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const chartTheme = {
    background: '#1a1a25',
    border: 'rgba(255,255,255,0.1)',
    text: '#6b6b7b',
};

function BlockChart({ data, dataKey = 'txs', color = '#627eea', height = 200 }) {
    return (
        <ResponsiveContainer width="100%" height={height}>
            <BarChart data={data}>
                <XAxis dataKey="name" stroke={chartTheme.text} fontSize={11} />
                <YAxis stroke={chartTheme.text} fontSize={11} />
                <Tooltip
                    contentStyle={{
                        background: chartTheme.background,
                        border: `1px solid ${chartTheme.border}`,
                        borderRadius: '8px',
                    }}
                />
                <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    );
}

export default BlockChart;
