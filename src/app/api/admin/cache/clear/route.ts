import { NextRequest, NextResponse } from 'next/server';
import { withAuthHandler } from '@/lib/middleware/api-auth';
import { DOCFLOW_PERMISSIONS } from '@/lib/auth/docflow-auth';
import { CacheService } from '@/lib/cache/cache-service';
import { ApiResponseHandler } from '@/lib/middleware/api-responses';

// POST - Clear all caches (admin only)
export const POST = withAuthHandler(
  async (request, { user }) => {
    try {
      const cacheService = CacheService.getInstance();

      // Clear all cache completely
      await cacheService.clear();

      // Also clear specific cache tags
      await cacheService.invalidateByTag('documents');
      await cacheService.invalidateByTag('api');

      console.log(`🗑️ Admin cache clear performed by user ${user.sessionUserId}`);

      return ApiResponseHandler.success(
        { cleared: true, timestamp: new Date().toISOString() },
        'Cache cleared successfully'
      );
    } catch (error) {
      console.error('Cache clear error:', error);
      return ApiResponseHandler.internalError('Failed to clear cache');
    }
  },
  {
    requiredPermissions: [DOCFLOW_PERMISSIONS.ADMIN_MANAGE],
    requireAdmin: true
  }
);