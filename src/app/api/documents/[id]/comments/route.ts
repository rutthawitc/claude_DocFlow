import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/api-auth';
import { ApiResponseHandler } from '@/lib/middleware/api-responses';
import { DocumentService } from '@/lib/services/document-service';
import { ActivityLogger } from '@/lib/services/activity-logger';
import { DOCFLOW_PERMISSIONS } from '@/lib/auth/docflow-auth';
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
    // Authenticate user
    const { user } = await withAuth(request, {
      requiredPermissions: [DOCFLOW_PERMISSIONS.COMMENTS_CREATE]
    });

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

    // Get document to check access and get branch info
    const document = await DocumentService.getDocumentById(documentId);
    if (!document) {
      return ApiResponseHandler.notFound('Document not found');
    }

    // Get user roles for access check
    const { DocFlowAuth } = await import('@/lib/auth/docflow-auth');
    const { roles } = await DocFlowAuth.getUserRolesAndPermissions(user.databaseId);

    // Check if user can access this document
    const canAccess = await DocumentService.canUserAccessDocument(user.databaseId, documentId, roles);
    if (!canAccess) {
      return ApiResponseHandler.forbidden('Access denied to this document');
    }

    // Add comment (content is already trimmed by validation)
    const comment = await DocumentService.addComment(documentId, user.databaseId, content);

    // Log comment addition
    const { ipAddress, userAgent } = ActivityLogger.extractRequestMetadata(request);
    await ActivityLogger.logCommentAdded(
      user.databaseId,
      documentId,
      document.branchBaCode,
      comment.comment.id,
      ipAddress,
      userAgent
    );

    return ApiResponseHandler.success(comment, 'Comment added successfully', 201);

  } catch (error) {
    console.error('Error adding comment:', error);
    return ApiResponseHandler.fromError(error);
  }
}

export async function GET(request: NextRequest, { params: paramsPromise }: RouteParams) {
  const params = await paramsPromise;
  
  try {
    // Authenticate user
    const { user } = await withAuth(request, {
      requiredPermissions: [DOCFLOW_PERMISSIONS.COMMENTS_READ]
    });

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
    console.log('📄 Comments API - Document ID:', documentId);
    console.log('👤 Comments API - User ID:', user.databaseId);

    // Get user roles for access check
    const { DocFlowAuth } = await import('@/lib/auth/docflow-auth');
    const { roles } = await DocFlowAuth.getUserRolesAndPermissions(user.databaseId);

    // Check if user can access this document
    const canAccess = await DocumentService.canUserAccessDocument(user.databaseId, documentId, roles);
    if (!canAccess) {
      return ApiResponseHandler.forbidden('Access denied to this document');
    }

    // Get document with comments
    const document = await DocumentService.getDocumentById(documentId);
    if (!document) {
      return ApiResponseHandler.notFound('Document not found');
    }

    console.log('💬 Comments API - Found comments:', document.comments?.length || 0);
    console.log('💬 Comments API - Sample comment structure:', document.comments?.[0]);
    
    // Ensure we return the comments array
    const comments = document.comments || [];
    console.log('💬 Comments API - Returning comments:', comments);

    return ApiResponseHandler.success(comments);

  } catch (error) {
    console.error('Error fetching comments:', error);
    return ApiResponseHandler.fromError(error);
  }
}