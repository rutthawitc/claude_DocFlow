import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { DocumentService } from '@/lib/services/document-service';
import { PDFStreamingService } from '@/lib/services/pdf-streaming-service';
import { DocFlowAuth } from '@/lib/auth/docflow-auth';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: NextRequest, { params: paramsPromise }: RouteParams) {
  const params = await paramsPromise;
  try {
    const documentId = parseInt(params.id);
    
    if (isNaN(documentId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid document ID' },
        { status: 400 }
      );
    }

    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
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

    // Check access permissions
    const hasAccess = await DocFlowAuth.validateBranchAccess(
      parseInt(session.user.id),
      document.branchBaCode
    );

    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Access denied to this document' },
        { status: 403 }
      );
    }

    // Parse range header for HTTP range requests
    const rangeHeader = request.headers.get('range');
    const metadata = await PDFStreamingService.getPDFMetadata(document.filePath);
    
    let streamOptions = {};
    if (rangeHeader) {
      const range = PDFStreamingService.parseRangeHeader(rangeHeader, metadata.size);
      if (range) {
        streamOptions = { start: range.start, end: range.end };
      }
    }

    // Stream the PDF
    const { stream, headers, status, stats } = await PDFStreamingService.streamPDF(
      document.filePath,
      streamOptions
    );

    console.log(`📺 Streaming PDF ${document.originalFilename} to user ${session.user.id}`, {
      range: rangeHeader,
      stats
    });

    // Create response with streaming body
    const response = new NextResponse(stream, {
      status,
      headers: {
        ...headers,
        'X-Document-Id': documentId.toString(),
        'X-Document-Name': document.originalFilename,
        'X-Stream-Stats': JSON.stringify(stats),
      },
    });

    return response;
  } catch (error) {
    console.error('Error streaming document:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to stream document' },
      { status: 500 }
    );
  }
}