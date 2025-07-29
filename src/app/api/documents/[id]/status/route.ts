import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
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
import { 
  ValidationError,
  validateBody,
  validateParams,
  handleValidationError 
} from '@/lib/validation/middleware';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function PATCH(request: NextRequest, { params: paramsPromise }: RouteParams) {
  const params = await paramsPromise;
  try {
    // Validate path parameters
    let validatedParams;
    try {
      validatedParams = validateParams(params, documentIdSchema);
    } catch (validationError) {
      if (validationError instanceof ValidationError) {
        return handleValidationError(validationError);
      }
      throw validationError;
    }

    const documentId = validatedParams.id;

    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const username = session.user.id;

    // Get user from database by username to get the actual numeric ID
    const { getDb } = await import('@/db');
    const { users } = await import('@/db/schema');
    const { eq } = await import('drizzle-orm');
    
    const db = await getDb();
    const user = await db.query.users.findFirst({
      where: eq(users.username, username)
    });
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 401 }
      );
    }
    
    const actualUserId = user.id;

    // Validate request body
    let validatedBody;
    try {
      validatedBody = await validateBody(request, documentStatusUpdateSchema);
    } catch (validationError) {
      if (validationError instanceof ValidationError) {
        return handleValidationError(validationError);
      }
      throw validationError;
    }

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
      
      let notificationAction: 'sent' | 'acknowledged' | 'sent_back' | null = null;
      
      if (status === DocumentStatus.SENT_TO_BRANCH) {
        notificationAction = 'sent';
      } else if (status === DocumentStatus.ACKNOWLEDGED) {
        notificationAction = 'acknowledged';
      } else if (status === DocumentStatus.SENT_BACK_TO_DISTRICT) {
        notificationAction = 'sent_back';
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

  } catch (error) {
    console.error('Error updating document status:', error);
    
    if (error instanceof ValidationError) {
      return handleValidationError(error);
    }
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}