import { NextResponse } from 'next/server';
import { withAuthHandler } from '@/lib/middleware/api-auth';
import { CacheService } from '@/lib/cache/cache-service';
import { RedisService } from '@/lib/cache/redis-config';
import { PDFStreamingService } from '@/lib/services/pdf-streaming-service';
import { DOCFLOW_PERMISSIONS } from '@/lib/auth/docflow-auth';

export const GET = withAuthHandler(
  async () => {

    // Get cache service instance
    const cache = CacheService.getInstance();
    const redis = RedisService.getInstance();

    // Collect cache statistics
    const cacheStats = await cache.getStats();
    const redisHealth = await redis.healthCheck();
    const redisInfo = await redis.getInfo();
    const streamingStats = await PDFStreamingService.getStreamingStats();

    const stats = {
      cache: {
        hits: cacheStats.hits,
        misses: cacheStats.misses,
        sets: cacheStats.sets,
        deletes: cacheStats.deletes,
        hitRate: cacheStats.hitRate,
        redisConnected: cacheStats.redisConnected,
        fallbackSize: cacheStats.fallbackSize,
      },
      redis: {
        connected: cacheStats.redisConnected,
        health: redisHealth,
        info: redisInfo ? {
          version: redisInfo.Server?.redis_version,
          uptime: redisInfo.Server?.uptime_in_seconds,
          memory: {
            used: redisInfo.Memory?.used_memory,
            peak: redisInfo.Memory?.used_memory_peak,
            fragmentation: redisInfo.Memory?.mem_fragmentation_ratio,
          },
          clients: {
            connected: redisInfo.Clients?.connected_clients,
            blocked: redisInfo.Clients?.blocked_clients,
          },
          stats: {
            total_connections: redisInfo.Stats?.total_connections_received,
            total_commands: redisInfo.Stats?.total_commands_processed,
            keyspace_hits: redisInfo.Stats?.keyspace_hits,
            keyspace_misses: redisInfo.Stats?.keyspace_misses,
          },
        } : null,
      },
      streaming: streamingStats,
      performance: {
        effectiveHitRate: cacheStats.hitRate,
        cacheUtilization: cacheStats.redisConnected ? 'Redis + Fallback' : 'Fallback Only',
        recommendedActions: await generateRecommendations(cacheStats, redisHealth),
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: stats,
    });
  },
  {
    requireAuth: true,
    requiredPermissions: [DOCFLOW_PERMISSIONS.ADMIN_FULL_ACCESS],
    rateLimit: 'api'
  }
);

export const DELETE = withAuthHandler(
  async (_, { user }) => {
    // Clear all cache
    const cache = CacheService.getInstance();
    const success = await cache.clear();

    if (success) {
      console.log(`🗑️ Cache cleared by admin user ${user.sessionUserId}`);
      return NextResponse.json({
        success: true,
        message: 'Cache cleared successfully',
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to clear cache' },
        { status: 500 }
      );
    }
  },
  {
    requireAuth: true,
    requiredPermissions: [DOCFLOW_PERMISSIONS.ADMIN_FULL_ACCESS],
    rateLimit: 'api'
  }
);

async function generateRecommendations(
  cacheStats: { 
    hitRate: number; 
    redisConnected: boolean; 
    fallbackSize: number; 
    hits: number; 
    misses: number; 
  },
  redisHealth: { 
    status: string; 
    latency?: number; 
  }
): Promise<string[]> {
  const recommendations: string[] = [];

  // Hit rate recommendations
  if (cacheStats.hitRate < 50) {
    recommendations.push('Cache hit rate is low. Consider increasing TTL values or reviewing cache keys.');
  } else if (cacheStats.hitRate > 90) {
    recommendations.push('Excellent cache hit rate! Cache is performing well.');
  }

  // Redis connection recommendations
  if (!cacheStats.redisConnected) {
    recommendations.push('Redis connection is down. System is using fallback cache with limited capacity.');
  } else if (redisHealth.status === 'healthy' && redisHealth.latency && redisHealth.latency > 100) {
    recommendations.push('Redis latency is high. Consider checking network or Redis server performance.');
  }

  // Fallback cache recommendations
  if (cacheStats.fallbackSize > 1000) {
    recommendations.push('Fallback cache is growing large. Consider Redis connection or increasing cleanup frequency.');
  }

  // General recommendations
  if (cacheStats.hits + cacheStats.misses > 10000) {
    recommendations.push('High cache usage detected. Monitor memory usage and consider cache size optimization.');
  }

  if (recommendations.length === 0) {
    recommendations.push('Cache system is operating normally. No immediate actions required.');
  }

  return recommendations;
}