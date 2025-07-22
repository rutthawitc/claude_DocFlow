import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { DocumentService } from '@/lib/services/document-service';
import { DocFlowAuth } from '@/lib/auth/docflow-auth';
import { DocumentStatus, ApiResponse } from '@/lib/types';

interface RouteParams {
  params: {
    branchBaCode: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = parseInt(session.user.id);
    const branchBaCode = parseInt(params.branchBaCode);

    if (isNaN(branchBaCode)) {
      return NextResponse.json(
        { success: false, error: 'Invalid branch BA code' },
        { status: 400 }
      );
    }

    // Validate branch access
    const hasAccessToBranch = await DocFlowAuth.validateBranchAccess(userId, branchBaCode);
    if (!hasAccessToBranch) {
      return NextResponse.json(
        { success: false, error: 'Access denied to this branch' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const status = searchParams.get('status') || 'all';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const dateFrom = searchParams.get('dateFrom') ? new Date(searchParams.get('dateFrom')!) : undefined;
    const dateTo = searchParams.get('dateTo') ? new Date(searchParams.get('dateTo')!) : undefined;

    // Validate status parameter
    if (status !== 'all' && !Object.values(DocumentStatus).includes(status as DocumentStatus)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid status. Must be one of: all, ' + Object.values(DocumentStatus).join(', ')
        },
        { status: 400 }
      );
    }

    // Validate pagination parameters
    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json(
        { success: false, error: 'Invalid pagination parameters. Page must be >= 1, limit must be 1-100' },
        { status: 400 }
      );
    }

    // Get documents for the branch
    const result = await DocumentService.getDocumentsByBranch(branchBaCode, {
      status: status as any,
      dateFrom,
      dateTo,
      search,
      page,
      limit
    });

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching branch documents:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}