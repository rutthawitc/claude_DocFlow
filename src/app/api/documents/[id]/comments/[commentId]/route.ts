import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getDb } from '@/db';
import { comments, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { DocFlowAuth, DOCFLOW_PERMISSIONS } from '@/lib/auth/docflow-auth';
import { ActivityLogger } from '@/lib/services/activity-logger';
import { ApiResponse } from '@/lib/types';

interface RouteParams {
  params: Promise<{
    id: string;
    commentId: string;
  }>;
}

export async function PATCH(request: NextRequest, { params: paramsPromise }: RouteParams) {
  const params = await paramsPromise;
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = parseInt(session.user.id);
    const documentId = parseInt(params.id);
    const commentId = parseInt(params.commentId);

    if (isNaN(documentId) || isNaN(commentId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid document ID or comment ID' },
        { status: 400 }
      );
    }

    const { content } = await request.json();

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Comment content is required' },
        { status: 400 }
      );
    }

    const db = getDb();

    // Get current comment
    const [currentComment] = await db
      .select()
      .from(comments)
      .where(eq(comments.id, commentId));

    if (!currentComment) {
      return NextResponse.json(
        { success: false, error: 'Comment not found' },
        { status: 404 }
      );
    }

    // Check if document matches
    if (currentComment.documentId !== documentId) {
      return NextResponse.json(
        { success: false, error: 'Comment does not belong to this document' },
        { status: 400 }
      );
    }

    // Check permission - user can edit their own comment or admin can edit any
    const { roles } = await DocFlowAuth.getUserRolesAndPermissions(userId);
    const canEdit = currentComment.userId === userId || roles.includes('admin');

    if (!canEdit) {
      return NextResponse.json(
        { success: false, error: 'Permission denied to edit this comment' },
        { status: 403 }
      );
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
    await ActivityLogger.log({
      userId,
      action: 'comment_updated',
      resourceType: 'comment',
      resourceId: commentId.toString(),
      metadata: {
        documentId,
        oldContent: currentComment.content,
        newContent: content.trim(),
      },
      ipAddress,
      userAgent,
    });

    const response: ApiResponse<typeof updatedComment> = {
      success: true,
      data: updatedComment,
      message: 'Comment updated successfully'
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error updating comment:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params: paramsPromise }: RouteParams) {
  const params = await paramsPromise;
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = parseInt(session.user.id);
    const documentId = parseInt(params.id);
    const commentId = parseInt(params.commentId);

    if (isNaN(documentId) || isNaN(commentId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid document ID or comment ID' },
        { status: 400 }
      );
    }

    const db = getDb();

    // Get current comment
    const [currentComment] = await db
      .select()
      .from(comments)
      .where(eq(comments.id, commentId));

    if (!currentComment) {
      return NextResponse.json(
        { success: false, error: 'Comment not found' },
        { status: 404 }
      );
    }

    // Check if document matches
    if (currentComment.documentId !== documentId) {
      return NextResponse.json(
        { success: false, error: 'Comment does not belong to this document' },
        { status: 400 }
      );
    }

    // Check permission - user can delete their own comment or admin can delete any
    const { roles } = await DocFlowAuth.getUserRolesAndPermissions(userId);
    const canDelete = currentComment.userId === userId || roles.includes('admin');

    if (!canDelete) {
      return NextResponse.json(
        { success: false, error: 'Permission denied to delete this comment' },
        { status: 403 }
      );
    }

    // Delete comment
    await db
      .delete(comments)
      .where(eq(comments.id, commentId));

    // Log comment deletion
    const { ipAddress, userAgent } = ActivityLogger.extractRequestMetadata(request);
    await ActivityLogger.log({
      userId,
      action: 'comment_deleted',
      resourceType: 'comment',
      resourceId: commentId.toString(),
      metadata: {
        documentId,
        deletedContent: currentComment.content,
      },
      ipAddress,
      userAgent,
    });

    const response: ApiResponse<{}> = {
      success: true,
      data: {},
      message: 'Comment deleted successfully'
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error deleting comment:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}