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

    // Check admin permissions (only admins can send test messages)
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
    const { botToken, chatId } = body;

    if (!botToken) {
      const response = NextResponse.json(
        { success: false, error: 'Bot token is required' },
        { status: 400 }
      );
      addRateLimitHeaders(response, apiRateLimit);
      return response;
    }

    if (!chatId) {
      const response = NextResponse.json(
        { success: false, error: 'Chat ID is required' },
        { status: 400 }
      );
      addRateLimitHeaders(response, apiRateLimit);
      return response;
    }

    // Validate inputs
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

    if (!TelegramService.validateChatId(chatId)) {
      const response = NextResponse.json(
        { 
          success: false, 
          error: 'Invalid chat ID format. Use numeric ID or @username' 
        },
        { status: 400 }
      );
      addRateLimitHeaders(response, apiRateLimit);
      return response;
    }

    // Send test message
    const result = await TelegramService.sendTestMessage(botToken, chatId);

    if (result.success) {
      const response = NextResponse.json({
        success: true,
        message: 'Test message sent successfully!',
        messageId: result.messageId
      });
      addRateLimitHeaders(response, apiRateLimit);
      return response;
    } else {
      const response = NextResponse.json({
        success: false,
        error: result.error || 'Failed to send test message'
      }, { status: 400 });
      addRateLimitHeaders(response, apiRateLimit);
      return response;
    }

  } catch (error) {
    console.error('Telegram test message error:', error);
    
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