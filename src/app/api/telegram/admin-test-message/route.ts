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

  // Create admin test message
  const adminTestMessage = `🔔 DocFlow Admin Test Message

📅 วันที่: ${new Date().toLocaleString('th-TH')}
🤖 การทดสอบการเชื่อมต่อ Admin Bot สำเร็จ!

👥 สำหรับ: Admin/Uploader/District Manager
🔧 ระบบ DocFlow Admin Notification พร้อมใช้งาน

✅ Admin Bot สามารถส่งข้อความได้แล้ว
🎯 ทดสอบโดย: ${user.username}`;

  // Send admin test message
  const result = await TelegramService.sendTestMessage(botToken, chatId, adminTestMessage);

  if (result.success) {
    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      message: 'Admin test message sent successfully'
    });
  } else {
    return NextResponse.json({
      success: false,
      error: result.error || 'Failed to send admin test message'
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