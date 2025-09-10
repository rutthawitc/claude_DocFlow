import { NextRequest, NextResponse } from 'next/server';
import { withAuthHandler } from '@/lib/middleware/api-auth';
import { getDb } from '@/db';
import { additionalDocumentFiles } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { readFile } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

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
        const filePath = path.join(process.cwd(), file.filePath);

        // Check if file exists on disk
        if (!existsSync(filePath)) {
          return NextResponse.json(
            { success: false, error: 'File not found on disk' },
            { status: 404 }
          );
        }

        // Read file
        const fileBuffer = await readFile(filePath);

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