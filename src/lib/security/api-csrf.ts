/**
 * API Route CSRF Protection
 * Direct implementation for API routes when middleware isn't working
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateCSRFToken, getCSRFTokenFromRequest } from './csrf';
import { createSecureAPIResponse } from './headers';

/**
 * CSRF validation for API routes
 * Call this at the beginning of API route handlers that need CSRF protection
 */
export async function validateCSRFForAPI(request: NextRequest): Promise<NextResponse | null> {
  const method = request.method;
  const pathname = request.nextUrl?.pathname || '';

  console.log('🔒 API CSRF validation for:', method, pathname);

  // Skip CSRF validation for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    console.log('Safe method, skipping CSRF validation');
    return null; // null means validation passed
  }

  // Skip CSRF validation for specific endpoints only
  const exactExemptPaths = ['/api/csrf']; // Exact matches
  const prefixExemptPaths = ['/api/auth/']; // Prefix matches for auth routes

  const isExactExempt = exactExemptPaths.includes(pathname);
  const isPrefixExempt = prefixExemptPaths.some(prefix => pathname.startsWith(prefix));

  if (isExactExempt || isPrefixExempt) {
    console.log('Exempt path, skipping CSRF validation:', pathname, isExactExempt ? '(exact)' : '(prefix)');
    return null; // null means validation passed
  }

  // Extract CSRF token from request
  const rawHeaderToken = request.headers.get('x-csrf-token');
  const headerToken = rawHeaderToken ? decodeURIComponent(rawHeaderToken) : null;
  const cookieToken = getCSRFTokenFromRequest(request);
  const token = headerToken || cookieToken;

  console.log('CSRF token from header:', headerToken ? `present (${headerToken.substring(0, 20)}...)` : 'missing');
  console.log('CSRF token from cookie:', cookieToken ? `present (${cookieToken.substring(0, 20)}...)` : 'missing');
  console.log('Using token:', token ? `present (${token.substring(0, 20)}...)` : 'missing');
  console.log('All cookies:', request.headers.get('cookie') || 'no cookies');

  if (!token) {
    console.log('❌ CSRF token missing');
    return createSecureAPIResponse(
      {
        success: false,
        error: 'CSRF_TOKEN_MISSING',
        message: 'CSRF token is required for this request'
      },
      403
    );
  }

  // Validate CSRF token
  const validation = validateCSRFToken(token);
  console.log('CSRF token validation result:', validation);

  if (!validation.valid) {
    console.log('❌ CSRF token invalid:', validation.reason);
    return createSecureAPIResponse(
      {
        success: false,
        error: 'CSRF_TOKEN_INVALID',
        message: `CSRF token validation failed: ${validation.reason}`
      },
      403
    );
  }

  console.log('✅ CSRF validation passed');
  return null; // null means validation passed
}

/**
 * Higher-order function to wrap API handlers with CSRF protection
 */
export function withCSRFProtection<T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    // Validate CSRF token
    const csrfError = await validateCSRFForAPI(request);
    if (csrfError) {
      return csrfError; // Return the CSRF error response
    }

    // CSRF validation passed, call the original handler
    return handler(request, ...args);
  };
}

/**
 * Async function version of CSRF protection wrapper
 */
export function withAsyncCSRFProtection<T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<Response>
) {
  return async (request: NextRequest, ...args: T): Promise<Response> => {
    // Validate CSRF token
    const csrfError = await validateCSRFForAPI(request);
    if (csrfError) {
      return csrfError; // Return the CSRF error response
    }

    // CSRF validation passed, call the original handler
    return handler(request, ...args);
  };
}