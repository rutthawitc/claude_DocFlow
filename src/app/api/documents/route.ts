import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { DocumentService } from '@/lib/services/document-service';
import { StreamingFileHandler } from '@/lib/services/file-service';
import { ActivityLogger } from '@/lib/services/activity-logger';
import { DocFlowAuth, DOCFLOW_PERMISSIONS } from '@/lib/auth/docflow-auth';
import { DocumentUploadData, ApiResponse, DocumentUploadError } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
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

    // Validate and extract metadata
    console.log('Documents API - Extracting form data...');
    const branchBaCode = parseInt(formData.get('branchBaCode') as string);
    const mtNumber = formData.get('mtNumber') as string;
    const mtDate = formData.get('mtDate') as string;
    const subject = formData.get('subject') as string;
    const monthYear = formData.get('monthYear') as string;
    
    console.log('Documents API - Form data:', { branchBaCode, mtNumber, mtDate, subject, monthYear });

    // Validate required fields
    if (!branchBaCode || !mtNumber || !mtDate || !subject || !monthYear) {
      console.error('Documents API - Missing required fields:', { branchBaCode, mtNumber, mtDate, subject, monthYear });
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
      branchBaCode,
      {
        originalFilename: file.name,
        fileSize: file.size,
        mtNumber,
        subject
      },
      ipAddress,
      userAgent
    );

    const response: ApiResponse<typeof document> = {
      success: true,
      data: document,
      message: 'Document uploaded successfully'
    };

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    console.error('Document upload error:', error);

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

    // Parse query parameters
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const dateFrom = searchParams.get('dateFrom') ? new Date(searchParams.get('dateFrom')!) : undefined;
    const dateTo = searchParams.get('dateTo') ? new Date(searchParams.get('dateTo')!) : undefined;

    // Get user's accessible branches
    const accessibleBranches = await DocumentService.getUserAccessibleBranches(actualUserId, []);

    if (accessibleBranches.length === 0) {
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

    // Search documents
    const result = await DocumentService.searchDocuments(search, accessibleBranches, {
      status: status as any,
      dateFrom,
      dateTo,
      page,
      limit
    });

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}