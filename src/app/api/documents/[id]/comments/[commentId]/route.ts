import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/middleware/api-auth';
import { ApiResponseHandler } from '@/lib/middleware/api-responses';
import { getDb } from '@/db';
import { comments, documents } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { DOCFLOW_PERMISSIONS } from '@/lib/auth/docflow-auth';
import { ActivityLogger } from '@/lib/services/activity-logger';

interface RouteParams {
  params: Promise<{
    id: string;
    commentId: string;
  }>;
}

export async function PATCH(request: NextRequest, { params: paramsPromise }: RouteParams) {
  const params = await paramsPromise;
  
  try {
    // Authenticate user
    const { user } = await withAuth(request, {
      requiredPermissions: [DOCFLOW_PERMISSIONS.COMMENTS_UPDATE]
    });

    const documentId = parseInt(params.id);
    const commentId = parseInt(params.commentId);

    if (isNaN(documentId) || isNaN(commentId)) {
      return ApiResponseHandler.badRequest('Invalid document ID or comment ID');
    }

    const { content } = await request.json();

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return ApiResponseHandler.badRequest('Comment content is required');
    }

    const db = await getDb();
    if (!db) {
      return ApiResponseHandler.error('Database connection failed');
    }

    // Get current comment
    const [currentComment] = await db
      .select()
      .from(comments)
      .where(eq(comments.id, commentId));

    if (!currentComment) {
      return ApiResponseHandler.notFound('Comment not found');
    }

    // Get document for branchBaCode
    const [document] = await db
      .select({ branchBaCode: documents.branchBaCode })
      .from(documents)
      .where(eq(documents.id, documentId));

    if (!document) {
      return ApiResponseHandler.notFound('Document not found');
    }

    // Check if user can edit this comment (own comment or admin)
    const { DocFlowAuth } = await import('@/lib/auth/docflow-auth');
    const isAdmin = await DocFlowAuth.hasPermission(user.databaseId, DOCFLOW_PERMISSIONS.ADMIN_FULL_ACCESS);
    const canEdit = currentComment.userId === user.databaseId || isAdmin;

    if (!canEdit) {
      return ApiResponseHandler.forbidden('Permission denied to edit this comment');
    }

    // Update comment
    const [updatedComment] = await db
      .update(comments)
      .set({
        content: content.trim(),
        updatedAt: new Date(),
      })
      .where(eq(comments.id, commentId))
      .returning();

    // Log comment edit
    const { ipAddress, userAgent } = ActivityLogger.extractRequestMetadata(request);
    await ActivityLogger.logActivity({
      userId: user.databaseId,
      action: 'comment_updated',
      documentId,
      branchBaCode: document.branchBaCode,
      details: {
        commentId,
        oldContent: currentComment.content,
        newContent: content.trim(),
      },
      ipAddress,
      userAgent,
    });

    // Invalidate document cache since comment was updated
    const { CacheService } = await import('@/lib/cache/cache-service');
    const cache = CacheService.getInstance();
    await cache.delete(`document:${documentId}`, 'documents');
    await cache.invalidateByTag('documents');
    console.log('🔄 Cache invalidated for document after comment update:', documentId);

    return ApiResponseHandler.success(updatedComment, 'Comment updated successfully');

  } catch (error) {
    console.error('Error updating comment:', error);
    return ApiResponseHandler.fromError(error);
  }
}

export async function DELETE(request: NextRequest, { params: paramsPromise }: RouteParams) {
  const params = await paramsPromise;
  
  try {
    // Authenticate user
    const { user } = await withAuth(request, {
      requiredPermissions: [DOCFLOW_PERMISSIONS.COMMENTS_DELETE]
    });

    const documentId = parseInt(params.id);
    const commentId = parseInt(params.commentId);

    if (isNaN(documentId) || isNaN(commentId)) {
      return ApiResponseHandler.badRequest('Invalid document ID or comment ID');
    }

    const db = await getDb();
    if (!db) {
      return ApiResponseHandler.error('Database connection failed');
    }

    // Get current comment
    const [currentComment] = await db
      .select()
      .from(comments)
      .where(eq(comments.id, commentId));

    if (!currentComment) {
      return ApiResponseHandler.notFound('Comment not found');
    }

    // Get document for branchBaCode
    const [document] = await db
      .select({ branchBaCode: documents.branchBaCode })
      .from(documents)
      .where(eq(documents.id, documentId));

    if (!document) {
      return ApiResponseHandler.notFound('Document not found');
    }

    // Check permission - user can delete their own comment or admin can delete any
    const { DocFlowAuth } = await import('@/lib/auth/docflow-auth');
    const isAdmin = await DocFlowAuth.hasPermission(user.databaseId, DOCFLOW_PERMISSIONS.ADMIN_FULL_ACCESS);
    const canDelete = currentComment.userId === user.databaseId || isAdmin;

    if (!canDelete) {
      return ApiResponseHandler.forbidden('Permission denied to delete this comment');
    }

    // Delete comment
    await db
      .delete(comments)
      .where(eq(comments.id, commentId));

    // Log comment deletion
    const { ipAddress, userAgent } = ActivityLogger.extractRequestMetadata(request);
    await ActivityLogger.logActivity({
      userId: user.databaseId,
      action: 'comment_deleted',
      documentId,
      branchBaCode: document.branchBaCode,
      details: {
        commentId,
        deletedContent: currentComment.content,
      },
      ipAddress,
      userAgent,
    });

    // Invalidate document cache since comment was deleted
    const { CacheService } = await import('@/lib/cache/cache-service');
    const cache = CacheService.getInstance();
    await cache.delete(`document:${documentId}`, 'documents');
    await cache.invalidateByTag('documents');
    console.log('🔄 Cache invalidated for document after comment deletion:', documentId);

    return ApiResponseHandler.success({}, 'Comment deleted successfully');

  } catch (error) {
    console.error('Error deleting comment:', error);
    return ApiResponseHandler.fromError(error);
  }
}