import { NextRequest, NextResponse } from 'next/server';
import { withAuthHandler } from '@/lib/middleware/api-auth';
import { getDb } from '@/db';
import { additionalDocumentFiles } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { FileStorageService } from '@/lib/services/file-service';
import path from 'path';

interface RouteParams {
  params: Promise<{
    id: string;
    itemIndex: string;
  }>;
}

// GET: View additional file (for PDF viewer)
export async function GET(request: NextRequest, { params: paramsPromise }: RouteParams) {
  const params = await paramsPromise;
  return withAuthHandler(
    async (request, { user }) => {
      try {
        const documentId = parseInt(params.id);
        const itemIndex = parseInt(params.itemIndex);

        if (isNaN(documentId) || isNaN(itemIndex)) {
          return NextResponse.json(
            { success: false, error: 'Invalid parameters' },
            { status: 400 }
          );
        }

        const db = await getDb();

        // Get file record
        const fileRecord = await db
          .select()
          .from(additionalDocumentFiles)
          .where(
            and(
              eq(additionalDocumentFiles.documentId, documentId),
              eq(additionalDocumentFiles.itemIndex, itemIndex)
            )
          )
          .limit(1);

        if (fileRecord.length === 0) {
          return NextResponse.json(
            { success: false, error: 'File not found' },
            { status: 404 }
          );
        }

        const file = fileRecord[0];

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

        // Read and decrypt file using FileStorageService
        const fileBuffer = await FileStorageService.retrieveFile(filename);

        // Return file for viewing (not downloading)
        return new NextResponse(fileBuffer, {
          headers: {
            'Content-Type': 'application/pdf',
            'Cache-Control': 'no-cache',
            'Content-Length': file.fileSize.toString(),
          },
        });
      } catch (error) {
        console.error('Error viewing additional file:', error);
        return NextResponse.json(
          { success: false, error: 'Failed to view file' },
          { status: 500 }
        );
      }
    }
  )(request);
}