import Redis, { RedisOptions } from 'ioredis';
import { SystemSettingsService } from '@/lib/services/system-settings-service';

interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  retryDelayOnFailover: number;
  maxRetriesPerRequest: number;
  lazyConnect: boolean;
  keyPrefix: string;
}

class RedisService {
  private static instance: RedisService;
  private redis: Redis | null = null;
  private isConnected = false;
  private connectionAttempts = 0;
  private maxConnectionAttempts = 3;

  private constructor() {}

  static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService();
    }
    return RedisService.instance;
  }

  private getRedisConfig(): RedisConfig {
    return {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keyPrefix: process.env.REDIS_KEY_PREFIX || 'docflow:',
    };
  }

  async connect(): Promise<boolean> {
    if (this.isConnected && this.redis) {
      return true;
    }

    // Skip Redis connection during build/prerender
    if (process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE === 'phase-production-build') {
      console.log('🔄 Skipping Redis connection during build phase');
      return false;
    }

    // Skip Redis in development if no Redis environment variables are set
    const isRedisConfigured = process.env.REDIS_HOST || process.env.NODE_ENV === 'production';
    if (!isRedisConfigured && process.env.NODE_ENV !== 'production') {
      console.log('🔄 Redis not configured for development, using fallback cache');
      return false;
    }

    try {
      // Check if caching is enabled in system settings
      const isCacheEnabled = await this.isCacheEnabled();
      if (!isCacheEnabled) {
        console.log('🔄 Redis caching is disabled in system settings');
        return false;
      }

      const config = this.getRedisConfig();
      console.log(`🔄 Attempting to connect to Redis at ${config.host}:${config.port}`);

      const redisOptions: RedisOptions = {
        host: config.host,
        port: config.port,
        password: config.password,
        db: config.db,
        retryDelayOnFailover: config.retryDelayOnFailover,
        maxRetriesPerRequest: config.maxRetriesPerRequest,
        lazyConnect: config.lazyConnect,
        keyPrefix: config.keyPrefix,
        // Connection timeout
        connectTimeout: 5000,
        // Command timeout
        commandTimeout: 3000,
        // Retry strategy
        retryStrategy: (times: number) => {
          if (times > this.maxConnectionAttempts) {
            console.error('❌ Redis max connection attempts reached');
            return null; // Stop retrying
          }
          const delay = Math.min(times * 50, 2000);
          console.log(`🔄 Redis retry attempt ${times} in ${delay}ms`);
          return delay;
        },
      };

      this.redis = new Redis(redisOptions);

      // Set up event listeners
      this.redis.on('connect', () => {
        console.log('✅ Redis connected successfully');
        this.isConnected = true;
        this.connectionAttempts = 0;
      });

      this.redis.on('ready', () => {
        console.log('✅ Redis is ready for commands');
      });

      this.redis.on('error', (error) => {
        console.error('❌ Redis connection error:', error.message);
        this.isConnected = false;
      });

      this.redis.on('close', () => {
        console.log('⚠️ Redis connection closed');
        this.isConnected = false;
      });

      this.redis.on('reconnecting', () => {
        console.log('🔄 Redis reconnecting...');
        this.connectionAttempts++;
      });

      // Attempt to connect
      await this.redis.connect();
      
      // Test the connection
      await this.redis.ping();
      
      return true;
    } catch (error) {
      console.error('❌ Failed to connect to Redis:', error);
      this.isConnected = false;
      this.redis = null;
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.redis) {
      try {
        await this.redis.quit();
        console.log('✅ Redis disconnected gracefully');
      } catch (error) {
        console.error('❌ Error disconnecting from Redis:', error);
      } finally {
        this.redis = null;
        this.isConnected = false;
      }
    }
  }

  getClient(): Redis | null {
    return this.isConnected ? this.redis : null;
  }

  isReady(): boolean {
    return this.isConnected && this.redis !== null;
  }

  async isCacheEnabled(): Promise<boolean> {
    try {
      // Skip settings check during build
      if (process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE === 'phase-production-build') {
        return false;
      }
      
      const settings = await SystemSettingsService.getAllSettings();
      return settings.cacheEnabled;
    } catch (error) {
      console.error('❌ Error checking cache settings:', error);
      // Default to enabled if we can't check settings, but false during build
      return process.env.NODE_ENV !== 'production';
    }
  }

  // Health check method
  async healthCheck(): Promise<{ status: string; message: string; latency?: number }> {
    if (!this.isReady()) {
      return { status: 'disconnected', message: 'Redis is not connected' };
    }

    try {
      const start = Date.now();
      await this.redis!.ping();
      const latency = Date.now() - start;
      
      return { 
        status: 'healthy', 
        message: 'Redis is responding', 
        latency 
      };
    } catch (error) {
      return { 
        status: 'error', 
        message: `Redis health check failed: ${error}` 
      };
    }
  }

  // Get Redis info
  async getInfo(): Promise<any> {
    if (!this.isReady()) {
      return null;
    }

    try {
      const info = await this.redis!.info();
      return this.parseRedisInfo(info);
    } catch (error) {
      console.error('❌ Error getting Redis info:', error);
      return null;
    }
  }

  private parseRedisInfo(info: string): Record<string, any> {
    const result: Record<string, any> = {};
    const sections = info.split('\r\n\r\n');
    
    for (const section of sections) {
      const lines = section.split('\r\n');
      const sectionName = lines[0].replace('# ', '');
      
      if (sectionName && lines.length > 1) {
        result[sectionName] = {};
        
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          if (line.includes(':')) {
            const [key, value] = line.split(':');
            result[sectionName][key] = isNaN(Number(value)) ? value : Number(value);
          }
        }
      }
    }
    
    return result;
  }
}

export default RedisService;
export { RedisService };