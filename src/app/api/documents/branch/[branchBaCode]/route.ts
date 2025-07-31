import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { DocumentService } from '@/lib/services/document-service';
import { DocFlowAuth } from '@/lib/auth/docflow-auth';
import { DocumentStatus, ApiResponse } from '@/lib/types';
import { 
  branchBaCodeSchema, 
  documentSearchSchema
} from '@/lib/validation/schemas';
import { 
  ValidationError,
  validateParams,
  validateQuery,
  handleValidationError 
} from '@/lib/validation/middleware';
import { rateLimiters, addRateLimitHeaders } from '@/lib/rate-limit';
import { withCache } from '@/lib/cache/cache-middleware';

interface RouteParams {
  params: Promise<{
    branchBaCode: string;
  }>;
}

async function getHandler(request: NextRequest, { params: paramsPromise }: RouteParams) {
  const params = await paramsPromise;
  try {
    // Apply general API rate limiting
    const apiRateLimit = await rateLimiters.api.checkLimit(request);
    if (!apiRateLimit.success) {
      const response = NextResponse.json(
        {
          success: false,
          error: 'Too Many Requests',
          message: 'API rate limit exceeded. Please try again later.',
          retryAfter: apiRateLimit.retryAfter
        },
        { status: 429 }
      );
      addRateLimitHeaders(response, apiRateLimit);
      return response;
    }

    // Validate path parameters
    let validatedParams;
    try {
      validatedParams = validateParams(params, branchBaCodeSchema);
    } catch (validationError) {
      if (validationError instanceof ValidationError) {
        return handleValidationError(validationError);
      }
      throw validationError;
    }

    const branchBaCode = validatedParams.branchBaCode;

    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const username = session.user.id;

    // Get user from database by username to get the actual numeric ID
    const { getDb } = await import('@/db');
    const { users } = await import('@/db/schema');
    const { eq } = await import('drizzle-orm');
    
    const db = await getDb();
    const user = await db.query.users.findFirst({
      where: eq(users.username, username)
    });
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 401 }
      );
    }
    
    const actualUserId = user.id;

    // Validate branch access
    console.log('Branch API - Validating access for user:', actualUserId, 'to branch:', branchBaCode);
    const hasAccessToBranch = await DocFlowAuth.validateBranchAccess(actualUserId, branchBaCode);
    console.log('Branch API - Access validation result:', hasAccessToBranch);
    
    if (!hasAccessToBranch) {
      console.log('Branch API - Access denied to branch:', branchBaCode);
      return NextResponse.json(
        { success: false, error: 'Access denied to this branch' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);

    // Validate query parameters with Zod schema
    let validatedQuery;
    try {
      validatedQuery = validateQuery(searchParams, documentSearchSchema);
      console.log('Branch API - Query parameters validated successfully');
    } catch (validationError) {
      console.error('Branch API - Query validation error:', validationError);
      if (validationError instanceof ValidationError) {
        return handleValidationError(validationError);
      }
      throw validationError;
    }

    const { search, status, page, limit, dateFrom, dateTo } = validatedQuery;
    const dateFromObj = dateFrom ? new Date(dateFrom) : undefined;
    const dateToObj = dateTo ? new Date(dateTo) : undefined;

    // All validation is now handled by Zod schemas

    // Get documents for the branch
    const result = await DocumentService.getDocumentsByBranch(branchBaCode, {
      status: status as any,
      dateFrom: dateFromObj,
      dateTo: dateToObj,
      search,
      page,
      limit
    });

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result
    };

    const jsonResponse = NextResponse.json(response);
    addRateLimitHeaders(jsonResponse, apiRateLimit);
    return jsonResponse;

  } catch (error) {
    console.error('Error fetching branch documents:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace available');
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      name: error instanceof Error ? error.name : 'Unknown',
      branchBaCode: params.branchBaCode
    });
    
    if (error instanceof ValidationError) {
      return handleValidationError(error);
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : undefined
      },
      { status: 500 }
    );
  }
}

// Export cached GET handler
export const GET = withCache(
  (request: NextRequest, context: any) => getHandler(request, context),
  {
    ttl: 300, // 5 minutes
    keyGenerator: (req) => {
      const url = new URL(req.url);
      const branchBaCode = url.pathname.split('/').pop();
      return `branch_documents:${branchBaCode}${url.search}`;
    },
    shouldCache: (req, res) => res.status === 200,
    tags: ['documents'],
    prefix: 'api'
  }
);