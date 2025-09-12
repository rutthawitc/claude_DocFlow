import { NextRequest, NextResponse } from 'next/server';
import { withAuthHandler } from '@/lib/middleware/api-auth';
import { TelegramService } from '@/lib/services/telegram-service';
import { z } from 'zod';

// Validation schema
const TestConnectionSchema = z.object({
  botToken: z.string().min(1, 'Bot token is required')
});

export const POST = withAuthHandler(async (request, { user, validatedData }) => {
  const { botToken } = validatedData.body;

  // Test admin bot connection
  const result = await TelegramService.testConnection(botToken);

  if (result.success) {
    return NextResponse.json({
      success: true,
      botInfo: result.botInfo,
      message: 'Admin bot connection successful'
    });
  } else {
    return NextResponse.json({
      success: false,
      error: result.error || 'Failed to connect to admin bot'
    }, { status: 400 });
  }
}, {
  requireAuth: true,
  requireAdminAccess: true,
  rateLimit: 'api',
  validation: {
    body: TestConnectionSchema
  }
});