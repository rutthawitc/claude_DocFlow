import { NextRequest, NextResponse } from 'next/server';
import { DueDateNotificationService } from '@/lib/services/due-date-notification-service';

/**
 * Cron endpoint for automated due date notifications
 * This endpoint should be called daily by a cron service
 *
 * Security: Protected by CRON_SECRET environment variable
 *
 * Usage:
 * - Set CRON_SECRET in your environment variables
 * - Call this endpoint with Authorization: Bearer <CRON_SECRET>
 * - Recommended: Run daily at 8:00 AM Thailand time
 *
 * Example cron services:
 * - Vercel Cron Jobs
 * - GitHub Actions (scheduled workflow)
 * - External cron service (cron-job.org, EasyCron, etc.)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // If CRON_SECRET is not set, allow the request (for development/testing)
    // In production, you should always set CRON_SECRET
    if (cronSecret) {
      const token = authHeader?.replace('Bearer ', '');

      if (!token || token !== cronSecret) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized: Invalid cron secret' },
          { status: 401 }
        );
      }
    } else {
      console.warn('⚠️  CRON_SECRET not set - cron endpoint is unprotected!');
    }

    console.log('🕐 Starting scheduled due date notification check...');
    const startTime = Date.now();

    // Send due date notifications
    const result = await DueDateNotificationService.sendDueDateNotifications();

    const duration = Date.now() - startTime;
    console.log(`✅ Due date notification check completed in ${duration}ms`);
    console.log(`📊 Results:`, {
      sent: result.sent,
      overdue: result.overdue,
      today: result.today,
      soon: result.soon,
      errors: result.errors.length
    });

    return NextResponse.json({
      success: result.success,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      results: {
        sent: result.sent,
        overdue: result.overdue,
        today: result.today,
        soon: result.soon,
        errors: result.errors
      }
    });
  } catch (error) {
    console.error('❌ Cron job error:', error);

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

// Also support POST method for manual triggers
export async function POST(request: NextRequest) {
  return GET(request);
}