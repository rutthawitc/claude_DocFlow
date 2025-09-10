import { NextRequest, NextResponse } from 'next/server';
import { withAuthHandler } from '@/lib/middleware/api-auth';
import { getDb } from '@/db';
import { additionalDocumentFiles, documents } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET: List additional files for a document
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
        
        // Get additional files for this document
        const files = await db
          .select()
          .from(additionalDocumentFiles)
          .where(eq(additionalDocumentFiles.documentId, documentId))
          .orderBy(additionalDocumentFiles.itemIndex);

        return NextResponse.json({
          success: true,
          data: files
        });
      } catch (error) {
        console.error('Error fetching additional files:', error);
        return NextResponse.json(
          { success: false, error: 'Failed to fetch additional files' },
          { status: 500 }
        );
      }
    }
  )(request);
}

// POST: Upload additional file
export async function POST(request: NextRequest, { params: paramsPromise }: RouteParams) {
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

        const formData = await request.formData();
        const file = formData.get('file') as File;
        const itemIndex = parseInt(formData.get('itemIndex') as string);
        const itemName = formData.get('itemName') as string;

        if (!file || isNaN(itemIndex) || !itemName) {
          return NextResponse.json(
            { success: false, error: 'Missing required fields' },
            { status: 400 }
          );
        }

        // Validate file type (PDF only)
        if (file.type !== 'application/pdf') {
          return NextResponse.json(
            { success: false, error: 'Only PDF files are allowed' },
            { status: 400 }
          );
        }

        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
          return NextResponse.json(
            { success: false, error: 'File size too large (max 10MB)' },
            { status: 400 }
          );
        }

        const db = await getDb();

        // Verify document exists and user has access
        const document = await db
          .select()
          .from(documents)
          .where(eq(documents.id, documentId))
          .limit(1);

        if (document.length === 0) {
          return NextResponse.json(
            { success: false, error: 'Document not found' },
            { status: 404 }
          );
        }

        // Create uploads directory if it doesn't exist
        const uploadsDir = path.join(process.cwd(), 'uploads', 'additional-docs', documentId.toString());
        if (!existsSync(uploadsDir)) {
          await mkdir(uploadsDir, { recursive: true });
        }

        // Generate filename
        const timestamp = Date.now();
        const filename = `additional-doc-${itemIndex}-${timestamp}.pdf`;
        const filePath = path.join(uploadsDir, filename);
        const relativeFilePath = `uploads/additional-docs/${documentId}/${filename}`;

        // Save file
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await writeFile(filePath, buffer);

        // Check if file already exists for this item and replace it
        const existingFile = await db
          .select()
          .from(additionalDocumentFiles)
          .where(
            and(
              eq(additionalDocumentFiles.documentId, documentId),
              eq(additionalDocumentFiles.itemIndex, itemIndex)
            )
          )
          .limit(1);

        if (existingFile.length > 0) {
          // Update existing file
          await db
            .update(additionalDocumentFiles)
            .set({
              filePath: relativeFilePath,
              originalFilename: file.name,
              fileSize: file.size,
              uploaderId: user.databaseId,
              updatedAt: new Date()
            })
            .where(eq(additionalDocumentFiles.id, existingFile[0].id));
        } else {
          // Insert new file record
          await db.insert(additionalDocumentFiles).values({
            documentId,
            itemIndex,
            itemName,
            filePath: relativeFilePath,
            originalFilename: file.name,
            fileSize: file.size,
            uploaderId: user.databaseId
          });
        }

        return NextResponse.json({
          success: true,
          message: 'File uploaded successfully'
        });
      } catch (error) {
        console.error('Error uploading additional file:', error);
        return NextResponse.json(
          { success: false, error: 'Failed to upload file' },
          { status: 500 }
        );
      }
    }
  )(request);
}

// DELETE: Remove additional file
export async function DELETE(request: NextRequest, { params: paramsPromise }: RouteParams) {
  const params = await paramsPromise;
  return withAuthHandler(
    async (request, { user }) => {
      try {
        const documentId = parseInt(params.id);
        const { searchParams } = new URL(request.url);
        const itemIndex = parseInt(searchParams.get('itemIndex') || '');

        if (isNaN(documentId) || isNaN(itemIndex)) {
          return NextResponse.json(
            { success: false, error: 'Invalid parameters' },
            { status: 400 }
          );
        }

        const db = await getDb();

        // Delete file record
        await db
          .delete(additionalDocumentFiles)
          .where(
            and(
              eq(additionalDocumentFiles.documentId, documentId),
              eq(additionalDocumentFiles.itemIndex, itemIndex)
            )
          );

        return NextResponse.json({
          success: true,
          message: 'File deleted successfully'
        });
      } catch (error) {
        console.error('Error deleting additional file:', error);
        return NextResponse.json(
          { success: false, error: 'Failed to delete file' },
          { status: 500 }
        );
      }
    }
  )(request);
}