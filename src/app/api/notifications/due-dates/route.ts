import { NextRequest, NextResponse } from 'next/server';
import { withAuthHandler } from '@/lib/middleware/api-auth';
import { ApiResponseHandler } from '@/lib/middleware/api-responses';
import { DueDateNotificationService } from '@/lib/services/due-date-notification-service';

/**
 * GET - Get due date statistics
 * Returns statistics about documents with due dates
 */
export const GET = withAuthHandler(
  async (request, { user }) => {
    try {
      const stats = await DueDateNotificationService.getDueDateStatistics();

      return ApiResponseHandler.success({
        statistics: stats,
        message: 'Due date statistics retrieved successfully'
      });
    } catch (error) {
      console.error('Error getting due date statistics:', error);
      return ApiResponseHandler.internalError('Failed to retrieve due date statistics');
    }
  },
  {
    requireAuth: true,
    requiredRoles: ['admin', 'district_manager'],
    rateLimit: 'api'
  }
);

/**
 * POST - Trigger due date notifications
 * Manually trigger the notification system to check and send due date reminders
 */
export const POST = withAuthHandler(
  async (request, { user }) => {
    try {
      console.log('Manual trigger of due date notifications by user:', user.user.username);

      const result = await DueDateNotificationService.sendDueDateNotifications();

      if (result.success) {
        return ApiResponseHandler.success({
          ...result,
          message: `Successfully sent ${result.sent} notification(s)`
        });
      } else {
        return ApiResponseHandler.success({
          ...result,
          message: `Sent ${result.sent} notification(s) with ${result.errors.length} error(s)`
        }, 'Notifications sent with errors', 207); // 207 Multi-Status
      }
    } catch (error) {
      console.error('Error sending due date notifications:', error);
      return ApiResponseHandler.internalError('Failed to send due date notifications');
    }
  },
  {
    requireAuth: true,
    requiredRoles: ['admin', 'district_manager'],
    rateLimit: 'api'
  }
);