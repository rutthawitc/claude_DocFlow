/**
 * Security Test API Endpoint
 * For testing CSRF protection and security headers
 */

import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { createSecureAPIResponse } from '@/lib/security/headers';
import { validateCSRFForAPI } from '@/lib/security/api-csrf';

/**
 * GET /api/security-test
 * Test endpoint for security headers (no CSRF required)
 */
export async function GET(request: NextRequest) {
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

    return createSecureAPIResponse(
      {
        success: true,
        data: {
          message: 'Security headers test successful',
          user: session.user.id,
          timestamp: new Date().toISOString(),
          headers: {
            'content-security-policy': 'Applied via middleware',
            'x-frame-options': 'DENY (API route)',
            'x-content-type-options': 'nosniff',
            'referrer-policy': 'no-referrer',
          }
        },
        message: 'GET request completed successfully'
      },
      200
    );
  } catch (error) {
    console.error('Security test error:', error);
    
    return createSecureAPIResponse(
      {
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Security test failed'
      },
      500
    );
  }
}

/**
 * POST /api/security-test
 * Test endpoint for CSRF protection (CSRF token required)
 */
export async function POST(request: NextRequest) {
  try {
    // Validate CSRF token first
    const csrfError = await validateCSRFForAPI(request);
    if (csrfError) {
      console.log('❌ CSRF validation failed for /api/security-test POST');
      return csrfError;
    }

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
    const { testData } = body;

    return createSecureAPIResponse(
      {
        success: true,
        data: {
          message: 'CSRF protection test successful',
          user: session.user.id,
          testData: testData || 'No test data provided',
          timestamp: new Date().toISOString(),
          security: {
            csrfProtection: 'PASSED - Token validated by middleware',
            rateLimiting: 'ACTIVE',
            securityHeaders: 'APPLIED'
          }
        },
        message: 'POST request with CSRF protection completed successfully'
      },
      200
    );
  } catch (error) {
    console.error('Security test error:', error);
    
    return createSecureAPIResponse(
      {
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Security test failed'
      },
      500
    );
  }
}

/**
 * PUT /api/security-test
 * Test endpoint for CSRF protection with different method
 */
export async function PUT(request: NextRequest) {
  try {
    // Validate CSRF token first
    const csrfError = await validateCSRFForAPI(request);
    if (csrfError) {
      console.log('❌ CSRF validation failed for /api/security-test PUT');
      return csrfError;
    }

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

    return createSecureAPIResponse(
      {
        success: true,
        data: {
          message: 'CSRF protection PUT test successful',
          user: session.user.id,
          requestBody: body,
          timestamp: new Date().toISOString(),
          security: {
            method: 'PUT',
            csrfRequired: true,
            csrfStatus: 'VALIDATED'
          }
        },
        message: 'PUT request with CSRF protection completed successfully'
      },
      200
    );
  } catch (error) {
    console.error('Security test PUT error:', error);
    
    return createSecureAPIResponse(
      {
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Security PUT test failed'
      },
      500
    );
  }
}

/**
 * DELETE /api/security-test
 * Test endpoint for CSRF protection with DELETE method
 */
export async function DELETE(request: NextRequest) {
  try {
    // Validate CSRF token first
    const csrfError = await validateCSRFForAPI(request);
    if (csrfError) {
      console.log('❌ CSRF validation failed for /api/security-test DELETE');
      return csrfError;
    }

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

    return createSecureAPIResponse(
      {
        success: true,
        data: {
          message: 'CSRF protection DELETE test successful',
          user: session.user.id,
          timestamp: new Date().toISOString(),
          security: {
            method: 'DELETE',
            csrfRequired: true,
            csrfStatus: 'VALIDATED'
          }
        },
        message: 'DELETE request with CSRF protection completed successfully'
      },
      200
    );
  } catch (error) {
    console.error('Security test DELETE error:', error);
    
    return createSecureAPIResponse(
      {
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Security DELETE test failed'
      },
      500
    );
  }
}