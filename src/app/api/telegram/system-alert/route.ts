import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { NotificationService } from '@/lib/services/notification-service';
import { DocFlowAuth } from '@/lib/auth/docflow-auth';
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

    // Parse request body
    const body = await request.json();
    const { title, message, severity = 'info' } = body;

    if (!title || !message) {
      const response = NextResponse.json(
        { success: false, error: 'Title and message are required' },
        { status: 400 }
      );
      addRateLimitHeaders(response, apiRateLimit);
      return response;
    }

    if (!['info', 'warning', 'error'].includes(severity)) {
      const response = NextResponse.json(
        { success: false, error: 'Invalid severity. Must be: info, warning, or error' },
        { status: 400 }
      );
      addRateLimitHeaders(response, apiRateLimit);
      return response;
    }

    // Send system alert
    const result = await NotificationService.sendSystemAlert(title, message, severity);

    if (result.success) {
      const response = NextResponse.json({
        success: true,
        message: 'System alert sent successfully'
      });
      addRateLimitHeaders(response, apiRateLimit);
      return response;
    } else {
      const response = NextResponse.json({
        success: false,
        error: result.error || 'Failed to send system alert'
      }, { status: 500 });
      addRateLimitHeaders(response, apiRateLimit);
      return response;
    }

  } catch (error) {
    console.error('System alert API error:', error);
    
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