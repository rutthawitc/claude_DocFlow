import { NextRequest } from 'next/server';
import { withAuthHandler } from '@/lib/middleware/api-auth';
import { ApiResponseHandler } from '@/lib/middleware/api-responses';
import { BranchService } from '@/lib/services/branch-service';
import { DocFlowAuth, DOCFLOW_PERMISSIONS } from '@/lib/auth/docflow-auth';

export const GET = withAuthHandler(
  async (request, { user }) => {
    const actualUserId = user.databaseId;
    console.log('Branch API - Username:', user.sessionUserId);
    console.log('Branch API - Actual user DB ID:', actualUserId);
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const includeCounts = searchParams.get('includeCounts') === 'true';
    const search = searchParams.get('search') || '';

    // Check if user has permission to read branch data OR has basic user role
    const hasReadPermission = await DocFlowAuth.hasPermission(actualUserId, DOCFLOW_PERMISSIONS.DOCUMENTS_READ_BRANCH) ||
                             await DocFlowAuth.hasPermission(actualUserId, DOCFLOW_PERMISSIONS.DOCUMENTS_READ_ALL_BRANCHES) ||
                             await DocFlowAuth.hasRole(actualUserId, 'user') ||
                             await DocFlowAuth.hasRole(actualUserId, 'admin') ||
                             await DocFlowAuth.hasRole(actualUserId, 'district_manager') ||
                             await DocFlowAuth.hasRole(actualUserId, 'uploader') ||
                             await DocFlowAuth.hasRole(actualUserId, 'branch_manager');

    console.log('Branch API - Checking permissions...');
    console.log('Branch API - Has read branch perm:', await DocFlowAuth.hasPermission(actualUserId, DOCFLOW_PERMISSIONS.DOCUMENTS_READ_BRANCH));
    console.log('Branch API - Has read all perm:', await DocFlowAuth.hasPermission(actualUserId, DOCFLOW_PERMISSIONS.DOCUMENTS_READ_ALL_BRANCHES));
    console.log('Branch API - Has user role:', await DocFlowAuth.hasRole(actualUserId, 'user'));
    console.log('Branch API - Has admin role:', await DocFlowAuth.hasRole(actualUserId, 'admin'));
    console.log('Branch API - Has district_manager role:', await DocFlowAuth.hasRole(actualUserId, 'district_manager'));
    console.log('Branch API - Has uploader role:', await DocFlowAuth.hasRole(actualUserId, 'uploader'));
    console.log('Branch API - Has branch_manager role:', await DocFlowAuth.hasRole(actualUserId, 'branch_manager'));
    console.log('Branch API - Final permission result:', hasReadPermission);

    if (!hasReadPermission) {
      return ApiResponseHandler.forbidden('Insufficient permissions to access branch data');
    }

    // Get user's role to determine what branches they can see
    const { roles } = await DocFlowAuth.getUserRolesAndPermissions(actualUserId);
    
    let branches;

    if (search) {
      // Search branches
      branches = await BranchService.searchBranches(search);
    } else if (includeCounts) {
      // Get all branches with document counts - pass user roles for draft filtering
      const canViewDrafts = roles.includes('uploader') || 
                           roles.includes('admin') || 
                           roles.includes('district_manager');
      branches = await BranchService.getAllBranchesWithCounts(canViewDrafts);
    } else {
      // Get basic branch list
      branches = await BranchService.getAllBranches();
    }

    // Filter branches based on user access level
    if (!roles.includes('admin') && !roles.includes('district_manager') && !roles.includes('branch_manager') && !roles.includes('uploader')) {
      // For regular branch users, try to show their own branch
      const userWithData = await DocFlowAuth.getUserWithDocFlowData(actualUserId);
      if (userWithData?.branch) {
        branches = branches.filter((branch: { baCode: string; id: number }) => 
          branch.baCode === userWithData.branch!.baCode || branch.id === userWithData.branch!.id
        );
      } else {
        // If user doesn't have a matching branch, show all branches (for users like BA 1059)
        // but they will have limited access to documents
        console.log(`User ${actualUserId} doesn't have a matching branch, showing all branches`);
      }
    }

    return ApiResponseHandler.success(branches);
  },
  {
    requireAuth: true
  }
);