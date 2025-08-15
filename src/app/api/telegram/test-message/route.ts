import { NextRequest, NextResponse } from 'next/server';
import { withAuthHandler } from '@/lib/middleware/api-auth';
import { TelegramService } from '@/lib/services/telegram-service';
import { z } from 'zod';

// Validation schema
const TestMessageSchema = z.object({
  botToken: z.string().min(1, 'Bot token is required'),
  chatId: z.string().min(1, 'Chat ID is required')
});

export const POST = withAuthHandler(async (request, { user, validatedData }) => {
  const { botToken, chatId } = validatedData.body;

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

  // Validate chat ID format
  if (!TelegramService.validateChatId(chatId)) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Invalid chat ID format. Use numeric ID or @username' 
      },
      { status: 400 }
    );
  }

  // Send test message
  const result = await TelegramService.sendTestMessage(botToken, chatId);

  if (result.success) {
    return NextResponse.json({
      success: true,
      message: 'Test message sent successfully!',
      messageId: result.messageId
    });
  } else {
    return NextResponse.json({
      success: false,
      error: result.error || 'Failed to send test message'
    }, { status: 400 });
  }
}, {
  requireAuth: true,
  requireAdminAccess: true,
  rateLimit: 'api',
  validation: {
    body: TestMessageSchema
  }
});