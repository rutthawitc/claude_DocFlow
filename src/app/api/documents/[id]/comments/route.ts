import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { DocumentService } from '@/lib/services/document-service';
import { ActivityLogger } from '@/lib/services/activity-logger';
import { DocFlowAuth, DOCFLOW_PERMISSIONS } from '@/lib/auth/docflow-auth';
import { ApiResponse } from '@/lib/types';
import { 
  commentCreateSchema, 
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

export async function POST(request: NextRequest, { params: paramsPromise }: RouteParams) {
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
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 401 }
      );
    }
    
    const userId = user.id; // This is the numeric database ID

    // Validate request body
    let validatedBody;
    try {
      validatedBody = await validateBody(request, commentCreateSchema);
    } catch (validationError) {
      if (validationError instanceof ValidationError) {
        return handleValidationError(validationError);
      }
      throw validationError;
    }

    const { content } = validatedBody;

    // Check comment creation permission
    const hasCommentPermission = await DocFlowAuth.hasPermission(userId, DOCFLOW_PERMISSIONS.COMMENTS_CREATE);
    if (!hasCommentPermission) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions to add comments' },
        { status: 403 }
      );
    }

    // Get document to check access and get branch info
    const document = await DocumentService.getDocumentById(documentId);
    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      );
    }

    // Get user roles for access check
    const { roles } = await DocFlowAuth.getUserRolesAndPermissions(userId);

    // Check if user can access this document
    const canAccess = await DocumentService.canUserAccessDocument(userId, documentId, roles);
    if (!canAccess) {
      return NextResponse.json(
        { success: false, error: 'Access denied to this document' },
        { status: 403 }
      );
    }

    // Add comment (content is already trimmed by validation)
    const comment = await DocumentService.addComment(documentId, userId, content);

    // Log comment addition
    const { ipAddress, userAgent } = ActivityLogger.extractRequestMetadata(request);
    await ActivityLogger.logCommentAdded(
      userId,
      documentId,
      document.branchBaCode,
      comment.comment.id,
      ipAddress,
      userAgent
    );

    const response: ApiResponse<typeof comment> = {
      success: true,
      data: comment,
      message: 'Comment added successfully'
    };

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    console.error('Error adding comment:', error);
    
    if (error instanceof ValidationError) {
      return handleValidationError(error);
    }
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest, { params: paramsPromise }: RouteParams) {
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

    // Check comment read permission
    const hasReadPermission = await DocFlowAuth.hasPermission(actualUserId, DOCFLOW_PERMISSIONS.COMMENTS_READ);
    if (!hasReadPermission) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions to read comments' },
        { status: 403 }
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

    // Get document with comments
    const document = await DocumentService.getDocumentById(documentId);
    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      );
    }

    const response: ApiResponse<typeof document.comments> = {
      success: true,
      data: document.comments || []
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching comments:', error);
    
    if (error instanceof ValidationError) {
      return handleValidationError(error);
    }
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}