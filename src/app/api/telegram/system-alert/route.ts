import { NextRequest, NextResponse } from 'next/server';
import { withAuthHandler } from '@/lib/middleware/api-auth';
import { NotificationService } from '@/lib/services/notification-service';
import { z } from 'zod';

// Validation schema
const SystemAlertSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  message: z.string().min(1, 'Message is required'),
  severity: z.enum(['info', 'warning', 'error']).default('info')
});

export const POST = withAuthHandler(async (request, { user, validatedData }) => {
  const { title, message, severity } = validatedData.body;

  // Send system alert
  const result = await NotificationService.sendSystemAlert(title, message, severity);

  if (result.success) {
    return NextResponse.json({
      success: true,
      message: 'System alert sent successfully'
    });
  } else {
    return NextResponse.json({
      success: false,
      error: result.error || 'Failed to send system alert'
    }, { status: 500 });
  }
}, {
  requireAuth: true,
  requireAdminAccess: true,
  rateLimit: 'api',
  validation: {
    body: SystemAlertSchema
  }
});