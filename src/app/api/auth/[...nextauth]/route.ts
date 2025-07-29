import { handlers } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimiters, addRateLimitHeaders } from '@/lib/rate-limit';

// Wrap GET handler (for auth status checks)
export async function GET(request: NextRequest) {
  try {
    // Apply general API rate limiting for auth status checks
    const apiRateLimit = await rateLimiters.api.checkLimit(request);
    if (!apiRateLimit.success) {
      const response = NextResponse.json(
        {
          success: false,
          error: 'Too Many Requests',
          message: 'API rate limit exceeded. Please try again later.',
          retryAfter: apiRateLimit.retryAfter
        },
        { status: 429 }
      );
      addRateLimitHeaders(response, apiRateLimit);
      return response;
    }

    // Call original NextAuth GET handler
    const response = await handlers.GET(request);
    
    // Add rate limit headers to response if it's a NextResponse
    if (response instanceof NextResponse) {
      addRateLimitHeaders(response, apiRateLimit);
    }
    
    return response;
  } catch (error) {
    console.error('Auth GET handler error:', error);
    // Fallback to original handler if rate limiting fails
    return handlers.GET(request);
  }
}

// Wrap POST handler (for login attempts)
export async function POST(request: NextRequest) {
  try {
    // Apply login rate limiting for POST requests (login attempts)
    const loginRateLimit = await rateLimiters.login.checkLimit(request);
    if (!loginRateLimit.success) {
      const response = NextResponse.json(
        {
          error: 'CredentialsSignin',
          message: 'Too many login attempts. Please try again later.',
          retryAfter: loginRateLimit.retryAfter
        },
        { status: 429 }
      );
      addRateLimitHeaders(response, loginRateLimit);
      return response;
    }

    // Call original NextAuth POST handler
    const response = await handlers.POST(request);
    
    // Add rate limit headers to response if it's a NextResponse
    if (response instanceof NextResponse) {
      addRateLimitHeaders(response, loginRateLimit);
    }
    
    return response;
  } catch (error) {
    console.error('Auth POST handler error:', error);
    // Fallback to original handler if rate limiting fails
    return handlers.POST(request);
  }
}