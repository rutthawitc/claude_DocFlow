import { RedisService } from './redis-config';
import { SystemSettingsService } from '@/lib/services/system-settings-service';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  compress?: boolean; // Whether to compress the data
  tags?: string[]; // Cache tags for invalidation
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  hitRate: number;
}

class CacheService {
  private static instance: CacheService;
  private redis: RedisService;
  private fallbackCache: Map<string, { data: any; expires: number; tags: string[] }>;
  private stats: CacheStats;
  private defaultTTL = 300; // 5 minutes default TTL

  private constructor() {
    this.redis = RedisService.getInstance();
    this.fallbackCache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      hitRate: 0,
    };
    
    // Initialize Redis connection
    this.redis.connect().catch(error => {
      console.warn('⚠️ Redis connection failed, using fallback cache:', error.message);
    });

    // Clean up expired fallback cache entries every 5 minutes
    setInterval(() => this.cleanupFallbackCache(), 5 * 60 * 1000);
  }

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  private async isCacheEnabled(): Promise<boolean> {
    try {
      // Skip during build
      if (process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE === 'phase-production-build') {
        return false;
      }
      
      const settings = await SystemSettingsService.getAllSettings();
      return settings.cacheEnabled;
    } catch (error) {
      console.error('❌ Error checking cache settings:', error);
      return process.env.NODE_ENV !== 'production'; // Default to enabled in development
    }
  }

  private updateStats(operation: 'hit' | 'miss' | 'set' | 'delete'): void {
    this.stats[operation === 'hit' ? 'hits' : operation === 'miss' ? 'misses' : operation === 'set' ? 'sets' : 'deletes']++;
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  private compressData(data: any): string {
    // Simple JSON compression - in production, consider using actual compression
    return JSON.stringify(data);
  }

  private decompressData(data: string): any {
    try {
      return JSON.parse(data);
    } catch (error) {
      console.error('❌ Error decompressing cache data:', error);
      return null;
    }
  }

  private generateKey(key: string, prefix?: string): string {
    const baseKey = prefix ? `${prefix}:${key}` : key;
    return baseKey.replace(/[^a-zA-Z0-9:_-]/g, '_'); // Sanitize key
  }

  private generateTagKey(tag: string): string {
    return `tag:${tag}`;
  }

  async get<T>(key: string, prefix?: string): Promise<T | null> {
    const cacheEnabled = await this.isCacheEnabled();
    if (!cacheEnabled) {
      return null;
    }

    const fullKey = this.generateKey(key, prefix);
    
    try {
      // Try Redis first
      const redisClient = this.redis.getClient();
      if (redisClient) {
        const data = await redisClient.get(fullKey);
        if (data !== null) {
          this.updateStats('hit');
          return this.decompressData(data);
        }
      }

      // Fallback to in-memory cache
      const fallbackData = this.fallbackCache.get(fullKey);
      if (fallbackData && fallbackData.expires > Date.now()) {
        this.updateStats('hit');
        return fallbackData.data;
      }

      // Clean up expired fallback entry
      if (fallbackData) {
        this.fallbackCache.delete(fullKey);
      }

      this.updateStats('miss');
      return null;
    } catch (error) {
      console.error('❌ Error getting cache data:', error);
      this.updateStats('miss');
      return null;
    }
  }

  async set<T>(
    key: string, 
    data: T, 
    options: CacheOptions = {},
    prefix?: string
  ): Promise<boolean> {
    const cacheEnabled = await this.isCacheEnabled();
    if (!cacheEnabled) {
      return false;
    }

    const fullKey = this.generateKey(key, prefix);
    const ttl = options.ttl || this.defaultTTL;
    const tags = options.tags || [];

    try {
      const serializedData = this.compressData(data);
      
      // Try Redis first
      const redisClient = this.redis.getClient();
      if (redisClient) {
        await redisClient.setex(fullKey, ttl, serializedData);
        
        // Set tag mappings for cache invalidation
        for (const tag of tags) {
          const tagKey = this.generateTagKey(tag);
          await redisClient.sadd(tagKey, fullKey);
          await redisClient.expire(tagKey, ttl);
        }
        
        this.updateStats('set');
        return true;
      }

      // Fallback to in-memory cache
      this.fallbackCache.set(fullKey, {
        data,
        expires: Date.now() + (ttl * 1000),
        tags,
      });
      
      this.updateStats('set');
      return true;
    } catch (error) {
      console.error('❌ Error setting cache data:', error);
      return false;
    }
  }

  async delete(key: string, prefix?: string): Promise<boolean> {
    const fullKey = this.generateKey(key, prefix);
    
    try {
      let deleted = false;
      
      // Try Redis first
      const redisClient = this.redis.getClient();
      if (redisClient) {
        const result = await redisClient.del(fullKey);
        deleted = result > 0;
      }

      // Also delete from fallback cache
      if (this.fallbackCache.has(fullKey)) {
        this.fallbackCache.delete(fullKey);
        deleted = true;
      }

      if (deleted) {
        this.updateStats('delete');
      }
      
      return deleted;
    } catch (error) {
      console.error('❌ Error deleting cache data:', error);
      return false;
    }
  }

  async invalidateByTag(tag: string): Promise<number> {
    try {
      let deletedCount = 0;
      
      // Try Redis first
      const redisClient = this.redis.getClient();
      if (redisClient) {
        const tagKey = this.generateTagKey(tag);
        const keys = await redisClient.smembers(tagKey);
        
        if (keys.length > 0) {
          const pipeline = redisClient.pipeline();
          keys.forEach(key => pipeline.del(key));
          pipeline.del(tagKey); // Remove the tag set itself
          await pipeline.exec();
          deletedCount += keys.length;
        }
      }

      // Also invalidate from fallback cache
      for (const [key, entry] of this.fallbackCache.entries()) {
        if (entry.tags.includes(tag)) {
          this.fallbackCache.delete(key);
          deletedCount++;
        }
      }

      if (deletedCount > 0) {
        console.log(`🗑️ Invalidated ${deletedCount} cache entries with tag: ${tag}`);
      }
      
      return deletedCount;
    } catch (error) {
      console.error('❌ Error invalidating cache by tag:', error);
      return 0;
    }
  }

  async clear(): Promise<boolean> {
    try {
      // Clear Redis cache
      const redisClient = this.redis.getClient();
      if (redisClient) {
        await redisClient.flushdb();
      }

      // Clear fallback cache
      this.fallbackCache.clear();
      
      // Reset stats
      this.stats = {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        hitRate: 0,
      };

      console.log('🗑️ Cache cleared successfully');
      return true;
    } catch (error) {
      console.error('❌ Error clearing cache:', error);
      return false;
    }
  }

  async exists(key: string, prefix?: string): Promise<boolean> {
    const fullKey = this.generateKey(key, prefix);
    
    try {
      // Check Redis first
      const redisClient = this.redis.getClient();
      if (redisClient) {
        const exists = await redisClient.exists(fullKey);
        if (exists) return true;
      }

      // Check fallback cache
      const fallbackData = this.fallbackCache.get(fullKey);
      return fallbackData ? fallbackData.expires > Date.now() : false;
    } catch (error) {
      console.error('❌ Error checking cache existence:', error);
      return false;
    }
  }

  async getStats(): Promise<CacheStats & { redisConnected: boolean; fallbackSize: number }> {
    return {
      ...this.stats,
      redisConnected: this.redis.isReady(),
      fallbackSize: this.fallbackCache.size,
    };
  }

  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    options: CacheOptions = {},
    prefix?: string
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key, prefix);
    if (cached !== null) {
      return cached;
    }

    // If not in cache, fetch the data
    const data = await fetchFn();
    
    // Store in cache for next time
    await this.set(key, data, options, prefix);
    
    return data;
  }

  private cleanupFallbackCache(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of this.fallbackCache.entries()) {
      if (entry.expires <= now) {
        this.fallbackCache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} expired fallback cache entries`);
    }
  }

  // Wrapper for database queries with automatic caching
  async withCache<T>(
    cacheKey: string,
    queryFn: () => Promise<T>,
    options: CacheOptions & { prefix?: string } = {}
  ): Promise<T> {
    const { prefix, ...cacheOptions } = options;
    return this.getOrSet(cacheKey, queryFn, cacheOptions, prefix);
  }
}

export default CacheService;
export { CacheService };