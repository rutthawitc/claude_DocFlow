import { NextRequest, NextResponse } from 'next/server';
import { withAuthHandler } from '@/lib/middleware/api-auth';
import { DocumentService } from '@/lib/services/document-service';
import { StreamingFileHandler } from '@/lib/services/file-service';
import { ActivityLogger } from '@/lib/services/activity-logger';
import { DocFlowAuth } from '@/lib/auth/docflow-auth';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: NextRequest, { params: paramsPromise }: RouteParams) {
  const params = await paramsPromise;
  return withAuthHandler(
    async (request, { user }) => {
    const userId = user.databaseId;
    const documentId = parseInt(params.id);

    if (isNaN(documentId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid document ID' },
        { status: 400 }
      );
    }

    // Get document
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

    // Get file for download
    const { buffer, filename } = await DocumentService.getDocumentFile(documentId);

    // Log download
    try {
      const { ipAddress, userAgent } = ActivityLogger.extractRequestMetadata(request);
      await ActivityLogger.logDocumentDownload(
        userId,
        documentId,
        document.branchBaCode,
        ipAddress,
        userAgent
      );
    } catch (logError) {
      console.error('Failed to log document download:', logError);
      // Continue with download even if logging fails
    }

    // Encode filename to handle Thai characters properly
    const encodedFilename = encodeURIComponent(filename);
    const asciiFilename = filename.replace(/[^\x00-\x7F]/g, ""); // Fallback ASCII name
    
    // Return file as response
    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${asciiFilename || 'document.pdf'}"; filename*=UTF-8''${encodedFilename}`,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'private, max-age=3600'
      }
    });
    },
    {
      requireAuth: true
    }
  )(request, { params });
}