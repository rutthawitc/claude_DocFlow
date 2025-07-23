import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { DocumentService } from '@/lib/services/document-service';
import { ActivityLogger } from '@/lib/services/activity-logger';
import { DocFlowAuth, DOCFLOW_PERMISSIONS } from '@/lib/auth/docflow-auth';
import { StreamingFileHandler } from '@/lib/services/file-service';
import { ApiResponse, DocumentUploadData } from '@/lib/types';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: NextRequest, { params: paramsPromise }: RouteParams) {
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

    if (isNaN(documentId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid document ID' },
        { status: 400 }
      );
    }

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

    // Get user roles for access check
    const { roles } = await DocFlowAuth.getUserRolesAndPermissions(actualUserId);
    console.log(`Document access check: userId=${actualUserId}, documentId=${documentId}, roles=${JSON.stringify(roles)}`);

    // Check if user can access this document
    const canAccess = await DocumentService.canUserAccessDocument(actualUserId, documentId, roles);
    console.log(`Access result: ${canAccess}`);
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

export async function DELETE(request: NextRequest, { params: paramsPromise }: RouteParams) {
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

    if (isNaN(documentId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid document ID' },
        { status: 400 }
      );
    }

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

    // Get document first to check ownership and status
    const document = await DocumentService.getDocumentById(documentId);
    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      );
    }

    // Check if user can delete this document
    const isOwner = document.uploaderId === actualUserId;
    const isAdmin = await DocFlowAuth.hasRole(actualUserId, 'admin');
    const isDraft = document.status === 'draft';
    
    // Allow users to delete their own draft documents or admins to delete any document
    const canDelete = (isOwner && isDraft) || isAdmin || await DocFlowAuth.hasPermission(actualUserId, DOCFLOW_PERMISSIONS.DOCUMENTS_DELETE);
    
    if (!canDelete) {
      return NextResponse.json(
        { success: false, error: 'Access denied - you can only delete your own draft documents' },
        { status: 403 }
      );
    }

    // Log deletion BEFORE actually deleting (while document still exists)
    const { ipAddress, userAgent } = ActivityLogger.extractRequestMetadata(request);
    await ActivityLogger.logActivity({
      userId: actualUserId,
      action: 'delete_document',
      documentId,
      branchBaCode: document.branchBaCode,
      details: {
        originalFilename: document.originalFilename,
        mtNumber: document.mtNumber,
        deletedBy: actualUserId
      },
      ipAddress,
      userAgent
    });

    // Delete document
    const deleted = await DocumentService.deleteDocument(documentId);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete document' },
        { status: 500 }
      );
    }

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

    if (isNaN(documentId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid document ID' },
        { status: 400 }
      );
    }

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

    // Get existing document first to check ownership
    const existingDocument = await DocumentService.getDocumentById(documentId);
    if (!existingDocument) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      );
    }

    // Check if user can update this document (owner or admin or has upload permission)
    const isOwner = existingDocument.uploaderId === actualUserId;
    const isAdmin = await DocFlowAuth.hasRole(actualUserId, 'admin');
    const hasUploadPermission = await DocFlowAuth.hasPermission(actualUserId, DOCFLOW_PERMISSIONS.DOCUMENTS_UPLOAD);
    
    // Allow document updates if user is owner, admin, or has upload permissions
    if (!isOwner && !isAdmin && !hasUploadPermission) {
      return NextResponse.json(
        { success: false, error: 'Access denied - you can only update your own documents' },
        { status: 403 }
      );
    }

    // Parse JSON body for metadata update
    const updateData = await request.json();
    const { branchBaCode, mtNumber, mtDate, subject, monthYear } = updateData;

    // Validate required fields
    if (!branchBaCode || !mtNumber || !mtDate || !subject || !monthYear) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: branchBaCode, mtNumber, mtDate, subject, monthYear' 
        },
        { status: 400 }
      );
    }

    // Validate branch access
    const hasAccessToBranch = await DocFlowAuth.validateBranchAccess(actualUserId, branchBaCode);
    if (!hasAccessToBranch) {
      return NextResponse.json(
        { success: false, error: 'Access denied to this branch' },
        { status: 403 }
      );
    }

    // Update document metadata
    const updatedDocument = await DocumentService.updateDocumentMetadata(documentId, {
      branchBaCode,
      mtNumber,
      mtDate,
      subject,
      monthYear
    });

    if (!updatedDocument) {
      return NextResponse.json(
        { success: false, error: 'Failed to update document' },
        { status: 500 }
      );
    }

    // Log update
    const { ipAddress, userAgent } = ActivityLogger.extractRequestMetadata(request);
    await ActivityLogger.logActivity({
      userId: actualUserId,
      action: 'update_document_metadata',
      documentId,
      branchBaCode,
      details: {
        originalFilename: existingDocument.originalFilename,
        mtNumber,
        subject,
        updatedFields: ['metadata']
      },
      ipAddress,
      userAgent
    });

    const response: ApiResponse<typeof updatedDocument> = {
      success: true,
      data: updatedDocument,
      message: 'Document updated successfully'
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error updating document:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params: paramsPromise }: RouteParams) {
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

    if (isNaN(documentId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid document ID' },
        { status: 400 }
      );
    }

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

    // Get existing document first to check ownership
    const existingDocument = await DocumentService.getDocumentById(documentId);
    if (!existingDocument) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      );
    }

    // Check if user can update this document (owner or admin or has upload permission)
    const isOwner = existingDocument.uploaderId === actualUserId;
    const isAdmin = await DocFlowAuth.hasRole(actualUserId, 'admin');
    const hasUploadPermission = await DocFlowAuth.hasPermission(actualUserId, DOCFLOW_PERMISSIONS.DOCUMENTS_UPLOAD);
    
    // Allow document updates if user is owner, admin, or has upload permissions
    if (!isOwner && !isAdmin && !hasUploadPermission) {
      return NextResponse.json(
        { success: false, error: 'Access denied - you can only update your own documents' },
        { status: 403 }
      );
    }

    // Handle file upload and form data
    const { ipAddress, userAgent } = ActivityLogger.extractRequestMetadata(request);
    
    let file, formData;
    try {
      const result = await StreamingFileHandler.handleFileUpload(request);
      file = result.file;
      formData = result.formData;
    } catch (fileError) {
      console.error('File upload error:', fileError);
      throw fileError;
    }

    // Extract and validate metadata
    const branchBaCode = parseInt(formData.get('branchBaCode') as string);
    const mtNumber = formData.get('mtNumber') as string;
    const mtDate = formData.get('mtDate') as string;
    const subject = formData.get('subject') as string;
    const monthYear = formData.get('monthYear') as string;

    if (!branchBaCode || !mtNumber || !mtDate || !subject || !monthYear) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: branchBaCode, mtNumber, mtDate, subject, monthYear' 
        },
        { status: 400 }
      );
    }

    // Validate branch access
    const hasAccessToBranch = await DocFlowAuth.validateBranchAccess(actualUserId, branchBaCode);
    if (!hasAccessToBranch) {
      return NextResponse.json(
        { success: false, error: 'Access denied to this branch' },
        { status: 403 }
      );
    }

    const metadata: DocumentUploadData = {
      branchBaCode,
      mtNumber,
      mtDate,
      subject,
      monthYear
    };

    // Update document with new file and metadata
    const updatedDocument = await DocumentService.updateDocument(documentId, file, metadata, actualUserId);

    if (!updatedDocument) {
      return NextResponse.json(
        { success: false, error: 'Failed to update document' },
        { status: 500 }
      );
    }

    // Log update
    await ActivityLogger.logActivity({
      userId: actualUserId,
      action: 'update_document_file',
      documentId,
      branchBaCode,
      details: {
        originalFilename: file.name,
        fileSize: file.size,
        mtNumber,
        subject,
        updatedFields: ['file', 'metadata']
      },
      ipAddress,
      userAgent
    });

    const response: ApiResponse<typeof updatedDocument> = {
      success: true,
      data: updatedDocument,
      message: 'Document updated successfully'
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error updating document with file:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}