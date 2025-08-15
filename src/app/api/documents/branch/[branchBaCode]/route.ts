import { NextRequest, NextResponse } from 'next/server';
import { withAuthHandler } from '@/lib/middleware/api-auth';
import { DocumentService } from '@/lib/services/document-service';
import { DocFlowAuth } from '@/lib/auth/docflow-auth';
import { ApiResponse } from '@/lib/types';
import { 
  branchBaCodeSchema, 
  documentSearchSchema
} from '@/lib/validation/schemas';
import { withCache } from '@/lib/cache/cache-middleware';

// GET handler with authentication and validation
const getHandler = withAuthHandler(async (request, { user, params, validatedData }) => {
  const { branchBaCode } = validatedData.params;
  const { search, status, page, limit, dateFrom, dateTo } = validatedData.query;
  
  // Validate branch access
  console.log('Branch API - Validating access for user:', user.databaseId, 'to branch:', branchBaCode);
  const hasAccessToBranch = await DocFlowAuth.validateBranchAccess(user.databaseId, branchBaCode);
  console.log('Branch API - Access validation result:', hasAccessToBranch);
  
  if (!hasAccessToBranch) {
    console.log('Branch API - Access denied to branch:', branchBaCode);
    return NextResponse.json(
      { success: false, error: 'Access denied to this branch' },
      { status: 403 }
    );
  }

  const dateFromObj = dateFrom ? new Date(dateFrom) : undefined;
  const dateToObj = dateTo ? new Date(dateTo) : undefined;

  // Check if user can view draft documents
  const { roles } = await DocFlowAuth.getUserRolesAndPermissions(user.databaseId);
  const canViewDrafts = roles.includes('uploader') || 
                       roles.includes('admin') || 
                       roles.includes('district_manager');

  // For draft documents, only allow users with upload permissions to see them
  if (status === 'draft' && !canViewDrafts) {
    const response: ApiResponse<any> = {
      success: true,
      data: {
        data: [],
        total: 0,
        page,
        limit,
        totalPages: 0
      }
    };
    return NextResponse.json(response);
  }

  // Get documents for the branch - exclude draft documents for users without upload permissions
  const effectiveStatus = (status === 'all' && !canViewDrafts) ? 'non-draft' : status;
  
  const result = await DocumentService.getDocumentsByBranch(branchBaCode, {
    status: effectiveStatus as any,
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

  return NextResponse.json(response);
}, {
  requireAuth: true,
  rateLimit: 'api',
  validation: {
    params: branchBaCodeSchema,
    query: documentSearchSchema
  }
});

// Export cached GET handler
export const GET = withCache(
  getHandler,
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