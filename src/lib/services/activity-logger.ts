import { eq, desc, and, gte, lte, count } from 'drizzle-orm';
import { getDb } from '@/db';
import { activityLogs, users, documents, branches } from '@/db/schema';
import { ActivityLog, LogAction, PaginatedResponse } from '@/lib/types';

export interface LogActivityData {
  userId?: number;
  action: LogAction | string;
  documentId?: number;
  branchBaCode?: number;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export interface ActivityLogFilters {
  userId?: number;
  action?: string;
  documentId?: number;
  branchBaCode?: number;
  dateFrom?: Date;
  dateTo?: Date;
  page: number;
  limit: number;
}

export class ActivityLogger {
  /**
   * Log user activity
   */
  static async logActivity(data: LogActivityData): Promise<ActivityLog> {
    const db = await getDb();

    try {
      const logEntry = {
        userId: data.userId || null,
        action: data.action,
        documentId: data.documentId || null,
        branchBaCode: data.branchBaCode || null,
        details: data.details || null,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null
      };

      const [result] = await db
        .insert(activityLogs)
        .values(logEntry)
        .returning();

      return result;
    } catch (error) {
      console.error('Error logging activity:', error);
      // Don't throw error - log and continue
      // Activity logging failure shouldn't break the main functionality
      return null;
    }
  }

  /**
   * Log user login
   */
  static async logLogin(userId: number, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.logActivity({
      userId,
      action: LogAction.LOGIN,
      details: { timestamp: new Date().toISOString() },
      ipAddress,
      userAgent
    });
  }

  /**
   * Log user logout
   */
  static async logLogout(userId: number, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.logActivity({
      userId,
      action: LogAction.LOGOUT,
      details: { timestamp: new Date().toISOString() },
      ipAddress,
      userAgent
    });
  }

  /**
   * Log document creation
   */
  static async logDocumentCreation(
    userId: number,
    documentId: number,
    branchBaCode: number,
    details?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logActivity({
      userId,
      action: LogAction.CREATE_DOCUMENT,
      documentId,
      branchBaCode,
      details: {
        ...details,
        timestamp: new Date().toISOString()
      },
      ipAddress,
      userAgent
    });
  }

  /**
   * Log notification sent
   */
  static async logNotificationSent(
    userId: number,
    documentId: number,
    branchBaCode: number,
    notificationDetails: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logActivity({
      userId,
      action: LogAction.NOTIFY_SENT,
      documentId,
      branchBaCode,
      details: {
        ...notificationDetails,
        timestamp: new Date().toISOString()
      },
      ipAddress,
      userAgent
    });
  }

  /**
   * Log status update
   */
  static async logStatusUpdate(
    userId: number,
    documentId: number,
    branchBaCode: number,
    fromStatus: string,
    toStatus: string,
    comment?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logActivity({
      userId,
      action: LogAction.STATUS_UPDATE,
      documentId,
      branchBaCode,
      details: {
        fromStatus,
        toStatus,
        comment,
        timestamp: new Date().toISOString()
      },
      ipAddress,
      userAgent
    });
  }

  /**
   * Log comment addition
   */
  static async logCommentAdded(
    userId: number,
    documentId: number,
    branchBaCode: number,
    commentId: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logActivity({
      userId,
      action: LogAction.ADD_COMMENT,
      documentId,
      branchBaCode,
      details: {
        commentId,
        timestamp: new Date().toISOString()
      },
      ipAddress,
      userAgent
    });
  }

  /**
   * Log document view
   */
  static async logDocumentView(
    userId: number,
    documentId: number,
    branchBaCode: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logActivity({
      userId,
      action: LogAction.VIEW_DOCUMENT,
      documentId,
      branchBaCode,
      details: {
        timestamp: new Date().toISOString()
      },
      ipAddress,
      userAgent
    });
  }

  /**
   * Log document download
   */
  static async logDocumentDownload(
    userId: number,
    documentId: number,
    branchBaCode: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logActivity({
      userId,
      action: LogAction.DOWNLOAD_DOCUMENT,
      documentId,
      branchBaCode,
      details: {
        timestamp: new Date().toISOString()
      },
      ipAddress,
      userAgent
    });
  }

  /**
   * Get activity logs with pagination and filtering
   */
  static async getActivityLogs(filters: ActivityLogFilters): Promise<PaginatedResponse<any>> {
    const db = await getDb();

    try {
      const conditions = [];

      // Add filters
      if (filters.userId) {
        conditions.push(eq(activityLogs.userId, filters.userId));
      }
      if (filters.action) {
        conditions.push(eq(activityLogs.action, filters.action));
      }
      if (filters.documentId) {
        conditions.push(eq(activityLogs.documentId, filters.documentId));
      }
      if (filters.branchBaCode) {
        conditions.push(eq(activityLogs.branchBaCode, filters.branchBaCode));
      }
      if (filters.dateFrom) {
        conditions.push(gte(activityLogs.createdAt, filters.dateFrom));
      }
      if (filters.dateTo) {
        conditions.push(lte(activityLogs.createdAt, filters.dateTo));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Get total count
      const [{ count: totalCount }] = await db
        .select({ count: count() })
        .from(activityLogs)
        .where(whereClause);

      // Get paginated results with relations
      const offset = (filters.page - 1) * filters.limit;
      const result = await db
        .select({
          log: activityLogs,
          user: {
            id: users.id,
            username: users.username,
            firstName: users.firstName,
            lastName: users.lastName
          },
          document: {
            id: documents.id,
            subject: documents.subject,
            mtNumber: documents.mtNumber
          },
          branch: {
            id: branches.id,
            name: branches.name,
            baCode: branches.baCode
          }
        })
        .from(activityLogs)
        .leftJoin(users, eq(activityLogs.userId, users.id))
        .leftJoin(documents, eq(activityLogs.documentId, documents.id))
        .leftJoin(branches, eq(activityLogs.branchBaCode, branches.baCode))
        .where(whereClause)
        .orderBy(desc(activityLogs.createdAt))
        .limit(filters.limit)
        .offset(offset);

      const logsWithRelations = result.map(({ log, user, document, branch }) => ({
        ...log,
        user: user || undefined,
        document: document || undefined,
        branch: branch || undefined
      }));

      return {
        data: logsWithRelations,
        total: totalCount,
        page: filters.page,
        limit: filters.limit,
        totalPages: Math.ceil(totalCount / filters.limit)
      };
    } catch (error) {
      console.error('Error getting activity logs:', error);
      throw new Error('Failed to get activity logs');
    }
  }

  /**
   * Get recent activity for dashboard
   */
  static async getRecentActivity(limit: number = 10): Promise<any[]> {
    const db = await getDb();

    try {
      const result = await db
        .select({
          log: activityLogs,
          user: {
            id: users.id,
            username: users.username,
            firstName: users.firstName,
            lastName: users.lastName
          },
          document: {
            id: documents.id,
            subject: documents.subject,
            mtNumber: documents.mtNumber
          },
          branch: {
            id: branches.id,
            name: branches.name,
            baCode: branches.baCode
          }
        })
        .from(activityLogs)
        .leftJoin(users, eq(activityLogs.userId, users.id))
        .leftJoin(documents, eq(activityLogs.documentId, documents.id))
        .leftJoin(branches, eq(activityLogs.branchBaCode, branches.baCode))
        .orderBy(desc(activityLogs.createdAt))
        .limit(limit);

      return result.map(({ log, user, document, branch }) => ({
        ...log,
        user: user || undefined,
        document: document || undefined,
        branch: branch || undefined
      }));
    } catch (error) {
      console.error('Error getting recent activity:', error);
      throw new Error('Failed to get recent activity');
    }
  }

  /**
   * Get activity summary for dashboard
   */
  static async getActivitySummary(dateFrom?: Date, dateTo?: Date): Promise<Record<string, number>> {
    const db = await getDb();

    try {
      const conditions = [];
      if (dateFrom) {
        conditions.push(gte(activityLogs.createdAt, dateFrom));
      }
      if (dateTo) {
        conditions.push(lte(activityLogs.createdAt, dateTo));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const result = await db
        .select({
          action: activityLogs.action,
          count: count()
        })
        .from(activityLogs)
        .where(whereClause)
        .groupBy(activityLogs.action);

      const summary: Record<string, number> = {};
      result.forEach(({ action, count: actionCount }) => {
        summary[action] = actionCount;
      });

      return summary;
    } catch (error) {
      console.error('Error getting activity summary:', error);
      throw new Error('Failed to get activity summary');
    }
  }

  /**
   * Get user activity summary
   */
  static async getUserActivitySummary(userId: number, dateFrom?: Date, dateTo?: Date): Promise<Record<string, number>> {
    const db = await getDb();

    try {
      const conditions = [eq(activityLogs.userId, userId)];
      if (dateFrom) {
        conditions.push(gte(activityLogs.createdAt, dateFrom));
      }
      if (dateTo) {
        conditions.push(lte(activityLogs.createdAt, dateTo));
      }

      const result = await db
        .select({
          action: activityLogs.action,
          count: count()
        })
        .from(activityLogs)
        .where(and(...conditions))
        .groupBy(activityLogs.action);

      const summary: Record<string, number> = {};
      result.forEach(({ action, count: actionCount }) => {
        summary[action] = actionCount;
      });

      return summary;
    } catch (error) {
      console.error('Error getting user activity summary:', error);
      throw new Error('Failed to get user activity summary');
    }
  }

  /**
   * Clean old activity logs (older than specified days)
   */
  static async cleanOldLogs(retentionDays: number = 365): Promise<number> {
    const db = await getDb();

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const result = await db
        .delete(activityLogs)
        .where(lte(activityLogs.createdAt, cutoffDate))
        .returning();

      console.log(`Cleaned ${result.length} old activity logs`);
      return result.length;
    } catch (error) {
      console.error('Error cleaning old logs:', error);
      throw new Error('Failed to clean old logs');
    }
  }

  /**
   * Extract request metadata for logging
   */
  static extractRequestMetadata(request: Request): { ipAddress?: string; userAgent?: string } {
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    
    const userAgent = request.headers.get('user-agent') || 'unknown';

    return { ipAddress, userAgent };
  }
}