import { NextRequest, NextResponse } from 'next/server';
import { withAuthHandler } from '@/lib/middleware/api-auth';
import { DocumentService } from '@/lib/services/document-service';
import { ActivityLogger } from '@/lib/services/activity-logger';
import { NotificationService } from '@/lib/services/notification-service';
import { BranchService } from '@/lib/services/branch-service';
import { DocFlowAuth, DOCFLOW_PERMISSIONS } from '@/lib/auth/docflow-auth';
import { DocumentStatus, ApiResponse } from '@/lib/types';
import { 
  documentStatusUpdateSchema, 
  documentIdSchema
} from '@/lib/validation/schemas';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function PATCH(request: NextRequest, { params: paramsPromise }: RouteParams) {
  const params = await paramsPromise;
  return withAuthHandler(
    async (request, { user, validatedData }) => {
      const documentId = validatedData.params.id;
      const validatedBody = validatedData.body;
      const actualUserId = user.databaseId;
      
      const { status, comment } = validatedBody;

    // Check update status permission
    const hasUpdatePermission = await DocFlowAuth.hasPermission(actualUserId, DOCFLOW_PERMISSIONS.DOCUMENTS_UPDATE_STATUS);
    if (!hasUpdatePermission) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions to update document status' },
        { status: 403 }
      );
    }

    // Get current document
    const currentDocument = await DocumentService.getDocumentById(documentId);
    if (!currentDocument) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      );
    }

    // Get user roles for access check
    const { roles } = await DocFlowAuth.getUserRolesAndPermissions(actualUserId);

    // Check if user can access this document
    const canAccess = await DocumentService.canUserAccessDocument(actualUserId, documentId, roles);
    if (!canAccess) {
      return NextResponse.json(
        { success: false, error: 'Access denied to this document' },
        { status: 403 }
      );
    }

    // Additional validation for specific status transitions
    if (status === DocumentStatus.ACKNOWLEDGED || status === DocumentStatus.SENT_BACK_TO_DISTRICT) {
      // Only branch users and managers can acknowledge or send back
      const canAcknowledge = roles.includes('branch_user') || 
                           roles.includes('branch_manager') || 
                           roles.includes('admin');
      
      if (!canAcknowledge) {
        return NextResponse.json(
          { success: false, error: 'Only branch users can acknowledge or send back documents' },
          { status: 403 }
        );
      }
    }

    // Validation for ALL_CHECKED status transition
    if (status === DocumentStatus.ALL_CHECKED) {
      // Only admin, district_manager can mark as all_checked
      const canMarkChecked = roles.includes('admin') || roles.includes('district_manager');

      if (!canMarkChecked) {
        return NextResponse.json(
          { success: false, error: 'Only admin or district manager can mark documents as checked' },
          { status: 403 }
        );
      }

      // Can only mark as all_checked from sent_back_to_district status
      if (currentDocument.status !== DocumentStatus.SENT_BACK_TO_DISTRICT) {
        return NextResponse.json(
          { success: false, error: 'Documents can only be marked as checked from sent_back_to_district status' },
          { status: 400 }
        );
      }
    }

    // Validation for COMPLETE status transition
    if (status === DocumentStatus.COMPLETE) {
      // Only admin, district_manager, uploader can mark as complete
      const canComplete = roles.includes('admin') ||
                         roles.includes('district_manager') ||
                         roles.includes('uploader');

      if (!canComplete) {
        return NextResponse.json(
          { success: false, error: 'Only admin, district manager, or uploader can mark documents as complete' },
          { status: 403 }
        );
      }

      // Can only mark as complete from all_checked status
      if (currentDocument.status !== DocumentStatus.ALL_CHECKED) {
        return NextResponse.json(
          { success: false, error: 'Documents can only be marked as complete from all_checked status' },
          { status: 400 }
        );
      }
    }

    // Update document status
    const updatedDocument = await DocumentService.updateDocumentStatus(
      documentId,
      status,
      actualUserId,
      comment
    );

    // Log status update
    const { ipAddress, userAgent } = ActivityLogger.extractRequestMetadata(request);
    await ActivityLogger.logStatusUpdate(
      actualUserId,
      documentId,
      currentDocument.branchBaCode,
      currentDocument.status,
      status,
      comment,
      ipAddress,
      userAgent
    );

    // Send Telegram notification for status changes
    try {
      const branch = await BranchService.getBranchByBaCode(currentDocument.branchBaCode);
      
      // Get user details for notification
      const { getDb } = await import('@/db');
      const { users } = await import('@/db/schema');
      const { eq } = await import('drizzle-orm');
      const db = await getDb();
      
      const user = await db.query.users.findFirst({
        where: eq(users.id, actualUserId)
      });
      const userFullName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'Unknown User';
      
      let notificationAction: 'sent' | 'acknowledged' | 'sent_back' | 'all_checked' | 'completed' | null = null;

      if (status === DocumentStatus.SENT_TO_BRANCH) {
        notificationAction = 'sent';
      } else if (status === DocumentStatus.ACKNOWLEDGED) {
        notificationAction = 'acknowledged';
      } else if (status === DocumentStatus.SENT_BACK_TO_DISTRICT) {
        notificationAction = 'sent_back';
      } else if (status === DocumentStatus.ALL_CHECKED) {
        notificationAction = 'all_checked';
      } else if (status === DocumentStatus.COMPLETE) {
        notificationAction = 'completed';
      }
      
      if (notificationAction) {
        await NotificationService.sendDocumentNotification({
          documentId: documentId,
          mtNumber: currentDocument.mtNumber,
          subject: currentDocument.subject,
          branchBaCode: currentDocument.branchBaCode,
          branchName: branch?.name || `BA ${currentDocument.branchBaCode}`,
          userName: user?.username || 'unknown',
          userFullName: userFullName,
          action: notificationAction,
          timestamp: new Date(),
          comment: comment
        });
      }
    } catch (notificationError) {
      console.error('Failed to send status change notification:', notificationError);
      // Don't fail the status update if notification fails
    }

    const response: ApiResponse<typeof updatedDocument> = {
      success: true,
      data: updatedDocument,
      message: `Document status updated to ${status}`
    };

      return NextResponse.json(response);
    },
    {
      requireAuth: true,
      validation: {
        params: documentIdSchema,
        body: documentStatusUpdateSchema
      }
    }
  )(request, { params });
}