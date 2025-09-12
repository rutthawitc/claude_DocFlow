import { TelegramService } from './telegram-service';
import { promises as fs } from 'fs';
import path from 'path';

// Admin Telegram settings interface
export interface AdminTelegramSettings {
  enabled: boolean;
  botToken: string;
  defaultChatId: string;
  notifications: {
    documentAcknowledged: boolean;
    additionalDocsCompleted: boolean;
    documentSentBackToDistrict: boolean;
    documentVerificationCompleted: boolean;
    bulkDocumentsSent: boolean;
    userRoleChanges: boolean;
    workflowStatusChanges: boolean;
  };
  messageFormat: {
    includeFullContext: boolean;
    includeUserDetails: boolean;
    includeBranchDetails: boolean;
    includeDocumentDetails: boolean;
    includeTimestamp: boolean;
  };
}

// Admin notification context interface
export interface AdminNotificationContext {
  eventType: 'documentAcknowledged' | 'additionalDocsCompleted' | 'documentSentBackToDistrict' | 
           'documentVerificationCompleted' | 'bulkDocumentsSent' | 'userRoleChanges' | 'workflowStatusChanges';
  documentMtNumber?: string;
  documentTitle?: string;
  branchName?: string;
  branchCode?: string;
  userName?: string;
  userRole?: string;
  statusFrom?: string;
  statusTo?: string;
  additionalContext?: Record<string, string | number | boolean>;
  timestamp?: Date;
}

const ADMIN_SETTINGS_FILE = path.join(process.cwd(), 'tmp', 'admin-telegram-settings.json');

export class AdminNotificationService {
  /**
   * Load admin telegram settings
   */
  private static async loadAdminSettings(): Promise<AdminTelegramSettings | null> {
    try {
      const data = await fs.readFile(ADMIN_SETTINGS_FILE, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.log('No admin telegram settings found, skipping admin notification');
      return null;
    }
  }

  /**
   * Format admin notification message
   */
  private static formatAdminMessage(
    context: AdminNotificationContext,
    messageFormat: AdminTelegramSettings['messageFormat']
  ): string {
    const { eventType, documentMtNumber, documentTitle, branchName, branchCode, userName, userRole, statusFrom, statusTo, timestamp } = context;

    let emoji = '🔔';
    let eventDescription = '';

    // Set emoji and description based on event type
    switch (eventType) {
      case 'documentAcknowledged':
        emoji = '✅';
        eventDescription = 'สาขารับทราบเอกสารเรียบร้อยแล้ว';
        break;
      case 'additionalDocsCompleted':
        emoji = '📄';
        eventDescription = 'เอกสารเพิ่มเติมครบถ้วนแล้ว';
        break;
      case 'documentSentBackToDistrict':
        emoji = '🔄';
        eventDescription = 'เอกสารถูกส่งกลับไปยังเขต';
        break;
      case 'documentVerificationCompleted':
        emoji = '🔍';
        eventDescription = 'การตรวจสอบเอกสารเสร็จสิ้น';
        break;
      case 'bulkDocumentsSent':
        emoji = '📤';
        eventDescription = 'มีการส่งเอกสารเป็นชุดไปยังสาขา';
        break;
      case 'userRoleChanges':
        emoji = '👥';
        eventDescription = 'มีการเปลี่ยนแปลงบทบาทผู้ใช้';
        break;
      case 'workflowStatusChanges':
        emoji = '⚡';
        eventDescription = 'มีการเปลี่ยนแปลงสถานะ Workflow';
        break;
    }

    let message = `🔔 DocFlow Admin Notification\n\n${emoji} ${eventDescription}`;

    // Add document details
    if (messageFormat.includeDocumentDetails && documentMtNumber) {
      message += `\n📋 เอกสาร: ${documentMtNumber}`;
      if (documentTitle) {
        message += ` (${documentTitle})`;
      }
    }

    // Add branch details
    if (messageFormat.includeBranchDetails && branchName) {
      message += `\n🏢 สาขา: ${branchName}`;
      if (branchCode) {
        message += ` (BA: ${branchCode})`;
      }
    }

    // Add user details
    if (messageFormat.includeUserDetails && userName) {
      message += `\n👤 ผู้ดำเนินการ: ${userName}`;
      if (userRole) {
        message += ` (${userRole})`;
      }
    }

    // Add status change details for workflow events
    if (messageFormat.includeDocumentDetails && statusFrom && statusTo) {
      message += `\n📊 สถานะ: ${statusFrom} → ${statusTo}`;
    }

    // Add timestamp
    if (messageFormat.includeTimestamp) {
      const time = timestamp || new Date();
      message += `\n🕒 เวลา: ${time.toLocaleString('th-TH')}`;
    }

    // Add full context if enabled
    if (messageFormat.includeFullContext && context.additionalContext) {
      const additional = Object.entries(context.additionalContext)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');
      if (additional) {
        message += `\n📝 รายละเอียดเพิ่มเติม:\n${additional}`;
      }
    }

    return message;
  }

  /**
   * Send admin notification
   */
  static async sendAdminNotification(context: AdminNotificationContext): Promise<{
    success: boolean;
    messageId?: number;
    error?: string;
  }> {
    try {
      const settings = await this.loadAdminSettings();
      
      if (!settings || !settings.enabled) {
        return {
          success: true // Not an error, just disabled
        };
      }

      // Check if this notification type is enabled
      const notificationKey = context.eventType;
      if (!settings.notifications[notificationKey]) {
        return {
          success: true // Not an error, just this type is disabled
        };
      }

      if (!settings.botToken || !settings.defaultChatId) {
        return {
          success: false,
          error: 'Admin bot token or chat ID not configured'
        };
      }

      // Format the message
      const message = this.formatAdminMessage(context, settings.messageFormat);

      // Send the message
      const result = await TelegramService.sendTestMessage(
        settings.botToken,
        settings.defaultChatId,
        message
      );

      return result;
    } catch (error) {
      console.error('Error sending admin notification:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send admin notification'
      };
    }
  }

  /**
   * Send admin system alert
   */
  static async sendSystemAlert(
    title: string, 
    message: string, 
    severity: 'info' | 'warning' | 'error' = 'info',
    triggeredBy?: string
  ): Promise<{
    success: boolean;
    messageId?: number;
    error?: string;
  }> {
    try {
      const settings = await this.loadAdminSettings();
      
      if (!settings || !settings.enabled) {
        return {
          success: true // Not an error, just disabled
        };
      }

      if (!settings.botToken || !settings.defaultChatId) {
        return {
          success: false,
          error: 'Admin bot token or chat ID not configured'
        };
      }

      // Format system alert message
      let emoji = 'ℹ️';
      switch (severity) {
        case 'warning':
          emoji = '⚠️';
          break;
        case 'error':
          emoji = '🚨';
          break;
      }

      const time = new Date();
      let alertMessage = `${emoji} DocFlow Admin System Alert

📋 ${title}
💬 ${message}`;

      if (triggeredBy) {
        alertMessage += `\n👤 ทริกเกอร์โดย: ${triggeredBy}`;
      }

      alertMessage += `\n🕒 ${time.toLocaleString('th-TH')}`;

      // Send the alert
      const result = await TelegramService.sendTestMessage(
        settings.botToken,
        settings.defaultChatId,
        alertMessage
      );

      return result;
    } catch (error) {
      console.error('Error sending admin system alert:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send admin system alert'
      };
    }
  }

  /**
   * Convenience methods for specific notification types
   */
  static async notifyDocumentAcknowledged(
    documentMtNumber: string,
    documentTitle: string | undefined,
    branchName: string,
    branchCode: string,
    userName: string,
    userRole: string
  ) {
    return this.sendAdminNotification({
      eventType: 'documentAcknowledged',
      documentMtNumber,
      documentTitle,
      branchName,
      branchCode,
      userName,
      userRole,
      timestamp: new Date()
    });
  }

  static async notifyAdditionalDocsCompleted(
    documentMtNumber: string,
    documentTitle: string | undefined,
    branchName: string,
    branchCode: string,
    userName: string,
    userRole: string,
    totalDocs: number
  ) {
    return this.sendAdminNotification({
      eventType: 'additionalDocsCompleted',
      documentMtNumber,
      documentTitle,
      branchName,
      branchCode,
      userName,
      userRole,
      additionalContext: {
        'จำนวนเอกสารทั้งหมด': totalDocs
      },
      timestamp: new Date()
    });
  }

  static async notifyDocumentSentBackToDistrict(
    documentMtNumber: string,
    documentTitle: string | undefined,
    branchName: string,
    branchCode: string,
    userName: string,
    userRole: string,
    comment?: string
  ) {
    return this.sendAdminNotification({
      eventType: 'documentSentBackToDistrict',
      documentMtNumber,
      documentTitle,
      branchName,
      branchCode,
      userName,
      userRole,
      statusFrom: 'acknowledged',
      statusTo: 'sent_back_to_district',
      additionalContext: comment ? { 'ความเห็น': comment } : undefined,
      timestamp: new Date()
    });
  }

  static async notifyDocumentVerificationCompleted(
    documentMtNumber: string,
    documentTitle: string | undefined,
    branchName: string,
    branchCode: string,
    userName: string,
    userRole: string,
    verificationStatus: 'approved' | 'rejected',
    comment?: string
  ) {
    return this.sendAdminNotification({
      eventType: 'documentVerificationCompleted',
      documentMtNumber,
      documentTitle,
      branchName,
      branchCode,
      userName,
      userRole,
      additionalContext: {
        'สถานะการตรวจสอบ': verificationStatus === 'approved' ? 'อนุมัติ' : 'ปฏิเสธ',
        ...(comment ? { 'ความเห็น': comment } : {})
      },
      timestamp: new Date()
    });
  }

  static async notifyWorkflowStatusChange(
    documentMtNumber: string,
    documentTitle: string | undefined,
    branchName: string,
    branchCode: string,
    userName: string,
    userRole: string,
    statusFrom: string,
    statusTo: string
  ) {
    return this.sendAdminNotification({
      eventType: 'workflowStatusChanges',
      documentMtNumber,
      documentTitle,
      branchName,
      branchCode,
      userName,
      userRole,
      statusFrom,
      statusTo,
      timestamp: new Date()
    });
  }

  static async notifyBulkDocumentsSent(
    userName: string,
    userRole: string,
    totalDocuments: number,
    successCount: number,
    documentList: Array<{ mtNumber: string, branchName: string, branchCode: string }>
  ) {
    // Create a summary of branches affected
    const branchSummary = documentList.reduce((acc, doc) => {
      const key = `${doc.branchName} (${doc.branchCode})`;
      if (!acc[key]) acc[key] = 0;
      acc[key]++;
      return acc;
    }, {} as Record<string, number>);

    const branchList = Object.entries(branchSummary)
      .map(([branch, count]) => `${branch}: ${count} ฉบับ`)
      .join('\n');

    return this.sendAdminNotification({
      eventType: 'bulkDocumentsSent',
      userName,
      userRole,
      additionalContext: {
        'จำนวนเอกสารทั้งหมด': totalDocuments,
        'ส่งสำเร็จ': successCount,
        'สาขาที่ได้รับเอกสาร': `\n${branchList}`,
        'รายการเอกสาร': documentList.map(doc => doc.mtNumber).join(', ')
      },
      timestamp: new Date()
    });
  }
}