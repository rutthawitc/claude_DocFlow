import { NextRequest, NextResponse } from 'next/server';
import { CacheService } from './cache-service';

export interface CacheMiddlewareOptions {
  ttl?: number; // Time to live in seconds
  keyGenerator?: (req: NextRequest) => string;
  shouldCache?: (req: NextRequest, res: NextResponse) => boolean;
  tags?: string[];
  prefix?: string;
}

/**
 * Cache middleware for API routes
 * Caches GET requests based on URL and query parameters
 */
export function withCache(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>,
  options: CacheMiddlewareOptions = {}
) {
  return async (req: NextRequest, context?: any): Promise<NextResponse> => {
    const cache = CacheService.getInstance();
    
    // Only cache GET requests by default
    if (req.method !== 'GET') {
      return handler(req, context);
    }

    // Generate cache key
    const defaultKeyGenerator = (req: NextRequest) => {
      const url = new URL(req.url);
      return `${url.pathname}${url.search}`;
    };
    
    const cacheKey = options.keyGenerator ? options.keyGenerator(req) : defaultKeyGenerator(req);
    const prefix = options.prefix || 'api';

    try {
      // Try to get from cache first
      const cachedResponse = await cache.get<{
        status: number;
        headers: Record<string, string>;
        body: any;
      }>(cacheKey, prefix);

      if (cachedResponse) {
        console.log(`🎯 Cache HIT for ${cacheKey}`);
        return new NextResponse(JSON.stringify(cachedResponse.body), {
          status: cachedResponse.status,
          headers: {
            ...cachedResponse.headers,
            'X-Cache': 'HIT',
            'X-Cache-Key': cacheKey,
          },
        });
      }

      console.log(`❌ Cache MISS for ${cacheKey}`);
      
      // Execute the handler
      const response = await handler(req, context);
      
      // Check if we should cache this response
      const shouldCache = options.shouldCache ? 
        options.shouldCache(req, response) : 
        response.status === 200; // Only cache successful responses by default

      if (shouldCache && response.status < 400) {
        // Clone the response to avoid consuming the body
        const responseClone = response.clone();
        const responseBody = await responseClone.text();
        let parsedBody;
        
        try {
          parsedBody = JSON.parse(responseBody);
        } catch {
          parsedBody = responseBody;
        }

        const cacheData = {
          status: response.status,
          headers: Object.fromEntries(response.headers.entries()),
          body: parsedBody,
        };

        // Store in cache
        await cache.set(cacheKey, cacheData, {
          ttl: options.ttl || 300, // 5 minutes default
          tags: options.tags,
        }, prefix);

        console.log(`💾 Cached response for ${cacheKey}`);

        // Return original response with cache headers
        return new NextResponse(response.body, {
          status: response.status,
          headers: {
            ...Object.fromEntries(response.headers.entries()),
            'X-Cache': 'MISS',
            'X-Cache-Key': cacheKey,
          },
        });
      }

      // Return response with cache headers for non-cacheable responses
      return new NextResponse(response.body, {
        status: response.status,
        headers: {
          ...Object.fromEntries(response.headers.entries()),
          'X-Cache': 'SKIP',
        },
      });
    } catch (error) {
      console.error('❌ Cache middleware error:', error);
      // If caching fails, still return the original response
      return handler(req, context);
    }
  };
}

/**
 * Cache invalidation middleware
 * Invalidates cache entries based on tags when data is modified
 */
export function withCacheInvalidation(
  handler: (req: NextRequest) => Promise<NextResponse>,
  invalidationTags: string[] = []
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const response = await handler(req);
    
    // If the request was successful and modifies data, invalidate cache
    if (
      ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) &&
      response.status >= 200 && 
      response.status < 300 &&
      invalidationTags.length > 0
    ) {
      const cache = CacheService.getInstance();
      
      for (const tag of invalidationTags) {
        const invalidated = await cache.invalidateByTag(tag);
        if (invalidated > 0) {
          console.log(`🗑️ Invalidated ${invalidated} cache entries for tag: ${tag}`);
        }
      }
    }

    return response;
  };
}

/**
 * Combined cache middleware with automatic invalidation
 */
export function withCacheAndInvalidation(
  handler: (req: NextRequest) => Promise<NextResponse>,
  cacheOptions: CacheMiddlewareOptions = {},
  invalidationTags: string[] = []
) {
  // Combine both middlewares
  const cachedHandler = withCache(handler, cacheOptions);
  return withCacheInvalidation(cachedHandler, invalidationTags);
}

/**
 * Cache utility functions for manual cache operations
 */
export class CacheUtils {
  private static cache = CacheService.getInstance();

  /**
   * Generate a cache key for documents
   */
  static generateDocumentKey(params: {
    branchBaCode?: number;
    userId?: number;
    status?: string;
    page?: number;
    limit?: number;
  }): string {
    const keyParts = [];
    
    if (params.branchBaCode) keyParts.push(`branch:${params.branchBaCode}`);
    if (params.userId) keyParts.push(`user:${params.userId}`);
    if (params.status) keyParts.push(`status:${params.status}`);
    if (params.page) keyParts.push(`page:${params.page}`);
    if (params.limit) keyParts.push(`limit:${params.limit}`);
    
    return keyParts.join('_') || 'all';
  }

  /**
   * Generate cache tags for invalidation
   */
  static generateDocumentTags(documentId?: number, branchBaCode?: number): string[] {
    const tags = ['documents'];
    
    if (documentId) tags.push(`document:${documentId}`);
    if (branchBaCode) tags.push(`branch:${branchBaCode}`);
    
    return tags;
  }

  /**
   * Generate cache key for user data
   */
  static generateUserKey(userId: number): string {
    return `user:${userId}`;
  }

  /**
   * Generate cache tags for user invalidation
   */
  static generateUserTags(userId: number): string[] {
    return ['users', `user:${userId}`];
  }

  /**
   * Generate cache key for branch data
   */
  static generateBranchKey(identifier: string | number): string {
    return `branch:${identifier}`;
  }

  /**
   * Generate cache tags for branch invalidation
   */
  static generateBranchTags(): string[] {
    return ['branches'];
  }

  /**
   * Invalidate all document-related cache
   */
  static async invalidateDocuments(documentId?: number, branchBaCode?: number): Promise<void> {
    const tags = this.generateDocumentTags(documentId, branchBaCode);
    
    for (const tag of tags) {
      await this.cache.invalidateByTag(tag);
    }
  }

  /**
   * Invalidate user-related cache
   */
  static async invalidateUser(userId: number): Promise<void> {
    const tags = this.generateUserTags(userId);
    
    for (const tag of tags) {
      await this.cache.invalidateByTag(tag);
    }
  }

  /**
   * Invalidate branch-related cache
   */
  static async invalidateBranches(): Promise<void> {
    await this.cache.invalidateByTag('branches');
  }

  /**
   * Get cache statistics
   */
  static async getStats() {
    return this.cache.getStats();
  }

  /**
   * Clear all cache
   */
  static async clearAll(): Promise<boolean> {
    return this.cache.clear();
  }
}

/**
 * Decorator for caching method results
 */
export function cached(options: {
  ttl?: number;
  keyPrefix?: string;
  tags?: string[];
} = {}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const cache = CacheService.getInstance();

    descriptor.value = async function (...args: any[]) {
      const cacheKey = `${options.keyPrefix || propertyKey}:${JSON.stringify(args)}`;
      
      // Try to get from cache
      const cached = await cache.get(cacheKey);
      if (cached !== null) {
        return cached;
      }

      // Execute original method
      const result = await originalMethod.apply(this, args);
      
      // Store in cache
      await cache.set(cacheKey, result, {
        ttl: options.ttl || 300,
        tags: options.tags,
      });

      return result;
    };

    return descriptor;
  };
}