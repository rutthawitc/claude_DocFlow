import { NextResponse } from 'next/server';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  code?: string;
  retryAfter?: number;
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

export interface ApiErrorOptions {
  code?: string;
  details?: unknown;
  retryAfter?: number;
}

/**
 * Standardized API response patterns
 * Eliminates inconsistent error handling across API routes
 */
export class ApiResponseHandler {
  
  /**
   * Create success response
   */
  static success<T>(
    data?: T, 
    message?: string, 
    statusCode = 200,
    additionalFields?: Partial<ApiResponse<T>>
  ): NextResponse {
    return NextResponse.json({
      success: true,
      data,
      message,
      ...additionalFields
    }, { status: statusCode });
  }

  /**
   * Create paginated success response
   */
  static successPaginated<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
    message?: string
  ): NextResponse {
    const totalPages = Math.ceil(total / limit);
    
    return NextResponse.json({
      success: true,
      data: {
        data,
        total,
        page,
        limit,
        totalPages
      },
      message
    });
  }

  /**
   * Create error response
   */
  static error(
    message: string,
    statusCode = 500,
    options: ApiErrorOptions = {}
  ): NextResponse {
    const response: ApiResponse = {
      success: false,
      error: message
    };

    if (options.code) response.code = options.code;
    if (options.details) response.data = options.details;
    if (options.retryAfter) response.retryAfter = options.retryAfter;

    return NextResponse.json(response, { status: statusCode });
  }

  /**
   * Unauthorized response (401)
   */
  static unauthorized(message = 'Authentication required', code = 'UNAUTHORIZED'): NextResponse {
    return this.error(message, 401, { code });
  }

  /**
   * Forbidden response (403)
   */
  static forbidden(message = 'Permission denied', code = 'FORBIDDEN'): NextResponse {
    return this.error(message, 403, { code });
  }

  /**
   * Not found response (404)
   */
  static notFound(message = 'Resource not found', code = 'NOT_FOUND'): NextResponse {
    return this.error(message, 404, { code });
  }

  /**
   * Bad request response (400)
   */
  static badRequest(message = 'Invalid request', code = 'BAD_REQUEST', details?: unknown): NextResponse {
    return this.error(message, 400, { code, details });
  }

  /**
   * Validation error response (422)
   */
  static validationError(message = 'Validation failed', details?: unknown): NextResponse {
    return this.error(message, 422, { code: 'VALIDATION_ERROR', details });
  }

  /**
   * Rate limit error response (429)
   */
  static rateLimited(message = 'Rate limit exceeded', retryAfter?: number): NextResponse {
    return this.error(message, 429, { 
      code: 'RATE_LIMITED', 
      retryAfter 
    });
  }

  /**
   * Internal server error response (500)
   */
  static internalError(message = 'Internal server error', code = 'INTERNAL_ERROR'): NextResponse {
    return this.error(message, 500, { code });
  }

  /**
   * Database error response
   */
  static databaseError(message = 'Database operation failed'): NextResponse {
    return this.error(message, 500, { code: 'DATABASE_ERROR' });
  }

  /**
   * File upload error response
   */
  static fileUploadError(message = 'File upload failed', details?: unknown): NextResponse {
    return this.error(message, 400, { code: 'FILE_UPLOAD_ERROR', details });
  }

  /**
   * External service error response
   */
  static externalServiceError(message = 'External service unavailable'): NextResponse {
    return this.error(message, 503, { code: 'EXTERNAL_SERVICE_ERROR' });
  }

  /**
   * Maintenance mode response
   */
  static maintenanceMode(message = 'System is under maintenance'): NextResponse {
    return this.error(message, 503, { code: 'MAINTENANCE_MODE' });
  }

  /**
   * Create response from thrown error
   */
  static fromError(error: unknown): NextResponse {
    console.error('API Error:', error);

    // Handle known error types
    if (error && typeof error === 'object') {
      const errorObj = error as Record<string, unknown>;
      
      if (errorObj.name === 'ValidationError') {
        return this.validationError(
          String(errorObj.message || 'Validation failed'), 
          errorObj.details
        );
      }

      if (errorObj.name === 'DocumentUploadError') {
        return this.fileUploadError(
          String(errorObj.message || 'File upload failed'), 
          errorObj.validationErrors
        );
      }

      if (errorObj.code === 'ECONNREFUSED') {
        return this.databaseError('Database connection failed');
      }

      // Default to internal server error with message if available
      return this.internalError(
        String(errorObj.message || 'An unexpected error occurred')
      );
    }

    // Handle primitive errors
    return this.internalError(
      typeof error === 'string' ? error : 'An unexpected error occurred'
    );
  }

  /**
   * Add rate limit headers to response
   */
  static addRateLimitHeaders(
    response: NextResponse,
    rateLimit: {
      limit: number;
      remaining: number;
      resetTime: number;
      retryAfter?: number;
    }
  ): NextResponse {
    response.headers.set('X-RateLimit-Limit', rateLimit.limit.toString());
    response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString());
    response.headers.set('X-RateLimit-Reset', rateLimit.resetTime.toString());
    
    if (rateLimit.retryAfter) {
      response.headers.set('Retry-After', rateLimit.retryAfter.toString());
    }

    return response;
  }
}

/**
 * Shorthand functions for common responses
 */
export const ApiSuccess = ApiResponseHandler.success;
export const ApiError = ApiResponseHandler.error;
export const ApiUnauthorized = ApiResponseHandler.unauthorized;
export const ApiForbidden = ApiResponseHandler.forbidden;
export const ApiNotFound = ApiResponseHandler.notFound;
export const ApiBadRequest = ApiResponseHandler.badRequest;
export const ApiValidationError = ApiResponseHandler.validationError;
export const ApiRateLimited = ApiResponseHandler.rateLimited;
export const ApiInternalError = ApiResponseHandler.internalError;

/**
 * Error handling wrapper for API routes
 * Usage: return handleApiError(error) in catch blocks
 */
export function handleApiError(error: unknown): NextResponse {
  return ApiResponseHandler.fromError(error);
}

/**
 * Async wrapper for API routes with standardized error handling
 */
export function withErrorHandling<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleApiError(error);
    }
  };
}