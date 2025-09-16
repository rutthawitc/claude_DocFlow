import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { CacheService } from '@/lib/cache/cache-service';

interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  service: string;
  version?: string;
  checks: {
    database: {
      status: 'up' | 'down';
      responseTime?: number;
      error?: string;
    };
    cache: {
      status: 'up' | 'down';
      type: 'redis' | 'memory';
      stats?: any;
      error?: string;
    };
  };
  uptime: number;
}

export async function GET() {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  const result: HealthCheckResult = {
    status: 'healthy',
    timestamp,
    service: 'DocFlow API',
    version: process.env.npm_package_version || '1.0.0',
    checks: {
      database: { status: 'down' },
      cache: { status: 'down', type: 'memory' }
    },
    uptime: process.uptime()
  };

  let hasErrors = false;

  // Check database connectivity
  try {
    const dbStart = Date.now();
    const db = await getDb();
    
    if (db) {
      // Simple query to test connectivity
      await db.execute('SELECT 1 as health_check');
      result.checks.database = {
        status: 'up',
        responseTime: Date.now() - dbStart
      };
    } else {
      throw new Error('Database connection failed');
    }
  } catch (error) {
    hasErrors = true;
    result.checks.database = {
      status: 'down',
      error: error instanceof Error ? error.message : 'Database connection failed'
    };
  }

  // Check cache connectivity
  try {
    const cache = CacheService.getInstance();
    const cacheStats = await cache.getStats();
    
    // Test cache with a simple operation
    const testKey = 'health_check_test';
    await cache.set(testKey, 'test_value', { ttl: 5 }, 'health');
    const testResult = await cache.get(testKey, 'health');
    await cache.delete(testKey, 'health');
    
    if (testResult === 'test_value') {
      result.checks.cache = {
        status: 'up',
        type: process.env.REDIS_HOST ? 'redis' : 'memory',
        stats: cacheStats
      };
    } else {
      throw new Error('Cache test operation failed');
    }
  } catch (error) {
    // Cache failure is not critical, mark as degraded instead of unhealthy
    result.checks.cache = {
      status: 'down',
      type: process.env.REDIS_HOST ? 'redis' : 'memory',
      error: error instanceof Error ? error.message : 'Cache operation failed'
    };
  }

  // Determine overall status
  if (hasErrors) {
    result.status = 'unhealthy';
  } else if (result.checks.cache.status === 'down') {
    result.status = 'degraded'; // Cache down but database up
  }

  // Return appropriate HTTP status
  const httpStatus = result.status === 'healthy' ? 200 : 
                    result.status === 'degraded' ? 200 : 503;

  return NextResponse.json(result, { 
    status: httpStatus,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
}