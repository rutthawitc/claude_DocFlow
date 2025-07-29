import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { NotificationService, NotificationSettings } from '@/lib/services/notification-service';
import { DocFlowAuth } from '@/lib/auth/docflow-auth';
import { rateLimiters, addRateLimitHeaders } from '@/lib/rate-limit';

// GET - Retrieve Telegram settings
export async function GET(request: NextRequest) {
  try {
    // Apply general API rate limiting
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
    
    const actualUserId = user.id;

    // Check admin permissions
    const { roles } = await DocFlowAuth.getUserRolesAndPermissions(actualUserId);
    const isAdmin = roles.includes('admin') || roles.includes('district_manager');
    
    if (!isAdmin) {
      const response = NextResponse.json(
        { success: false, error: 'Insufficient permissions. Admin or district manager access required.' },
        { status: 403 }
      );
      addRateLimitHeaders(response, apiRateLimit);
      return response;
    }

    // Get current settings
    const settings = await NotificationService.getSettings();

    const response = NextResponse.json({
      success: true,
      data: settings || {
        enabled: false,
        botToken: '',
        defaultChatId: '',
        notifications: {
          documentUploaded: true,
          documentSent: true,
          documentAcknowledged: true,
          documentSentBack: true,
          systemAlerts: false,
          dailyReports: true,
        },
        messageFormat: {
          includeUserName: true,
          includeBranchName: true,
          includeTimestamp: true,
        },
      }
    });
    
    addRateLimitHeaders(response, apiRateLimit);
    return response;

  } catch (error) {
    console.error('Get Telegram settings error:', error);
    
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

// POST - Save Telegram settings
export async function POST(request: NextRequest) {
  try {
    // Apply general API rate limiting
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
    
    const actualUserId = user.id;

    // Check admin permissions
    const { roles } = await DocFlowAuth.getUserRolesAndPermissions(actualUserId);
    const isAdmin = roles.includes('admin') || roles.includes('district_manager');
    
    if (!isAdmin) {
      const response = NextResponse.json(
        { success: false, error: 'Insufficient permissions. Admin or district manager access required.' },
        { status: 403 }
      );
      addRateLimitHeaders(response, apiRateLimit);
      return response;
    }

    // Parse and validate request body
    const body = await request.json();
    const settings: NotificationSettings = body;

    // Basic validation
    if (typeof settings.enabled !== 'boolean') {
      const response = NextResponse.json(
        { success: false, error: 'Invalid enabled value' },
        { status: 400 }
      );
      addRateLimitHeaders(response, apiRateLimit);
      return response;
    }

    if (settings.enabled) {
      if (!settings.botToken || !settings.defaultChatId) {
        const response = NextResponse.json(
          { success: false, error: 'Bot token and chat ID are required when enabled' },
          { status: 400 }
        );
        addRateLimitHeaders(response, apiRateLimit);
        return response;
      }
    }

    // Save settings
    await NotificationService.updateSettings(settings);

    const response = NextResponse.json({
      success: true,
      message: 'Telegram settings saved successfully'
    });
    
    addRateLimitHeaders(response, apiRateLimit);
    return response;

  } catch (error) {
    console.error('Save Telegram settings error:', error);
    
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