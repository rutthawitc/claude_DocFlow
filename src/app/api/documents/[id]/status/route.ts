import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { DocumentService } from '@/lib/services/document-service';
import { ActivityLogger } from '@/lib/services/activity-logger';
import { DocFlowAuth, DOCFLOW_PERMISSIONS } from '@/lib/auth/docflow-auth';
import { DocumentStatus, ApiResponse } from '@/lib/types';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function PATCH(request: NextRequest, { params: paramsPromise }: RouteParams) {
  const params = await paramsPromise;
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const username = session.user.id;
    const documentId = parseInt(params.id);

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

    if (isNaN(documentId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid document ID' },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { status, comment } = body;

    // Validate status
    if (!status || !Object.values(DocumentStatus).includes(status)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid status. Must be one of: ' + Object.values(DocumentStatus).join(', ')
        },
        { status: 400 }
      );
    }

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

    // TODO: Send notification for status changes
    // if (status === DocumentStatus.ACKNOWLEDGED || status === DocumentStatus.SENT_BACK_TO_DISTRICT) {
    //   await NotificationService.sendStatusChangeNotification(updatedDocument, currentDocument.status, status);
    // }

    const response: ApiResponse<typeof updatedDocument> = {
      success: true,
      data: updatedDocument,
      message: `Document status updated to ${status}`
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error updating document status:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}