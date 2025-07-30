/**
 * CSRF Diagnostic Endpoint
 * Simple endpoint to check if CSRF protection is working (using direct API validation)
 */

import { NextRequest } from 'next/server';
import { createSecureAPIResponse } from '@/lib/security/headers';
import { validateCSRFForAPI } from '@/lib/security/api-csrf';

/**
 * POST /api/csrf-check
 * Minimal endpoint for CSRF testing - if this succeeds without a token, CSRF is broken
 */
export async function POST(request: NextRequest) {
  console.log('🔒 csrf-check endpoint reached - validating CSRF...');
  
  // Validate CSRF token directly in the API route
  const csrfError = await validateCSRFForAPI(request);
  if (csrfError) {
    console.log('❌ CSRF validation failed, returning error');
    return csrfError;
  }
  
  console.log('✅ CSRF validation passed, processing request');
  
  try {
    return createSecureAPIResponse(
      {
        success: true,
        data: {
          message: 'CSRF protection is working correctly! This request had a valid token.',
          timestamp: new Date().toISOString(),
          csrfStatus: 'VALIDATED',
          headers: {
            'x-csrf-token': request.headers.get('x-csrf-token') ? 'present' : 'missing'
          }
        }
      },
      200
    );
  } catch (error) {
    return createSecureAPIResponse(
      {
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Test failed'
      },
      500
    );
  }
}