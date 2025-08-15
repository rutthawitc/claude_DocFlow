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

  // Validate bot token format
  if (!TelegramService.validateBotToken(botToken)) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Invalid bot token format. Expected format: NUMBER:STRING' 
      },
      { status: 400 }
    );
  }

  // Test connection
  const result = await TelegramService.testConnection(botToken);

  if (result.success) {
    return NextResponse.json({
      success: true,
      message: 'Bot connection successful!',
      botInfo: {
        name: result.botInfo?.first_name,
        username: result.botInfo?.username,
        canJoinGroups: result.botInfo?.can_join_groups,
        canReadMessages: result.botInfo?.can_read_all_group_messages
      }
    });
  } else {
    return NextResponse.json({
      success: false,
      error: result.error || 'Connection test failed'
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