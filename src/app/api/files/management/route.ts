import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { FileManagementService } from '@/lib/services/file-management-service';
import { DocFlowAuth } from '@/lib/auth/docflow-auth';
import { rateLimiters, addRateLimitHeaders } from '@/lib/rate-limit';
import { z } from 'zod';

// Validation schemas
const FileSettingsSchema = z.object({
  maxFileSize: z.number().min(1).max(100).optional(),
  retentionPeriod: z.number().min(1).max(3650).optional(),
  uploadDirectory: z.string().min(1).optional(),
  maxStorageSize: z.number().min(1).max(1000).optional(),
  cleanupEnabled: z.boolean().optional(),
  backupEnabled: z.boolean().optional(),
});

const CleanupRequestSchema = z.object({
  action: z.literal('cleanup'),
  confirm: z.boolean(),
});

const BackupRequestSchema = z.object({
  action: z.literal('backup'),
  confirm: z.boolean(),
});

/**
 * GET /api/files/management - Get file statistics and settings
 */
export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
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

    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      const response = NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
      addRateLimitHeaders(response, apiRateLimit);
      return response;
    }

    const username = session.user.id;

    // Get user from database
    const { getDb } = await import('@/db');
    const { users } = await import('@/db/schema');
    const { eq } = await import('drizzle-orm');
    
    const db = await getDb();
    const user = await db.query.users.findFirst({
      where: eq(users.username, username)
    });
    
    if (!user) {
      const response = NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 401 }
      );
      addRateLimitHeaders(response, apiRateLimit);
      return response;
    }

    // Check permissions (admin or district manager only)
    const { roles } = await DocFlowAuth.getUserRolesAndPermissions(user.id);
    const hasPermission = roles.includes('admin') || roles.includes('district_manager');
    
    if (!hasPermission) {
      const response = NextResponse.json(
        { success: false, error: 'Insufficient permissions. Admin or district manager access required.' },
        { status: 403 }
      );
      addRateLimitHeaders(response, apiRateLimit);
      return response;
    }

    // Get file statistics and settings
    const [stats, settings] = await Promise.all([
      FileManagementService.getFileStats(),
      FileManagementService.getFileSettings(),
    ]);

    const response = NextResponse.json({
      success: true,
      data: {
        stats,
        settings,
      }
    });
    addRateLimitHeaders(response, apiRateLimit);
    return response;

  } catch (error) {
    console.error('File management GET error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/files/management - Update file management settings
 */
export async function PUT(request: NextRequest) {
  try {
    // Apply rate limiting
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

    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      const response = NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
      addRateLimitHeaders(response, apiRateLimit);
      return response;
    }

    const username = session.user.id;

    // Get user from database
    const { getDb } = await import('@/db');
    const { users } = await import('@/db/schema');
    const { eq } = await import('drizzle-orm');
    
    const db = await getDb();
    const user = await db.query.users.findFirst({
      where: eq(users.username, username)
    });
    
    if (!user) {
      const response = NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 401 }
      );
      addRateLimitHeaders(response, apiRateLimit);
      return response;
    }

    // Check permissions
    const { roles } = await DocFlowAuth.getUserRolesAndPermissions(user.id);
    const hasPermission = roles.includes('admin') || roles.includes('district_manager');
    
    if (!hasPermission) {
      const response = NextResponse.json(
        { success: false, error: 'Insufficient permissions. Admin or district manager access required.' },
        { status: 403 }
      );
      addRateLimitHeaders(response, apiRateLimit);
      return response;
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedSettings = FileSettingsSchema.parse(body);

    // Update settings
    const updatedSettings = await FileManagementService.updateFileSettings(validatedSettings);

    const response = NextResponse.json({
      success: true,
      data: updatedSettings,
      message: 'File management settings updated successfully'
    });
    addRateLimitHeaders(response, apiRateLimit);
    return response;

  } catch (error) {
    console.error('File management PUT error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          details: error.errors
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/files/management - Perform file management actions (cleanup, backup)
 */
export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
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

    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      const response = NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
      addRateLimitHeaders(response, apiRateLimit);
      return response;
    }

    const username = session.user.id;

    // Get user from database
    const { getDb } = await import('@/db');
    const { users } = await import('@/db/schema');
    const { eq } = await import('drizzle-orm');
    
    const db = await getDb();
    const user = await db.query.users.findFirst({
      where: eq(users.username, username)
    });
    
    if (!user) {
      const response = NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 401 }
      );
      addRateLimitHeaders(response, apiRateLimit);
      return response;
    }

    // Check permissions
    const { roles } = await DocFlowAuth.getUserRolesAndPermissions(user.id);
    const hasPermission = roles.includes('admin') || roles.includes('district_manager');
    
    if (!hasPermission) {
      const response = NextResponse.json(
        { success: false, error: 'Insufficient permissions. Admin or district manager access required.' },
        { status: 403 }
      );
      addRateLimitHeaders(response, apiRateLimit);
      return response;
    }

    // Parse request body
    const body = await request.json();
    const { action } = body;

    if (action === 'cleanup') {
      // Validate cleanup request
      const validatedRequest = CleanupRequestSchema.parse(body);
      
      if (!validatedRequest.confirm) {
        const response = NextResponse.json(
          { success: false, error: 'Cleanup action must be confirmed' },
          { status: 400 }
        );
        addRateLimitHeaders(response, apiRateLimit);
        return response;
      }

      // Perform cleanup
      const cleanupResult = await FileManagementService.cleanupOldFiles();

      const response = NextResponse.json({
        success: true,
        data: cleanupResult,
        message: `Cleanup completed: ${cleanupResult.filesRemoved} files removed, ${cleanupResult.spaceFreed} bytes freed`
      });
      addRateLimitHeaders(response, apiRateLimit);
      return response;

    } else if (action === 'backup') {
      // Validate backup request
      const validatedRequest = BackupRequestSchema.parse(body);
      
      if (!validatedRequest.confirm) {
        const response = NextResponse.json(
          { success: false, error: 'Backup action must be confirmed' },
          { status: 400 }
        );
        addRateLimitHeaders(response, apiRateLimit);
        return response;
      }

      // Perform backup
      const backupResult = await FileManagementService.createBackup();

      if (backupResult.success) {
        const response = NextResponse.json({
          success: true,
          data: { backupPath: backupResult.backupPath },
          message: `Backup created successfully at ${backupResult.backupPath}`
        });
        addRateLimitHeaders(response, apiRateLimit);
        return response;
      } else {
        const response = NextResponse.json({
          success: false,
          error: backupResult.error || 'Backup failed'
        }, { status: 500 });
        addRateLimitHeaders(response, apiRateLimit);
        return response;
      }

    } else {
      const response = NextResponse.json(
        { success: false, error: 'Invalid action. Supported actions: cleanup, backup' },
        { status: 400 }
      );
      addRateLimitHeaders(response, apiRateLimit);
      return response;
    }

  } catch (error) {
    console.error('File management POST error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          details: error.errors
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}