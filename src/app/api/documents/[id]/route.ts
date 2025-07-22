import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { DocumentService } from '@/lib/services/document-service';
import { ActivityLogger } from '@/lib/services/activity-logger';
import { DocFlowAuth, DOCFLOW_PERMISSIONS } from '@/lib/auth/docflow-auth';
import { ApiResponse } from '@/lib/types';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = parseInt(session.user.id);
    const documentId = parseInt(params.id);

    if (isNaN(documentId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid document ID' },
        { status: 400 }
      );
    }

    // Get user roles for access check
    const { roles } = await DocFlowAuth.getUserRolesAndPermissions(userId);

    // Check if user can access this document
    const canAccess = await DocumentService.canUserAccessDocument(documentId, documentId, roles);
    if (!canAccess) {
      return NextResponse.json(
        { success: false, error: 'Access denied to this document' },
        { status: 403 }
      );
    }

    // Get document with relations
    const document = await DocumentService.getDocumentById(documentId);
    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      );
    }

    // Log document view
    const { ipAddress, userAgent } = ActivityLogger.extractRequestMetadata(request);
    await ActivityLogger.logDocumentView(
      userId,
      documentId,
      document.branchBaCode,
      ipAddress,
      userAgent
    );

    const response: ApiResponse<typeof document> = {
      success: true,
      data: document
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching document:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = parseInt(session.user.id);
    const documentId = parseInt(params.id);

    if (isNaN(documentId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid document ID' },
        { status: 400 }
      );
    }

    // Check delete permission
    const hasDeletePermission = await DocFlowAuth.hasPermission(userId, DOCFLOW_PERMISSIONS.DOCUMENTS_DELETE);
    if (!hasDeletePermission) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions to delete documents' },
        { status: 403 }
      );
    }

    // Get document first to check ownership and log details
    const document = await DocumentService.getDocumentById(documentId);
    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      );
    }

    // Check if user can delete this document (owner or admin)
    const isOwner = document.uploaderId === userId;
    const isAdmin = await DocFlowAuth.hasRole(userId, 'admin');
    
    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Access denied - you can only delete your own documents' },
        { status: 403 }
      );
    }

    // Delete document
    const deleted = await DocumentService.deleteDocument(documentId);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete document' },
        { status: 500 }
      );
    }

    // Log deletion
    const { ipAddress, userAgent } = ActivityLogger.extractRequestMetadata(request);
    await ActivityLogger.logActivity({
      userId,
      action: 'delete_document',
      documentId,
      branchBaCode: document.branchBaCode,
      details: {
        originalFilename: document.originalFilename,
        mtNumber: document.mtNumber,
        deletedBy: userId
      },
      ipAddress,
      userAgent
    });

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}