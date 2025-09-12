/**
 * CSRF Token API Endpoint
 * Provides CSRF tokens to authenticated clients
 */

import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { csrf } from '@/lib/security/csrf';
import { createSecureAPIResponse } from '@/lib/security/headers';

/**
 * GET /api/csrf
 * Returns a new CSRF token for the authenticated user
 */
export async function GET() {
  try {
    // Check if user is authenticated
    const session = await auth();
    
    if (!session) {
      return createSecureAPIResponse(
        {
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Authentication required to obtain CSRF token'
        },
        401
      );
    }

    // Generate new CSRF token
    const token = csrf.generateToken();

    // Create response with token
    const response = createSecureAPIResponse(
      {
        success: true,
        data: {
          csrfToken: token,
        },
        message: 'CSRF token generated successfully'
      },
      200
    );

    // Set token in cookie
    csrf.setTokenCookie(response, token);

    return response;
  } catch (error) {
    console.error('CSRF token generation error:', error);
    
    return createSecureAPIResponse(
      {
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to generate CSRF token'
      },
      500
    );
  }
}

/**
 * POST /api/csrf/validate
 * Validates a CSRF token (for testing purposes)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session) {
      return createSecureAPIResponse(
        {
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Authentication required'
        },
        401
      );
    }

    const body = await request.json();
    const { token } = body;

    if (!token) {
      return createSecureAPIResponse(
        {
          success: false,
          error: 'MISSING_TOKEN',
          message: 'CSRF token is required'
        },
        400
      );
    }

    const validation = csrf.validateToken(token);

    return createSecureAPIResponse(
      {
        success: validation.valid,
        data: {
          valid: validation.valid,
          reason: validation.reason
        },
        message: validation.valid ? 'Token is valid' : 'Token validation failed'
      },
      validation.valid ? 200 : 400
    );
  } catch (error) {
    console.error('CSRF token validation error:', error);
    
    return createSecureAPIResponse(
      {
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to validate CSRF token'
      },
      500
    );
  }
}