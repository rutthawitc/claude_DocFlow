import { NextRequest, NextResponse } from 'next/server';
import { withAuthHandler } from '@/lib/middleware/api-auth';
import { getDb } from '@/db';
import { emendationDocuments, documents } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET: List emendation files for a document
export async function GET(request: NextRequest, { params: paramsPromise }: RouteParams) {
  const params = await paramsPromise;
  return withAuthHandler(
    async (request, { user }) => {
      try {
        const documentId = parseInt(params.id);
        if (isNaN(documentId)) {
          return NextResponse.json(
            { success: false, error: 'Invalid document ID' },
            { status: 400 }
          );
        }

        const db = await getDb();

        // Get emendation files for this document
        const files = await db
          .select()
          .from(emendationDocuments)
          .where(eq(emendationDocuments.documentId, documentId))
          .orderBy(emendationDocuments.createdAt);

        return NextResponse.json({
          success: true,
          data: files
        });
      } catch (error) {
        console.error('Error fetching emendation files:', error);
        return NextResponse.json(
          { success: false, error: 'Failed to fetch emendation files' },
          { status: 500 }
        );
      }
    }
  )(request);
}

// DELETE: Remove emendation file
export async function DELETE(request: NextRequest, { params: paramsPromise }: RouteParams) {
  const params = await paramsPromise;
  return withAuthHandler(
    async (request, { user }) => {
      try {
        const documentId = parseInt(params.id);
        const { searchParams } = new URL(request.url);
        const fileId = parseInt(searchParams.get('fileId') || '');

        if (isNaN(documentId) || isNaN(fileId)) {
          return NextResponse.json(
            { success: false, error: 'Invalid parameters' },
            { status: 400 }
          );
        }

        const db = await getDb();

        // Delete emendation file record
        await db
          .delete(emendationDocuments)
          .where(
            and(
              eq(emendationDocuments.documentId, documentId),
              eq(emendationDocuments.id, fileId)
            )
          );

        return NextResponse.json({
          success: true,
          message: 'Emendation file deleted successfully'
        });
      } catch (error) {
        console.error('Error deleting emendation file:', error);
        return NextResponse.json(
          { success: false, error: 'Failed to delete emendation file' },
          { status: 500 }
        );
      }
    }
  )(request);
}