/**
 * Due Date Notification Service
 * Handles checking and sending notifications for document due dates
 */

import { getDb } from '@/db';
import { documents, additionalDocumentFiles, branches } from '@/db/schema';
import { eq, and, lte, gte, isNotNull, isNull, or } from 'drizzle-orm';
import { NotificationService } from './notification-service';

export interface DueDateNotification {
  documentId: number;
  mtNumber: string;
  subject: string;
  branchBaCode: number;
  branchName: string;
  itemName: string;
  dueDate: string;
  daysRemaining: number;
  status: 'overdue' | 'today' | 'soon';
}

export class DueDateNotificationService {
  /**
   * Calculate days between two dates
   */
  private static calculateDaysDifference(date1: Date, date2: Date): number {
    const diffTime = date2.getTime() - date1.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Get today's date at midnight (Thailand timezone)
   */
  private static getTodayThailand(): Date {
    const today = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
    today.setHours(0, 0, 0, 0);
    return today;
  }

  /**
   * Get all additional documents with upcoming or overdue due dates
   * that have not been verified as correct
   */
  static async getDocumentsNeedingAttention(): Promise<DueDateNotification[]> {
    const db = await getDb();
    const today = this.getTodayThailand();
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    try {
      // Format dates for SQL comparison (YYYY-MM-DD)
      const todayStr = today.toISOString().split('T')[0];
      const threeDaysStr = threeDaysFromNow.toISOString().split('T')[0];

      // Query for documents that:
      // 1. Have a due date set
      // 2. Are not verified as correct (isVerified is null or false)
      // 3. Due date is today, overdue, or within 3 days
      const results = await db
        .select({
          file: additionalDocumentFiles,
          document: documents,
          branch: branches,
        })
        .from(additionalDocumentFiles)
        .innerJoin(documents, eq(additionalDocumentFiles.documentId, documents.id))
        .leftJoin(branches, eq(documents.branchBaCode, branches.baCode))
        .where(
          and(
            isNotNull(additionalDocumentFiles.dueDate),
            or(
              isNull(additionalDocumentFiles.isVerified),
              eq(additionalDocumentFiles.isVerified, false)
            ),
            lte(additionalDocumentFiles.dueDate, threeDaysStr)
          )
        )
        .orderBy(additionalDocumentFiles.dueDate);

      // Process results and calculate days remaining
      const notifications: DueDateNotification[] = results.map(({ file, document, branch }) => {
        const dueDate = new Date(file.dueDate!);
        dueDate.setHours(0, 0, 0, 0);
        const daysRemaining = this.calculateDaysDifference(today, dueDate);

        let status: 'overdue' | 'today' | 'soon';
        if (daysRemaining < 0) {
          status = 'overdue';
        } else if (daysRemaining === 0) {
          status = 'today';
        } else {
          status = 'soon';
        }

        return {
          documentId: document.id,
          mtNumber: document.mtNumber,
          subject: document.subject,
          branchBaCode: document.branchBaCode,
          branchName: branch?.name || `BA ${document.branchBaCode}`,
          itemName: file.itemName,
          dueDate: file.dueDate!,
          daysRemaining,
          status,
        };
      });

      return notifications;
    } catch (error) {
      console.error('Error fetching documents needing attention:', error);
      throw error;
    }
  }

  /**
   * Send due date notifications via Telegram
   */
  static async sendDueDateNotifications(): Promise<{
    success: boolean;
    sent: number;
    overdue: number;
    today: number;
    soon: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let sent = 0;
    let overdueCount = 0;
    let todayCount = 0;
    let soonCount = 0;

    try {
      // Get all documents needing attention
      const notifications = await this.getDocumentsNeedingAttention();

      if (notifications.length === 0) {
        console.log('No due date notifications to send');
        return {
          success: true,
          sent: 0,
          overdue: 0,
          today: 0,
          soon: 0,
          errors: [],
        };
      }

      // Group notifications by status
      const overdueNotifications = notifications.filter(n => n.status === 'overdue');
      const todayNotifications = notifications.filter(n => n.status === 'today');
      const soonNotifications = notifications.filter(n => n.status === 'soon');

      overdueCount = overdueNotifications.length;
      todayCount = todayNotifications.length;
      soonCount = soonNotifications.length;

      // Send summary notification
      const summaryMessage = this.formatSummaryMessage(
        overdueNotifications,
        todayNotifications,
        soonNotifications
      );

      try {
        await NotificationService.sendSystemAlert(summaryMessage, 'warning');
        sent++;
      } catch (error) {
        errors.push(`Failed to send summary notification: ${error}`);
      }

      // Send individual notifications for overdue documents (high priority)
      for (const notification of overdueNotifications) {
        try {
          const message = this.formatIndividualNotification(notification);
          await NotificationService.sendSystemAlert(message, 'error');
          sent++;
        } catch (error) {
          errors.push(
            `Failed to send overdue notification for ${notification.mtNumber}: ${error}`
          );
        }
      }

      return {
        success: errors.length === 0,
        sent,
        overdue: overdueCount,
        today: todayCount,
        soon: soonCount,
        errors,
      };
    } catch (error) {
      console.error('Error sending due date notifications:', error);
      return {
        success: false,
        sent,
        overdue: overdueCount,
        today: todayCount,
        soon: soonCount,
        errors: [`System error: ${error}`],
      };
    }
  }

  /**
   * Format summary message for all due date notifications
   */
  private static formatSummaryMessage(
    overdue: DueDateNotification[],
    today: DueDateNotification[],
    soon: DueDateNotification[]
  ): string {
    const lines: string[] = [];
    lines.push('📅 **สรุปเอกสารที่ต้องดำเนินการ**');
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    lines.push('');

    if (overdue.length > 0) {
      lines.push(`🔴 **เอกสารเกินกำหนด: ${overdue.length} รายการ**`);
      overdue.forEach(n => {
        const daysOverdue = Math.abs(n.daysRemaining);
        lines.push(
          `  • ${n.mtNumber} - ${n.itemName}\n    สาขา: ${n.branchName}\n    เกินมา ${daysOverdue} วัน`
        );
      });
      lines.push('');
    }

    if (today.length > 0) {
      lines.push(`🟠 **เอกสารครบกำหนดวันนี้: ${today.length} รายการ**`);
      today.forEach(n => {
        lines.push(
          `  • ${n.mtNumber} - ${n.itemName}\n    สาขา: ${n.branchName}`
        );
      });
      lines.push('');
    }

    if (soon.length > 0) {
      lines.push(`🟡 **เอกสารใกล้ครบกำหนด (1-3 วัน): ${soon.length} รายการ**`);
      soon.forEach(n => {
        lines.push(
          `  • ${n.mtNumber} - ${n.itemName}\n    สาขา: ${n.branchName}\n    เหลืออีก ${n.daysRemaining} วัน`
        );
      });
      lines.push('');
    }

    const total = overdue.length + today.length + soon.length;
    lines.push(`📊 **รวมทั้งหมด: ${total} รายการ**`);
    lines.push('');
    lines.push('💡 กรุณาดำเนินการตรวจสอบและอัพโหลดเอกสารให้ครบถ้วน');

    return lines.join('\n');
  }

  /**
   * Format individual notification for a single document
   */
  private static formatIndividualNotification(notification: DueDateNotification): string {
    const lines: string[] = [];

    if (notification.status === 'overdue') {
      const daysOverdue = Math.abs(notification.daysRemaining);
      lines.push('🚨 **เอกสารเกินกำหนดส่ง**');
      lines.push('━━━━━━━━━━━━━━━━━━━━');
      lines.push('');
      lines.push(`📄 **เลขที่หนังสือ:** ${notification.mtNumber}`);
      lines.push(`📋 **เรื่อง:** ${notification.subject}`);
      lines.push(`🏢 **สาขา:** ${notification.branchName}`);
      lines.push(`📎 **เอกสารที่ต้องส่ง:** ${notification.itemName}`);
      lines.push(`⏰ **เกินกำหนดมาแล้ว:** ${daysOverdue} วัน`);
      lines.push('');
      lines.push('⚠️ **กรุณาดำเนินการอัพโหลดเอกสารโดยด่วน**');
    }

    return lines.join('\n');
  }

  /**
   * Format due date in Thai format
   */
  private static formatThaiDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  /**
   * Get statistics about due dates
   */
  static async getDueDateStatistics(): Promise<{
    total: number;
    overdue: number;
    today: number;
    soon: number;
    onTime: number;
  }> {
    const db = await getDb();
    const today = this.getTodayThailand();
    const todayStr = today.toISOString().split('T')[0];

    try {
      // Get all additional document files with due dates that are not verified as correct
      const allFiles = await db
        .select({
          dueDate: additionalDocumentFiles.dueDate,
          isVerified: additionalDocumentFiles.isVerified,
        })
        .from(additionalDocumentFiles)
        .where(
          and(
            isNotNull(additionalDocumentFiles.dueDate),
            or(
              isNull(additionalDocumentFiles.isVerified),
              eq(additionalDocumentFiles.isVerified, false)
            )
          )
        );

      let overdue = 0;
      let todayCount = 0;
      let soon = 0;
      let onTime = 0;

      allFiles.forEach(file => {
        const dueDate = new Date(file.dueDate!);
        dueDate.setHours(0, 0, 0, 0);
        const daysRemaining = this.calculateDaysDifference(today, dueDate);

        if (daysRemaining < 0) {
          overdue++;
        } else if (daysRemaining === 0) {
          todayCount++;
        } else if (daysRemaining <= 3) {
          soon++;
        } else {
          onTime++;
        }
      });

      return {
        total: allFiles.length,
        overdue,
        today: todayCount,
        soon,
        onTime,
      };
    } catch (error) {
      console.error('Error getting due date statistics:', error);
      throw error;
    }
  }
}