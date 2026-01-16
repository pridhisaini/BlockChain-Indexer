/**
 * ERROR MESSAGE COMPONENT
 */

import './ErrorMessage.css';

function ErrorMessage({ message, onRetry }) {
    return (
        <div className="error-message">
            <span className="error-icon">⚠️</span>
            <p>{message}</p>
            {onRetry && (
                <button className="retry-btn" onClick={onRetry}>
                    Try Again
                </button>
            )}
        </div>
    );
}

export default ErrorMessage;
