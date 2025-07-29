import { NextRequest, NextResponse } from 'next/server';

// In-memory store for rate limiting (for development/single instance)
// In production, consider using Redis for distributed rate limiting
interface RateLimitEntry {
  count: number;
  resetTime: number;
  windowStart: number;
}

class InMemoryRateLimitStore {
  private store = new Map<string, RateLimitEntry>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Cleanup expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetTime < now) {
        this.store.delete(key);
      }
    }
  }

  get(key: string): RateLimitEntry | undefined {
    return this.store.get(key);
  }

  set(key: string, value: RateLimitEntry): void {
    this.store.set(key, value);
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}

// Global store instance
const rateLimitStore = new InMemoryRateLimitStore();

export interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Maximum requests per window
  keyGenerator?: (request: NextRequest) => string; // Custom key generator
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
  onLimitReached?: (request: NextRequest, key: string) => void; // Callback when limit reached
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: Date;
  retryAfter?: number; // Seconds to wait before retry
}

export class RateLimiter {
  private config: Required<RateLimitConfig>;

  constructor(config: RateLimitConfig) {
    this.config = {
      windowMs: config.windowMs,
      maxRequests: config.maxRequests,
      keyGenerator: config.keyGenerator || this.defaultKeyGenerator,
      skipSuccessfulRequests: config.skipSuccessfulRequests || false,
      skipFailedRequests: config.skipFailedRequests || false,
      onLimitReached: config.onLimitReached || (() => {})
    };
  }

  private defaultKeyGenerator(request: NextRequest): string {
    // Use IP address as default identifier
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ip = forwarded?.split(',')[0] || realIp || request.ip || 'unknown';
    return `${ip}:${request.nextUrl.pathname}`;
  }

  async checkLimit(request: NextRequest): Promise<RateLimitResult> {
    const key = this.config.keyGenerator(request);
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    let entry = rateLimitStore.get(key);

    // Initialize or reset if window expired
    if (!entry || entry.windowStart < windowStart) {
      entry = {
        count: 0,
        resetTime: now + this.config.windowMs,
        windowStart: now
      };
    }

    // Check if limit exceeded
    if (entry.count >= this.config.maxRequests) {
      this.config.onLimitReached(request, key);
      
      return {
        success: false,
        limit: this.config.maxRequests,
        remaining: 0,
        reset: new Date(entry.resetTime),
        retryAfter: Math.ceil((entry.resetTime - now) / 1000)
      };
    }

    // Increment counter
    entry.count++;
    rateLimitStore.set(key, entry);

    return {
      success: true,
      limit: this.config.maxRequests,
      remaining: this.config.maxRequests - entry.count,
      reset: new Date(entry.resetTime)
    };
  }

  // Method to decrement counter (for successful requests if skipSuccessfulRequests is true)
  async decrementCounter(request: NextRequest): Promise<void> {
    if (!this.config.skipSuccessfulRequests) return;

    const key = this.config.keyGenerator(request);
    const entry = rateLimitStore.get(key);
    
    if (entry && entry.count > 0) {
      entry.count--;
      rateLimitStore.set(key, entry);
    }
  }
}

// Pre-configured rate limiters for different use cases
export const rateLimiters = {
  // General API rate limiting
  api: new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100, // 100 requests per 15 minutes
    keyGenerator: (request) => {
      const forwarded = request.headers.get('x-forwarded-for');
      const realIp = request.headers.get('x-real-ip');
      const ip = forwarded?.split(',')[0] || realIp || request.ip || 'unknown';
      return `api:${ip}`;
    }
  }),

  // File upload rate limiting (more restrictive)
  upload: new RateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10, // 10 uploads per hour
    keyGenerator: (request) => {
      const forwarded = request.headers.get('x-forwarded-for');
      const realIp = request.headers.get('x-real-ip');
      const ip = forwarded?.split(',')[0] || realIp || request.ip || 'unknown';
      return `upload:${ip}`;
    }
  }),

  // Login attempt rate limiting
  login: new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 login attempts per 15 minutes
    keyGenerator: (request) => {
      const forwarded = request.headers.get('x-forwarded-for');
      const realIp = request.headers.get('x-real-ip');
      const ip = forwarded?.split(',')[0] || realIp || request.ip || 'unknown';
      return `login:${ip}`;
    },
    onLimitReached: (request, key) => {
      console.warn(`Rate limit exceeded for login attempts from ${key}`);
    }
  }),

  // User-specific rate limiting (requires authentication)
  user: new RateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 1000, // 1000 requests per hour per user
    keyGenerator: (request) => {
      // This will be set by the middleware after authentication
      const userId = (request as unknown as { userId?: string }).userId;
      return userId ? `user:${userId}` : `anonymous:${request.ip || 'unknown'}`;
    }
  })
};

// Rate limiting middleware factory
export function createRateLimitMiddleware(limiter: RateLimiter) {
  return async (request: NextRequest): Promise<NextResponse | null> => {
    try {
      const result = await limiter.checkLimit(request);

      if (!result.success) {
        const response = NextResponse.json(
          {
            success: false,
            error: 'Too Many Requests',
            message: 'Rate limit exceeded. Please try again later.',
            retryAfter: result.retryAfter
          },
          { status: 429 }
        );

        // Add rate limit headers
        response.headers.set('X-RateLimit-Limit', result.limit.toString());
        response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
        response.headers.set('X-RateLimit-Reset', result.reset.toISOString());
        
        if (result.retryAfter) {
          response.headers.set('Retry-After', result.retryAfter.toString());
        }

        return response;
      }

      return null; // Continue to next middleware/handler
    } catch (error) {
      console.error('Rate limiting error:', error);
      return null; // Continue on rate limiting errors
    }
  };
}

// Utility function to add rate limit headers to successful responses
export function addRateLimitHeaders(response: NextResponse, result: RateLimitResult): void {
  response.headers.set('X-RateLimit-Limit', result.limit.toString());
  response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
  response.headers.set('X-RateLimit-Reset', result.reset.toISOString());
}

// Rate limiting decorator for API route handlers
export function withRateLimit(limiter: RateLimiter) {
  return function <T extends unknown[]>(
    handler: (...args: T) => Promise<NextResponse> | NextResponse
  ) {
    return async (...args: T): Promise<NextResponse> => {
      const request = args[0] as NextRequest;
      
      try {
        const result = await limiter.checkLimit(request);

        if (!result.success) {
          const response = NextResponse.json(
            {
              success: false,
              error: 'Too Many Requests',
              message: 'Rate limit exceeded. Please try again later.',
              retryAfter: result.retryAfter
            },
            { status: 429 }
          );

          addRateLimitHeaders(response, result);
          return response;
        }

        // Execute the original handler
        const response = await handler(...args);
        
        // Add rate limit headers to successful responses
        if (response instanceof NextResponse) {
          addRateLimitHeaders(response, result);
        }

        return response;
      } catch (error) {
        console.error('Rate limiting error:', error);
        // Continue with original handler if rate limiting fails
        return await handler(...args);
      }
    };
  };
}

// Clean up function for graceful shutdown
export function cleanup(): void {
  rateLimitStore.destroy();
}

// Export types
export type { RateLimitConfig, RateLimitResult };