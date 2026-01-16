/**
 * PAGINATION COMPONENT
 */

import './Pagination.css';

function Pagination({ pagination, onPageChange }) {
    if (!pagination || pagination.totalPages <= 1) return null;

    const { page, totalPages, hasNext, hasPrev } = pagination;

    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 5;
        let start = Math.max(1, page - Math.floor(maxVisible / 2));
        let end = Math.min(totalPages, start + maxVisible - 1);

        if (end - start < maxVisible - 1) {
            start = Math.max(1, end - maxVisible + 1);
        }

        for (let i = start; i <= end; i++) {
            pages.push(i);
        }
        return pages;
    };

    return (
        <div className="pagination">
            <button
                className="page-btn"
                onClick={() => onPageChange(page - 1)}
                disabled={!hasPrev}
            >
                ← Prev
            </button>

            <div className="page-numbers">
                {getPageNumbers().map((p) => (
                    <button
                        key={p}
                        className={`page-num ${p === page ? 'active' : ''}`}
                        onClick={() => onPageChange(p)}
                    >
                        {p}
                    </button>
                ))}
            </div>

            <button
                className="page-btn"
                onClick={() => onPageChange(page + 1)}
                disabled={!hasNext}
            >
                Next →
            </button>
        </div>
    );
}

export default Pagination;
