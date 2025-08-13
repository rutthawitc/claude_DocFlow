import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { BranchService } from '@/lib/services/branch-service';
import { DocFlowAuth, DOCFLOW_PERMISSIONS } from '@/lib/auth/docflow-auth';
import { ApiResponse } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const username = session.user.id; // This is actually the username (11008)
    
    // Get user from database by username to get the actual numeric ID
    const { getDb } = await import('@/db');
    const { users } = await import('@/db/schema');
    const { eq } = await import('drizzle-orm');
    
    const db = await getDb();
    const user = await db.query.users.findFirst({
      where: eq(users.username, username)
    });
    
    if (!user) {
      console.error('User not found in database:', username);
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 401 }
      );
    }
    
    const actualUserId = user.id; // This is the numeric database ID
    console.log('Branch API - Username:', username);
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
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions to access branch data' },
        { status: 403 }
      );
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

    const response: ApiResponse<typeof branches> = {
      success: true,
      data: branches
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching branches:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}