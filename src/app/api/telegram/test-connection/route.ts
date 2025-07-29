import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { TelegramService } from '@/lib/services/telegram-service';
import { DocFlowAuth, DOCFLOW_PERMISSIONS } from '@/lib/auth/docflow-auth';
import { rateLimiters, addRateLimitHeaders } from '@/lib/rate-limit';

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

    // Get user from database by username to get the actual numeric ID
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

    // Check admin permissions (only admins can test bot connection)
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

    // Parse request body
    const body = await request.json();
    const { botToken } = body;

    if (!botToken) {
      const response = NextResponse.json(
        { success: false, error: 'Bot token is required' },
        { status: 400 }
      );
      addRateLimitHeaders(response, apiRateLimit);
      return response;
    }

    // Validate bot token format
    if (!TelegramService.validateBotToken(botToken)) {
      const response = NextResponse.json(
        { 
          success: false, 
          error: 'Invalid bot token format. Expected format: NUMBER:STRING' 
        },
        { status: 400 }
      );
      addRateLimitHeaders(response, apiRateLimit);
      return response;
    }

    // Test connection
    const result = await TelegramService.testConnection(botToken);

    if (result.success) {
      const response = NextResponse.json({
        success: true,
        message: 'Bot connection successful!',
        botInfo: {
          name: result.botInfo?.first_name,
          username: result.botInfo?.username,
          canJoinGroups: result.botInfo?.can_join_groups,
          canReadMessages: result.botInfo?.can_read_all_group_messages
        }
      });
      addRateLimitHeaders(response, apiRateLimit);
      return response;
    } else {
      const response = NextResponse.json({
        success: false,
        error: result.error || 'Connection test failed'
      }, { status: 400 });
      addRateLimitHeaders(response, apiRateLimit);
      return response;
    }

  } catch (error) {
    console.error('Telegram test connection error:', error);
    
    const response = NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
    
    return response;
  }
}