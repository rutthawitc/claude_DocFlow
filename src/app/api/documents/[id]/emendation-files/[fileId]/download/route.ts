import { NextRequest, NextResponse } from 'next/server';
import { withAuthHandler } from '@/lib/middleware/api-auth';
import { getDb } from '@/db';
import { emendationDocuments } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { FileStorageService } from '@/lib/services/file-service';

interface RouteParams {
  params: Promise<{
    id: string;
    fileId: string;
  }>;
}

// GET: Download emendation file
export async function GET(request: NextRequest, { params: paramsPromise }: RouteParams) {
  const params = await paramsPromise;
  return withAuthHandler(
    async (request, { user }) => {
      try {
        const documentId = parseInt(params.id);
        const fileId = parseInt(params.fileId);

        if (isNaN(documentId) || isNaN(fileId)) {
          return NextResponse.json(
            { success: false, error: 'Invalid parameters' },
            { status: 400 }
          );
        }

        const db = await getDb();

        // Get emendation file record
        const [file] = await db
          .select()
          .from(emendationDocuments)
          .where(
            and(
              eq(emendationDocuments.documentId, documentId),
              eq(emendationDocuments.id, fileId)
            )
          );

        if (!file) {
          return NextResponse.json(
            { success: false, error: 'File not found' },
            { status: 404 }
          );
        }

        // Extract just the filename from the stored path (remove 'uploads/' prefix if present)
        const filename = file.filePath.replace(/^uploads\//, '');

        // Check if file exists using FileStorageService
        const fileExists = await FileStorageService.fileExists(filename);
        if (!fileExists) {
          return NextResponse.json(
            { success: false, error: 'File not found on disk' },
            { status: 404 }
          );
        }

        try {
          // Read and decrypt file using FileStorageService
          const fileBuffer = await FileStorageService.retrieveFile(filename);

          return new NextResponse(fileBuffer, {
            headers: {
              'Content-Type': 'application/pdf',
              'Content-Disposition': `attachment; filename="${file.originalFilename}"`,
              'Content-Length': file.fileSize.toString(),
            },
          });
        } catch (fileError) {
          console.error('Error reading file:', fileError);
          return NextResponse.json(
            { success: false, error: 'File not found on server' },
            { status: 404 }
          );
        }
      } catch (error) {
        console.error('Error downloading emendation file:', error);
        return NextResponse.json(
          { success: false, error: 'Failed to download file' },
          { status: 500 }
        );
      }
    }
  )(request);
}