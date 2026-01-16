/**
 * DATA TABLE COMPONENT
 * =====================
 * WHY: Reusable table for displaying blocks, transactions, etc.
 * Handles custom column rendering and empty states.
 */

import './DataTable.css';

function DataTable({ columns, data, loading, emptyMessage = 'No data found' }) {
    if (loading) {
        return (
            <div className="data-table-container glass">
                <div className="table-loading">
                    <div className="skeleton-row" />
                    <div className="skeleton-row" />
                    <div className="skeleton-row" />
                    <div className="skeleton-row" />
                    <div className="skeleton-row" />
                </div>
            </div>
        );
    }

    return (
        <div className="data-table-container glass">
            <table className="data-table">
                <thead>
                    <tr>
                        {columns.map((col) => (
                            <th key={col.key} style={{ width: col.width }}>
                                {col.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.length > 0 ? (
                        data.map((row, idx) => (
                            <tr key={row.id || idx} className="animate-fadeIn">
                                {columns.map((col) => (
                                    <td key={col.key} className={col.className}>
                                        {col.render ? col.render(row[col.key], row) : row[col.key]}
                                    </td>
                                ))}
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={columns.length} className="empty-cell">
                                {emptyMessage}
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}

export default DataTable;
