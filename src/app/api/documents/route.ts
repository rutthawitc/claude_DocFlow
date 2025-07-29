import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { DocumentService } from '@/lib/services/document-service';
import { StreamingFileHandler } from '@/lib/services/file-service';
import { ActivityLogger } from '@/lib/services/activity-logger';
import { DocFlowAuth, DOCFLOW_PERMISSIONS } from '@/lib/auth/docflow-auth';
import { DocumentUploadData, ApiResponse, DocumentUploadError } from '@/lib/types';
import { 
  documentUploadSchema, 
  documentSearchSchema
} from '@/lib/validation/schemas';
import { 
  ValidationError,
  validateFormData, 
  validateQuery,
  handleValidationError 
} from '@/lib/validation/middleware';
import { rateLimiters, addRateLimitHeaders } from '@/lib/rate-limit';
import { NotificationService } from '@/lib/services/notification-service';
import { BranchService } from '@/lib/services/branch-service';

export async function POST(request: NextRequest) {
  try {
    // Apply upload rate limiting
    const uploadRateLimit = await rateLimiters.upload.checkLimit(request);
    if (!uploadRateLimit.success) {
      const response = NextResponse.json(
        {
          success: false,
          error: 'Too Many Requests',
          message: 'Upload rate limit exceeded. Please try again later.',
          retryAfter: uploadRateLimit.retryAfter
        },
        { status: 429 }
      );
      addRateLimitHeaders(response, uploadRateLimit);
      return response;
    }

    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const username = session.user.id; // This is actually the username (11008)
    
    // Get user from database by username to get the actual numeric ID
    const { getDb } = await import('@/db');
    const { users } = await import('@/db/schema');
    const { eq } = await import('drizzle-orm');
    
    const db = await getDb();
    const user = await db.query.users.findFirst({
      where: eq(users.username, username)
    });
    
    if (!user) {
      console.error('User not found in database:', username);
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 401 }
      );
    }
    
    const actualUserId = user.id; // This is the numeric database ID
    console.log('Documents API - Username:', username);
    console.log('Documents API - Actual user DB ID:', actualUserId);

    // Check permissions
    const hasUploadPermission = await DocFlowAuth.hasPermission(actualUserId, DOCFLOW_PERMISSIONS.DOCUMENTS_UPLOAD);
    const hasCreatePermission = await DocFlowAuth.hasPermission(actualUserId, DOCFLOW_PERMISSIONS.DOCUMENTS_CREATE);
    
    console.log('Documents API - Has upload permission:', hasUploadPermission);
    console.log('Documents API - Has create permission:', hasCreatePermission);
    
    if (!hasUploadPermission && !hasCreatePermission) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions to upload documents' },
        { status: 403 }
      );
    }

    // Extract request metadata for logging
    const { ipAddress, userAgent } = ActivityLogger.extractRequestMetadata(request);
    console.log('Documents API - Starting file upload handling...');

    // Handle file upload
    let file, formData;
    try {
      const result = await StreamingFileHandler.handleFileUpload(request);
      file = result.file;
      formData = result.formData;
      console.log('Documents API - File upload handled successfully');
      console.log('Documents API - File name:', file.name, 'Size:', file.size);
    } catch (fileError) {
      console.error('Documents API - File upload error:', fileError);
      throw fileError;
    }

    // Validate form data with Zod schema
    console.log('Documents API - Validating form data...');
    let validatedData;
    try {
      validatedData = validateFormData(formData, documentUploadSchema);
      console.log('Documents API - Form data validated successfully');
    } catch (validationError) {
      console.error('Documents API - Validation error:', validationError);
      if (validationError instanceof ValidationError) {
        return handleValidationError(validationError);
      }
      throw validationError;
    }

    // Validate branch access
    const hasAccessToBranch = await DocFlowAuth.validateBranchAccess(actualUserId, validatedData.branchBaCode);
    if (!hasAccessToBranch) {
      return NextResponse.json(
        { success: false, error: 'Access denied to this branch' },
        { status: 403 }
      );
    }

    const metadata: DocumentUploadData = {
      branchBaCode: validatedData.branchBaCode,
      mtNumber: validatedData.mtNumber,
      mtDate: validatedData.mtDate,
      subject: validatedData.subject,
      monthYear: validatedData.monthYear
    };

    // Create document
    console.log('Documents API - Creating document...');
    let document;
    try {
      document = await DocumentService.createDocument(file, metadata, actualUserId);
      console.log('Documents API - Document created successfully:', document.id);
    } catch (createError) {
      console.error('Documents API - Document creation error:', createError);
      throw createError;
    }

    // Log document creation
    await ActivityLogger.logDocumentCreation(
      actualUserId,
      document.id,
      validatedData.branchBaCode,
      {
        originalFilename: file.name,
        fileSize: file.size,
        mtNumber: validatedData.mtNumber,
        subject: validatedData.subject
      },
      ipAddress,
      userAgent
    );

    // Send Telegram notification for document upload
    try {
      const branch = await BranchService.getBranchByBaCode(validatedData.branchBaCode);
      const userFullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username;
      
      await NotificationService.sendDocumentNotification({
        documentId: document.id,
        mtNumber: validatedData.mtNumber,
        subject: validatedData.subject,
        branchBaCode: validatedData.branchBaCode,
        branchName: branch?.name || `BA ${validatedData.branchBaCode}`,
        userName: user.username,
        userFullName: userFullName,
        action: 'uploaded',
        timestamp: new Date()
      });
    } catch (notificationError) {
      console.error('Failed to send upload notification:', notificationError);
      // Don't fail the upload if notification fails
    }

    const response: ApiResponse<typeof document> = {
      success: true,
      data: document,
      message: 'Document uploaded successfully'
    };

    const jsonResponse = NextResponse.json(response, { status: 201 });
    addRateLimitHeaders(jsonResponse, uploadRateLimit);
    return jsonResponse;

  } catch (error) {
    console.error('Document upload error:', error);

    if (error instanceof ValidationError) {
      return handleValidationError(error);
    }

    if (error instanceof DocumentUploadError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'File validation failed',
          message: error.validationErrors.map(e => e.message).join(', ')
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Apply general API rate limiting
    const apiRateLimit = await rateLimiters.api.checkLimit(request);
    if (!apiRateLimit.success) {
      const response = NextResponse.json(
        {
          success: false,
          error: 'Too Many Requests',
          message: 'API rate limit exceeded. Please try again later.',
          retryAfter: apiRateLimit.retryAfter
        },
        { status: 429 }
      );
      addRateLimitHeaders(response, apiRateLimit);
      return response;
    }

    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const username = session.user.id; // This is actually the username (11008)
    
    // Get user from database by username to get the actual numeric ID
    const { getDb } = await import('@/db');
    const { users } = await import('@/db/schema');
    const { eq } = await import('drizzle-orm');
    
    const db = await getDb();
    const user = await db.query.users.findFirst({
      where: eq(users.username, username)
    });
    
    if (!user) {
      console.error('User not found in database:', username);
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 401 }
      );
    }
    
    const actualUserId = user.id; // This is the numeric database ID
    
    const { searchParams } = new URL(request.url);

    // Validate query parameters with Zod schema
    let validatedQuery;
    try {
      validatedQuery = validateQuery(searchParams, documentSearchSchema);
      console.log('Documents API - Query parameters validated successfully');
    } catch (validationError) {
      console.error('Documents API - Query validation error:', validationError);
      if (validationError instanceof ValidationError) {
        return handleValidationError(validationError);
      }
      throw validationError;
    }

    const { search, status, page, limit, dateFrom, dateTo } = validatedQuery;
    const dateFromObj = dateFrom ? new Date(dateFrom) : undefined;
    const dateToObj = dateTo ? new Date(dateTo) : undefined;

    // Get user roles and accessible branches
    const { roles } = await DocFlowAuth.getUserRolesAndPermissions(actualUserId);
    const accessibleBranches = await DocumentService.getUserAccessibleBranches(actualUserId, roles);

    if (accessibleBranches.length === 0 && status !== 'draft') {
      return NextResponse.json({
        success: true,
        data: {
          data: [],
          total: 0,
          page,
          limit,
          totalPages: 0
        }
      });
    }

    // For draft documents, get user's own documents regardless of branch access
    let result;
    if (status === 'draft') {
      result = await DocumentService.getUserOwnDocuments(actualUserId, {
        status: status as any,
        dateFrom: dateFromObj,
        dateTo: dateToObj,
        page,
        limit,
        search
      });
    } else {
      // Search documents
      result = await DocumentService.searchDocuments(search, accessibleBranches, {
        status: status as any,
        dateFrom: dateFromObj,
        dateTo: dateToObj,
        page,
        limit
      });
    }

    const jsonResponse = NextResponse.json({
      success: true,
      data: result
    });
    addRateLimitHeaders(jsonResponse, apiRateLimit);
    return jsonResponse;

  } catch (error) {
    console.error('Error fetching documents:', error);
    
    if (error instanceof ValidationError) {
      return handleValidationError(error);
    }
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}