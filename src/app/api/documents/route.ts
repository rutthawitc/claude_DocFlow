import { NextRequest } from 'next/server';
import { withAuthHandler } from '@/lib/middleware/api-auth';
import { ApiResponseHandler } from '@/lib/middleware/api-responses';
import { handleDocumentUpload } from '@/lib/middleware/document-upload-handler';
import { DocumentService } from '@/lib/services/document-service';
import { DocFlowAuth } from '@/lib/auth/docflow-auth';
import { documentSearchSchema } from '@/lib/validation/schemas';
import { 
  ValidationError,
  validateQuery,
  handleValidationError 
} from '@/lib/validation/middleware';
import { rateLimiters, addRateLimitHeaders } from '@/lib/rate-limit';

// POST - Upload document with specialized handler
export async function POST(request: NextRequest) {
  return handleDocumentUpload(request);
}

// GET - Search and list documents
export const GET = withAuthHandler(
  async (request, { user }) => {
    // Apply general API rate limiting
    const apiRateLimit = await rateLimiters.api.checkLimit(request);
    if (!apiRateLimit.success) {
      const response = ApiResponseHandler.rateLimited(
        'API rate limit exceeded. Please try again later.',
        apiRateLimit.retryAfter
      );
      addRateLimitHeaders(response, apiRateLimit);
      return response;
    }

    const { searchParams } = new URL(request.url);

    // Validate query parameters with Zod schema
    let validatedQuery;
    try {
      validatedQuery = validateQuery(searchParams, documentSearchSchema);
      console.log('Documents API - Query parameters validated successfully');
    } catch (validationError) {
      console.error('Documents API - Query validation error:', validationError);
      if (validationError instanceof ValidationError) {
        return handleValidationError(validationError);
      }
      throw validationError;
    }

    const { search, status, page, limit, dateFrom, dateTo } = validatedQuery;
    const dateFromObj = dateFrom ? new Date(dateFrom) : undefined;
    const dateToObj = dateTo ? new Date(dateTo) : undefined;

    // Get user roles and accessible branches
    const { roles } = await DocFlowAuth.getUserRolesAndPermissions(user.databaseId);
    const accessibleBranches = await DocumentService.getUserAccessibleBranches(user.databaseId, roles);

    // Check if user can view draft documents
    const canViewDrafts = roles.includes('uploader') || 
                         roles.includes('admin') || 
                         roles.includes('district_manager');

    if (accessibleBranches.length === 0 && status !== 'draft') {
      const response = ApiResponseHandler.successPaginated(
        [],
        0,
        page,
        limit
      );
      addRateLimitHeaders(response, apiRateLimit);
      return response;
    }

    // For draft documents, only allow users with upload permissions to see them
    let result;
    if (status === 'draft') {
      if (!canViewDrafts) {
        const response = ApiResponseHandler.successPaginated(
          [],
          0,
          page,
          limit
        );
        addRateLimitHeaders(response, apiRateLimit);
        return response;
      }
      
      result = await DocumentService.getUserOwnDocuments(user.databaseId, {
        status,
        dateFrom: dateFromObj,
        dateTo: dateToObj,
        page,
        limit,
        search
      });
    } else {
      // Search documents - exclude draft documents for users without upload permissions
      const effectiveStatus = (status === 'all' && !canViewDrafts) ? 'non-draft' : status;
      
      result = await DocumentService.searchDocuments(search, accessibleBranches, {
        status: effectiveStatus,
        dateFrom: dateFromObj,
        dateTo: dateToObj,
        page,
        limit
      });
    }

    const response = ApiResponseHandler.success(result);
    addRateLimitHeaders(response, apiRateLimit);
    return response;
  },
  {
    requireAuth: true
  }
);