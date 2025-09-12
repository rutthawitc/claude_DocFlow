import { TelegramService } from './telegram-service';

// Notification settings interface
export interface NotificationSettings {
  enabled: boolean;
  botToken: string;
  defaultChatId: string;
  notifications: {
    documentUploaded: boolean;
    documentSent: boolean;
    documentAcknowledged: boolean;
    documentSentBack: boolean;
    documentCompleted: boolean;
    systemAlerts: boolean;
    dailyReports: boolean;
  };
  messageFormat: {
    includeUserName: boolean;
    includeBranchName: boolean;
    includeTimestamp: boolean;
  };
}

// Document notification data
export interface DocumentNotificationData {
  documentId: number;
  mtNumber: string;
  subject: string;
  branchBaCode: number;
  branchName: string;
  userName: string;
  userFullName: string;
  action: 'uploaded' | 'sent' | 'acknowledged' | 'sent_back' | 'completed';
  timestamp: Date;
  comment?: string;
}

// Bulk document notification data
export interface BulkDocumentNotificationData {
  totalDocuments: number;
  branchNames: string[];
  userName: string;
  userFullName: string;
  timestamp: Date;
}

export class NotificationService {
  private static settings: NotificationSettings | null = null;
  private static readonly SETTINGS_FILE = process.env.NODE_ENV === 'production' 
    ? '/tmp/telegram-settings.json' 
    : './tmp/telegram-settings.json';

  /**
   * Initialize notification settings (loads from file or environment variables)
   */
  static async getSettings(): Promise<NotificationSettings | null> {
    // Return cached settings if available
    if (this.settings) {
      return this.settings;
    }

    try {
      // Try to load from file first
      const fs = await import('fs').then(m => m.promises);
      const path = await import('path');
      
      try {
        const settingsPath = path.resolve(this.SETTINGS_FILE);
        const fileContent = await fs.readFile(settingsPath, 'utf-8');
        const savedSettings = JSON.parse(fileContent) as NotificationSettings;
        this.settings = savedSettings;
        console.log('Loaded Telegram settings from file');
        return savedSettings;
      } catch (fileError) {
        // File doesn't exist or is invalid, continue to environment variables
        console.log('No saved settings file found, checking environment variables');
      }

      // Try to get from environment variables as fallback
      const botToken = process.env.TELEGRAM_BOT_TOKEN || '';
      const chatId = process.env.TELEGRAM_CHAT_ID || '';

      if (botToken && chatId) {
        const envSettings: NotificationSettings = {
          enabled: true,
          botToken,
          defaultChatId: chatId,
          notifications: {
            documentUploaded: true,
            documentSent: true,
            documentAcknowledged: true,
            documentSentBack: true,
            documentCompleted: true,
            systemAlerts: true,
            dailyReports: false
          },
          messageFormat: {
            includeUserName: true,
            includeBranchName: true,
            includeTimestamp: true
          }
        };
        
        // Save environment settings to file for persistence
        await this.saveSettingsToFile(envSettings);
        this.settings = envSettings;
        return envSettings;
      }

      // No settings available
      return null;

    } catch (error) {
      console.error('Error loading notification settings:', error);
      return null;
    }
  }

  /**
   * Update notification settings and persist to file
   */
  static async updateSettings(settings: NotificationSettings): Promise<void> {
    try {
      // Save to file for persistence first
      await this.saveSettingsToFile(settings);
      
      // Clear in-memory cache to force reload from file
      this.settings = null;
      
      // Update in-memory cache with saved settings
      this.settings = settings;
      
      console.log('Notification settings updated and saved:', {
        enabled: settings.enabled,
        hasToken: !!settings.botToken,
        hasChatId: !!settings.defaultChatId
      });
    } catch (error) {
      console.error('Error saving notification settings:', error);
      throw new Error('Failed to save settings');
    }
  }

  /**
   * Save settings to file for persistence
   */
  private static async saveSettingsToFile(settings: NotificationSettings): Promise<void> {
    try {
      const fs = await import('fs').then(m => m.promises);
      const path = await import('path');
      
      const settingsPath = path.resolve(this.SETTINGS_FILE);
      const settingsDir = path.dirname(settingsPath);
      
      // Ensure directory exists
      try {
        await fs.access(settingsDir);
      } catch {
        await fs.mkdir(settingsDir, { recursive: true });
      }
      
      // Save settings to file
      await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
      console.log('Settings saved to file:', settingsPath);
    } catch (error) {
      console.error('Error saving settings to file:', error);
      throw error;
    }
  }

  /**
   * Send document workflow notification
   */
  static async sendDocumentNotification(data: DocumentNotificationData): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const settings = await this.getSettings();
      
      if (!settings || !settings.enabled) {
        console.log('Telegram notifications disabled');
        return { success: true }; // Not an error, just disabled
      }

      // Check if this notification type is enabled
      const notificationKey = this.getNotificationKey(data.action);
      if (!settings.notifications[notificationKey]) {
        console.log(`Notification type '${data.action}' is disabled`);
        return { success: true }; // Not an error, just disabled
      }

      // Build notification message
      const message = this.buildDocumentMessage(data, settings.messageFormat);

      // Send via Telegram
      const result = await TelegramService.sendTestMessage(
        settings.botToken,
        settings.defaultChatId,
        message
      );

      if (result.success) {
        console.log(`Document notification sent successfully: ${data.mtNumber} - ${data.action}`);
        return { success: true };
      } else {
        console.error(`Failed to send notification: ${result.error}`);
        return { success: false, error: result.error };
      }

    } catch (error) {
      console.error('Notification service error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send bulk document notification
   */
  static async sendBulkDocumentNotification(data: BulkDocumentNotificationData): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const settings = await this.getSettings();
      
      if (!settings || !settings.enabled) {
        console.log('Telegram notifications disabled');
        return { success: true }; // Not an error, just disabled
      }

      // Check if document sent notifications are enabled
      if (!settings.notifications.documentSent) {
        console.log('Document sent notifications are disabled');
        return { success: true }; // Not an error, just disabled
      }

      // Build bulk notification message
      const message = this.buildBulkDocumentMessage(data, settings.messageFormat);

      // Send via Telegram
      const result = await TelegramService.sendTestMessage(
        settings.botToken,
        settings.defaultChatId,
        message
      );

      if (result.success) {
        console.log(`Bulk document notification sent successfully: ${data.totalDocuments} documents`);
        return { success: true };
      } else {
        console.error(`Failed to send bulk notification: ${result.error}`);
        return { success: false, error: result.error };
      }

    } catch (error) {
      console.error('Bulk notification service error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send system alert notification
   */
  static async sendSystemAlert(
    title: string,
    message: string,
    severity: 'info' | 'warning' | 'error' = 'info'
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const settings = await this.getSettings();
      
      if (!settings || !settings.enabled || !settings.notifications.systemAlerts) {
        return { success: true }; // Not an error, just disabled
      }

      const result = await TelegramService.sendSystemAlert(
        settings.botToken,
        settings.defaultChatId,
        {
          title,
          message,
          severity,
          timestamp: new Date()
        }
      );

      if (result.success) {
        console.log(`System alert sent successfully: ${title}`);
        return { success: true };
      } else {
        console.error(`Failed to send system alert: ${result.error}`);
        return { success: false, error: result.error };
      }

    } catch (error) {
      console.error('System alert error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get notification setting key for document action
   */
  private static getNotificationKey(action: DocumentNotificationData['action']): keyof NotificationSettings['notifications'] {
    switch (action) {
      case 'uploaded':
        return 'documentUploaded';
      case 'sent':
        return 'documentSent';
      case 'acknowledged':
        return 'documentAcknowledged';
      case 'sent_back':
        return 'documentSentBack';
      case 'completed':
        return 'documentCompleted';
      default:
        return 'documentUploaded';
    }
  }

  /**
   * Build formatted message for document notifications
   */
  private static buildDocumentMessage(
    data: DocumentNotificationData,
    format: NotificationSettings['messageFormat']
  ): string {
    let emoji = '📄';
    let actionText = '';

    switch (data.action) {
      case 'uploaded':
        emoji = '📄';
        actionText = 'ถูกอัปโหลดใหม่';
        break;
      case 'sent':
        emoji = '📤';
        actionText = 'ส่งไปยังสาขาแล้ว';
        break;
      case 'acknowledged':
        emoji = '✅';
        actionText = 'ได้รับการรับทราบจากสาขา';
        break;
      case 'sent_back':
        emoji = '🔄';
        actionText = 'ถูกส่งกลับจากสาขา';
        break;
      case 'completed':
        emoji = '📋✅';
        actionText = 'เสร็จสิ้นกระบวนการแล้ว';
        break;
    }

    let message = `🔔 DocFlow Notification\n\n${emoji} เอกสาร ${data.mtNumber} ${actionText}`;
    
    // Add subject
    if (data.subject) {
      message += `\n📝 เรื่อง: ${data.subject}`;
    }
    
    // Add branch info
    if (format.includeBranchName && data.branchName) {
      message += `\n🏢 สาขา: ${data.branchName}`;
    }
    
    // Add user info
    if (format.includeUserName && data.userFullName) {
      message += `\n👤 โดย: ${data.userFullName}`;
    }
    
    // Add comment if exists
    if (data.comment) {
      message += `\n💬 หมายเหตุ: ${data.comment}`;
    }
    
    // Add timestamp
    if (format.includeTimestamp) {
      message += `\n🕒 เวลา: ${data.timestamp.toLocaleString('th-TH')}`;
    }

    // Add document link (future enhancement)
    message += `\n\n🔗 เอกสาร ID: ${data.documentId}`;

    return message;
  }

  /**
   * Build formatted message for bulk document notifications
   */
  private static buildBulkDocumentMessage(
    data: BulkDocumentNotificationData,
    format: NotificationSettings['messageFormat']
  ): string {
    let message = `🔔 DocFlow Notification\n\n📤 เอกสารถูกส่งไปยังสาขาจำนวน ${data.totalDocuments} ฉบับ`;
    
    // Add branch info
    if (format.includeBranchName && data.branchNames.length > 0) {
      message += `\n🏢 สาขา: ${data.branchNames.join(', ')}`;
    }
    
    // Add user info
    if (format.includeUserName && data.userFullName) {
      message += `\n👤 โดย: ${data.userFullName}`;
    }
    
    // Add timestamp
    if (format.includeTimestamp) {
      message += `\n🕒 เวลา: ${data.timestamp.toLocaleString('th-TH')}`;
    }

    return message;
  }

  /**
   * Test notification system with sample data
   */
  static async sendTestNotification(): Promise<{
    success: boolean;
    error?: string;
  }> {
    const testData: DocumentNotificationData = {
      documentId: 999,
      mtNumber: 'TEST-001-2024',
      subject: 'ทดสอบระบบการแจ้งเตือน',
      branchBaCode: 1059,
      branchName: 'สำนักงานเขต 6 กรุงเทพมหานกร',
      userName: 'testuser',
      userFullName: 'ผู้ทดสอบ ระบบ',
      action: 'uploaded',
      timestamp: new Date(),
      comment: 'ข้อความทดสอบระบบการแจ้งเตือน'
    };

    return this.sendDocumentNotification(testData);
  }

  /**
   * Get notification statistics (for dashboard)
   */
  static async getNotificationStats(): Promise<{
    enabled: boolean;
    totalSent: number;
    lastSent: Date | null;
    errors: number;
  }> {
    // In production, this would query database for statistics
    return {
      enabled: this.settings?.enabled || false,
      totalSent: 0, // Would be tracked in database
      lastSent: null,
      errors: 0
    };
  }
}