// Telegram Bot API Service for DocFlow
export interface TelegramMessage {
  chat_id: string;
  text: string;
  parse_mode?: 'HTML' | 'Markdown';
  disable_web_page_preview?: boolean;
}

export interface TelegramBotInfo {
  id: number;
  is_bot: boolean;
  first_name: string;
  username: string;
  can_join_groups: boolean;
  can_read_all_group_messages: boolean;
  supports_inline_queries: boolean;
}

export interface TelegramApiResponse<T = unknown> {
  ok: boolean;
  result?: T;
  error_code?: number;
  description?: string;
}

export class TelegramService {
  private static readonly BASE_URL = 'https://api.telegram.org/bot';
  
  private static buildUrl(botToken: string, method: string): string {
    return `${this.BASE_URL}${botToken}/${method}`;
  }

  /**
   * Test bot token validity by getting bot information
   */
  static async testConnection(botToken: string): Promise<{
    success: boolean;
    botInfo?: TelegramBotInfo;
    error?: string;
  }> {
    try {
      if (!botToken || botToken.trim().length === 0) {
        return {
          success: false,
          error: 'Bot token is required'
        };
      }

      const url = this.buildUrl(botToken, 'getMe');
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data: TelegramApiResponse<TelegramBotInfo> = await response.json();

      if (!response.ok || !data.ok) {
        return {
          success: false,
          error: data.description || `HTTP ${response.status}: Failed to connect to Telegram`
        };
      }

      return {
        success: true,
        botInfo: data.result
      };
    } catch (error) {
      console.error('Telegram connection test error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed'
      };
    }
  }

  /**
   * Send a test message to verify chat ID and bot permissions
   */
  static async sendTestMessage(
    botToken: string, 
    chatId: string,
    customMessage?: string
  ): Promise<{
    success: boolean;
    messageId?: number;
    error?: string;
  }> {
    try {
      if (!botToken || botToken.trim().length === 0) {
        return {
          success: false,
          error: 'Bot token is required'
        };
      }

      if (!chatId || chatId.trim().length === 0) {
        return {
          success: false,
          error: 'Chat ID is required'
        };
      }

      const testMessage = customMessage || `🔔 DocFlow Test Message
      
📅 วันที่: ${new Date().toLocaleString('th-TH')}
🤖 การทดสอบการเชื่อมต่อ Telegram Bot สำเร็จ!

✅ Bot สามารถส่งข้อความได้แล้ว
🔧 ระบบ DocFlow พร้อมใช้งาน`;

      const message: TelegramMessage = {
        chat_id: chatId,
        text: testMessage,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      };

      const url = this.buildUrl(botToken, 'sendMessage');
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message)
      });

      const data: TelegramApiResponse<{ message_id: number }> = await response.json();

      if (!response.ok || !data.ok) {
        return {
          success: false,
          error: data.description || `HTTP ${response.status}: Failed to send message`
        };
      }

      return {
        success: true,
        messageId: data.result?.message_id
      };
    } catch (error) {
      console.error('Telegram send message error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send message'
      };
    }
  }

  /**
   * Send a document notification message
   */
  static async sendDocumentNotification(
    botToken: string,
    chatId: string,
    notification: {
      type: 'uploaded' | 'sent' | 'acknowledged' | 'sent_back';
      documentMtNumber: string;
      branchName?: string;
      userName?: string;
      timestamp?: Date;
      includeUserName?: boolean;
      includeBranchName?: boolean;
      includeTimestamp?: boolean;
    }
  ): Promise<{
    success: boolean;
    messageId?: number;
    error?: string;
  }> {
    try {
      const { type, documentMtNumber, branchName, userName, timestamp, includeUserName, includeBranchName, includeTimestamp } = notification;
      
      let emoji = '📄';
      let action = '';
      
      switch (type) {
        case 'uploaded':
          emoji = '📄';
          action = 'ถูกอัปโหลดใหม่';
          break;
        case 'sent':
          emoji = '📤';
          action = 'ส่งไปยังสาขาแล้ว';
          break;
        case 'acknowledged':
          emoji = '✅';
          action = 'ได้รับการรับทราบจากสาขา';
          break;
        case 'sent_back':
          emoji = '🔄';
          action = 'ถูกส่งกลับจากสาขา';
          break;
      }

      let message = `🔔 DocFlow Notification\n\n${emoji} เอกสาร ${documentMtNumber} ${action}`;
      
      if (includeBranchName && branchName) {
        message += `\n🏢 สาขา: ${branchName}`;
      }
      
      if (includeUserName && userName) {
        message += `\n👤 โดย: ${userName}`;
      }
      
      if (includeTimestamp) {
        const time = timestamp || new Date();
        message += `\n🕒 เวลา: ${time.toLocaleString('th-TH')}`;
      }

      return this.sendTestMessage(botToken, chatId, message);
    } catch (error) {
      console.error('Telegram document notification error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send notification'
      };
    }
  }

  /**
   * Send system alert message
   */
  static async sendSystemAlert(
    botToken: string,
    chatId: string,
    alert: {
      title: string;
      message: string;
      severity: 'info' | 'warning' | 'error';
      timestamp?: Date;
    }
  ): Promise<{
    success: boolean;
    messageId?: number;
    error?: string;
  }> {
    try {
      const { title, message, severity, timestamp } = alert;
      
      let emoji = 'ℹ️';
      switch (severity) {
        case 'warning':
          emoji = '⚠️';
          break;
        case 'error':
          emoji = '🚨';
          break;
      }

      const time = timestamp || new Date();
      const alertMessage = `${emoji} DocFlow System Alert

📋 ${title}
💬 ${message}
🕒 ${time.toLocaleString('th-TH')}`;

      return this.sendTestMessage(botToken, chatId, alertMessage);
    } catch (error) {
      console.error('Telegram system alert error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send alert'
      };
    }
  }

  /**
   * Validate chat ID format
   */
  static validateChatId(chatId: string): boolean {
    if (!chatId || chatId.trim().length === 0) {
      return false;
    }

    // Chat ID can be:
    // - Positive number (user ID)
    // - Negative number (group/supergroup ID)
    // - String starting with @ (username)
    const trimmed = chatId.trim();
    
    // Username format
    if (trimmed.startsWith('@')) {
      return trimmed.length > 1 && /^@[a-zA-Z0-9_]+$/.test(trimmed);
    }
    
    // Numeric ID format
    return /^-?\d+$/.test(trimmed);
  }

  /**
   * Validate bot token format
   */
  static validateBotToken(token: string): boolean {
    if (!token || token.trim().length === 0) {
      return false;
    }

    // Telegram bot token format: NUMBER:STRING
    // Example: 123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZ
    // The string part can contain letters, numbers, underscores, hyphens, and other characters
    const trimmed = token.trim();
    const parts = trimmed.split(':');
    
    // Must have exactly 2 parts separated by ':'
    if (parts.length !== 2) {
      return false;
    }
    
    // First part must be a number (bot ID)
    const botId = parts[0];
    if (!/^\d+$/.test(botId)) {
      return false;
    }
    
    // Second part must be a non-empty string (bot token)
    const botToken = parts[1];
    if (botToken.length === 0) {
      return false;
    }
    
    // Bot token should be at least 35 characters long (typical Telegram bot token length)
    if (botToken.length < 20) {
      return false;
    }
    
    return true;
  }
}