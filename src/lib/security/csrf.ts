/**
 * CSRF Protection Utility
 * Provides Cross-Site Request Forgery protection for Next.js application
 */

import { createHash, randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

export interface CSRFConfig {
  secretKey: string;
  tokenLength: number;
  cookieName: string;
  headerName: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  maxAge: number;
  exemptPaths: string[];
  exemptMethods: string[];
}

const DEFAULT_CONFIG: CSRFConfig = {
  secretKey: process.env.AUTH_SECRET || 'fallback-secret-key',
  tokenLength: 32,
  cookieName: '_csrf_token',
  headerName: 'x-csrf-token', 
  secure: process.env.NODE_ENV === 'production',
  httpOnly: false, // Must be false to allow JavaScript access
  sameSite: 'strict',
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  exemptPaths: [
    '/api/auth/signin',
    '/api/auth/signout', 
    '/api/auth/callback',
    '/api/auth/session',
    '/api/auth/csrf',
    '/api/csrf'
  ],
  exemptMethods: ['GET', 'HEAD', 'OPTIONS']
};

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCSRFToken(config: CSRFConfig = DEFAULT_CONFIG): string {
  const timestamp = Date.now().toString();
  const randomData = randomBytes(config.tokenLength).toString('hex');
  const tokenData = `${timestamp}:${randomData}`;
  
  // Create HMAC signature
  const signature = createHash('sha256')
    .update(`${config.secretKey}:${tokenData}`)
    .digest('hex');
    
  return `${tokenData}:${signature}`;
}

/**
 * Validate a CSRF token
 */
export function validateCSRFToken(
  token: string, 
  config: CSRFConfig = DEFAULT_CONFIG
): { valid: boolean; reason?: string } {
  if (!token) {
    return { valid: false, reason: 'No CSRF token provided' };
  }

  const parts = token.split(':');
  if (parts.length !== 3) {
    return { valid: false, reason: 'Invalid token format' };
  }

  const [timestamp, randomData, signature] = parts;
  const tokenData = `${timestamp}:${randomData}`;
  
  // Verify signature
  const expectedSignature = createHash('sha256')
    .update(`${config.secretKey}:${tokenData}`)
    .digest('hex');
    
  if (signature !== expectedSignature) {
    return { valid: false, reason: 'Invalid token signature' };
  }

  // Check token age
  const tokenTime = parseInt(timestamp);
  const currentTime = Date.now();
  
  if (currentTime - tokenTime > config.maxAge) {
    return { valid: false, reason: 'Token expired' };
  }

  return { valid: true };
}

/**
 * Extract CSRF token from request (header or body)
 */
function extractCSRFToken(request: NextRequest): string | null {
  const config = DEFAULT_CONFIG;
  
  // Check header first
  const headerToken = request.headers.get(config.headerName);
  if (headerToken) {
    return headerToken;
  }

  // Check form data for non-JSON requests
  const contentType = request.headers.get('content-type');
  if (contentType?.includes('application/x-www-form-urlencoded')) {
    // We'll need to parse form data (implementation depends on specific needs)
    // For now, focus on header-based tokens
  }

  return null;
}

/**
 * Check if a path is exempt from CSRF protection
 */
function isExemptPath(pathname: string, config: CSRFConfig = DEFAULT_CONFIG): boolean {
  return config.exemptPaths.some(exemptPath => 
    pathname.startsWith(exemptPath)
  );
}

/**
 * Check if a method is exempt from CSRF protection
 */
function isExemptMethod(method: string, config: CSRFConfig = DEFAULT_CONFIG): boolean {
  return config.exemptMethods.includes(method.toUpperCase());
}

/**
 * CSRF protection middleware for API routes
 */
export function validateCSRFMiddleware(
  request: NextRequest,
  config: CSRFConfig = DEFAULT_CONFIG
): { valid: boolean; response?: NextResponse } {
  const { pathname } = request.nextUrl;
  const method = request.method;

  console.log('CSRF validation for:', method, pathname);

  // Skip CSRF validation for exempt paths and methods
  if (isExemptPath(pathname, config) || isExemptMethod(method, config)) {
    console.log('Path/method exempt from CSRF:', pathname, method);
    return { valid: true };
  }

  // Extract token from request
  const token = extractCSRFToken(request);
  console.log('Extracted CSRF token:', token ? 'present' : 'missing');
  
  if (!token) {
    return {
      valid: false,
      response: NextResponse.json(
        {
          success: false,
          error: 'CSRF_TOKEN_MISSING',
          message: 'CSRF token is required for this request'
        },
        { status: 403 }
      )
    };
  }

  // Validate token
  const validation = validateCSRFToken(token, config);
  
  if (!validation.valid) {
    return {
      valid: false,
      response: NextResponse.json(
        {
          success: false,
          error: 'CSRF_TOKEN_INVALID',
          message: `CSRF token validation failed: ${validation.reason}`
        },
        { status: 403 }
      )
    };
  }

  return { valid: true };
}

/**
 * Set CSRF token cookie in response
 */
export function setCSRFTokenCookie(
  response: NextResponse, 
  token?: string,
  config: CSRFConfig = DEFAULT_CONFIG
): NextResponse {
  const csrfToken = token || generateCSRFToken(config);
  
  response.cookies.set(config.cookieName, csrfToken, {
    httpOnly: config.httpOnly,
    secure: config.secure,
    sameSite: config.sameSite,
    maxAge: Math.floor(config.maxAge / 1000), // Convert to seconds
    path: '/'
  });

  return response;
}

/**
 * Get CSRF token from cookies (server-side)
 */
export function getCSRFTokenFromCookies(): string | null {
  const config = DEFAULT_CONFIG;
  
  try {
    const headersList = headers();
    const cookieHeader = headersList.get('cookie');
    
    if (!cookieHeader) {
      return null;
    }

    const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);

    return cookies[config.cookieName] || null;
  } catch (error) {
    console.error('Error getting CSRF token from cookies:', error);
    return null;
  }
}

/**
 * Get CSRF token from request cookies
 */
export function getCSRFTokenFromRequest(request: NextRequest): string | null {
  const config = DEFAULT_CONFIG;
  return request.cookies.get(config.cookieName)?.value || null;
}

/**
 * Utility class for CSRF protection
 */
export class CSRFProtection {
  private config: CSRFConfig;

  constructor(config: Partial<CSRFConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  generateToken(): string {
    return generateCSRFToken(this.config);
  }

  validateToken(token: string): { valid: boolean; reason?: string } {
    return validateCSRFToken(token, this.config);
  }

  validateRequest(request: NextRequest): { valid: boolean; response?: NextResponse } {
    return validateCSRFMiddleware(request, this.config);
  }

  setTokenCookie(response: NextResponse, token?: string): NextResponse {
    return setCSRFTokenCookie(response, token, this.config);
  }

  getTokenFromRequest(request: NextRequest): string | null {
    return getCSRFTokenFromRequest(request);
  }
}

// Export default instance
export const csrf = new CSRFProtection();