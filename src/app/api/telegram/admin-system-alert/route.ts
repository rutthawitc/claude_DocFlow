import { NextRequest, NextResponse } from 'next/server';
import { withAuthHandler } from '@/lib/middleware/api-auth';
import { AdminNotificationService } from '@/lib/services/admin-notification-service';
import { z } from 'zod';

// Validation schema
const AdminSystemAlertSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  message: z.string().min(1, 'Message is required'),
  severity: z.enum(['info', 'warning', 'error']).default('info')
});

export const POST = withAuthHandler(async (request, { user, validatedData }) => {
  const { title, message, severity } = validatedData.body;

  // Send admin system alert
  const result = await AdminNotificationService.sendSystemAlert(title, message, severity, user.username);

  if (result.success) {
    return NextResponse.json({
      success: true,
      message: 'Admin system alert sent successfully'
    });
  } else {
    return NextResponse.json({
      success: false,
      error: result.error || 'Failed to send admin system alert'
    }, { status: 500 });
  }
}, {
  requireAuth: true,
  requireAdminAccess: true,
  rateLimit: 'api',
  validation: {
    body: AdminSystemAlertSchema
  }
});