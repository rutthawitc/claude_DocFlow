import { NextRequest, NextResponse } from 'next/server';
import { withAuthHandler } from '@/lib/middleware/api-auth';
import { NotificationService, NotificationSettings } from '@/lib/services/notification-service';
import { z } from 'zod';

// Validation schema for POST requests
const NotificationSettingsSchema = z.object({
  enabled: z.boolean(),
  botToken: z.string().optional(),
  defaultChatId: z.string().optional(),
  notifications: z.object({
    documentUploaded: z.boolean(),
    documentSent: z.boolean(),
    documentAcknowledged: z.boolean(),
    documentSentBack: z.boolean(),
    systemAlerts: z.boolean(),
    dailyReports: z.boolean()
  }).optional(),
  messageFormat: z.object({
    includeUserName: z.boolean(),
    includeBranchName: z.boolean(),
    includeTimestamp: z.boolean()
  }).optional()
}).refine((data) => {
  if (data.enabled && (!data.botToken || !data.defaultChatId)) {
    return false;
  }
  return true;
}, {
  message: "Bot token and chat ID are required when enabled"
});

// GET - Retrieve Telegram settings
export const GET = withAuthHandler(async (request, { user }) => {
  // Get current settings
  const settings = await NotificationService.getSettings();

  return NextResponse.json({
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
}, {
  requireAuth: true,
  requireAdminAccess: true,
  rateLimit: 'api'
});

// POST - Save Telegram settings
export const POST = withAuthHandler(async (request, { user, validatedData }) => {
  const settings: NotificationSettings = validatedData.body;

  // Save settings
  await NotificationService.updateSettings(settings);

  return NextResponse.json({
    success: true,
    message: 'Telegram settings saved successfully'
  });
}, {
  requireAuth: true,
  requireAdminAccess: true,
  rateLimit: 'api',
  validation: {
    body: NotificationSettingsSchema
  }
});