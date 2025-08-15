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

// POST - Upload document with specialized handler
export async function POST(request: NextRequest) {
  return handleDocumentUpload(request);
}

// GET - Search and list documents
export const GET = withAuthHandler(
  async (request, { user, validatedData }) => {
    const { search, status, page, limit, dateFrom, dateTo } = validatedData.query;
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
      return ApiResponseHandler.successPaginated(
        [],
        0,
        page,
        limit
      );
    }

    // For draft documents, only allow users with upload permissions to see them
    let result;
    if (status === 'draft') {
      if (!canViewDrafts) {
        return ApiResponseHandler.successPaginated(
          [],
          0,
          page,
          limit
        );
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

    return ApiResponseHandler.success(result);
  },
  {
    requireAuth: true,
    rateLimit: 'api',
    validation: {
      query: documentSearchSchema
    }
  }
);