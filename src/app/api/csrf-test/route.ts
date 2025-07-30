/**
 * CSRF-only Test Endpoint
 * Simple endpoint for testing CSRF protection without authentication
 */

import { NextRequest } from 'next/server';
import { createSecureAPIResponse } from '@/lib/security/headers';
import { validateCSRFForAPI } from '@/lib/security/api-csrf';

/**
 * POST /api/csrf-test
 * Test endpoint that doesn't require authentication, only CSRF protection
 * This allows us to test CSRF protection in isolation
 */
export async function POST(request: NextRequest) {
  console.log('🔒 csrf-test endpoint reached - validating CSRF...');
  
  // Validate CSRF token directly in the API route
  const csrfError = await validateCSRFForAPI(request);
  if (csrfError) {
    console.log('❌ CSRF validation failed for /api/csrf-test');
    return csrfError;
  }
  
  console.log('✅ CSRF validation passed for /api/csrf-test');
  
  try {
    const body = await request.json();
    const { testData } = body;

    return createSecureAPIResponse(
      {
        success: true,
        data: {
          message: 'CSRF protection is working correctly! This request had a valid token.',
          testData: testData || 'No test data provided',
          timestamp: new Date().toISOString(),
          security: {
            csrfProtection: 'PASSED - Token validated by API',
            authRequired: false,
            endpoint: '/api/csrf-test'
          }
        },
        message: 'POST request with CSRF protection completed successfully'
      },
      200
    );
  } catch (error) {
    console.error('CSRF-only test error:', error);
    
    return createSecureAPIResponse(
      {
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: 'CSRF-only test failed'
      },
      500
    );
  }
}