/**
 * RESPONSE HELPERS UTILITY
 * ========================
 * WHY: Standardizes API response formats across all endpoints.
 * Ensures consistent error handling and response structure.
 * Makes it easy to add common metadata (pagination, timestamps).
 */

/**
 * Send a successful response
 */
export function successResponse(res, data, statusCode = 200) {
    return res.status(statusCode).json({
        success: true,
        data,
        timestamp: new Date().toISOString(),
    });
}

/**
 * Send a paginated response
 */
export function paginatedResponse(res, data, pagination) {
    return res.status(200).json({
        success: true,
        data,
        pagination: {
            page: pagination.page,
            limit: pagination.limit,
            total: pagination.total,
            totalPages: Math.ceil(pagination.total / pagination.limit),
            hasNext: pagination.page * pagination.limit < pagination.total,
            hasPrev: pagination.page > 1,
        },
        timestamp: new Date().toISOString(),
    });
}

/**
 * Send an error response
 */
export function errorResponse(res, message, statusCode = 500, errors = null) {
    const response = {
        success: false,
        error: {
            message,
            code: statusCode,
        },
        timestamp: new Date().toISOString(),
    };

    if (errors) {
        response.error.details = errors;
    }

    return res.status(statusCode).json(response);
}

/**
 * Common HTTP error helpers
 */
export const HttpErrors = {
    badRequest: (res, message = 'Bad request', errors = null) =>
        errorResponse(res, message, 400, errors),

    notFound: (res, message = 'Resource not found') =>
        errorResponse(res, message, 404),

    serverError: (res, message = 'Internal server error') =>
        errorResponse(res, message, 500),

    validationError: (res, errors) =>
        errorResponse(res, 'Validation failed', 400, errors),
};

export default { successResponse, paginatedResponse, errorResponse, HttpErrors };
