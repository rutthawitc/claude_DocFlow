import { NextRequest, NextResponse } from 'next/server';
import { withAuthHandler } from '@/lib/middleware/api-auth';
import { LocalAdminService } from '@/lib/auth/local-admin';
import { DocFlowAuth, DOCFLOW_PERMISSIONS } from '@/lib/auth/docflow-auth';
import { getDb } from '@/db';
import { eq } from 'drizzle-orm';
import { users } from '@/db/schema';

// GET - Get specific user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get actual database user ID
    const actualUserId = await getUserDatabaseId(session.user.id);
    if (!actualUserId) {
      return NextResponse.json(
        { success: false, error: 'User not found in database' },
        { status: 404 }
      );
    }

    // Check if user has admin permissions
    const hasPermission = await DocFlowAuth.hasPermission(actualUserId, DOCFLOW_PERMISSIONS.ADMIN_USERS);
    const isLocalAdmin = await LocalAdminService.isLocalAdmin(actualUserId);
    
    if (!hasPermission && !isLocalAdmin) {
      return NextResponse.json(
        { success: false, error: 'Permission denied. Admin access required.' },
        { status: 403 }
      );
    }

    const targetUserId = parseInt(userId);
    if (isNaN(targetUserId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    const user = await LocalAdminService.getLocalAdminUser(targetUserId);
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error('Error getting user:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update user
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get actual database user ID
    const actualUserId = await getUserDatabaseId(session.user.id);
    if (!actualUserId) {
      return NextResponse.json(
        { success: false, error: 'User not found in database' },
        { status: 404 }
      );
    }

    // Check if user has admin permissions
    const hasPermission = await DocFlowAuth.hasPermission(actualUserId, DOCFLOW_PERMISSIONS.ADMIN_USERS);
    const isLocalAdmin = await LocalAdminService.isLocalAdmin(actualUserId);
    
    if (!hasPermission && !isLocalAdmin) {
      return NextResponse.json(
        { success: false, error: 'Permission denied. Admin access required.' },
        { status: 403 }
      );
    }

    const targetUserId = parseInt(userId);
    if (isNaN(targetUserId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { email, firstName, lastName, roles } = body;

    // Update basic user info
    if (email || firstName || lastName) {
      const success = await LocalAdminService.updateUser(targetUserId, {
        email,
        firstName,
        lastName
      });

      if (!success) {
        return NextResponse.json(
          { success: false, error: 'Failed to update user' },
          { status: 500 }
        );
      }
    }

    // Update roles if provided
    if (roles && Array.isArray(roles)) {
      const success = await LocalAdminService.assignRolesToUser(targetUserId, roles);
      
      if (!success) {
        return NextResponse.json(
          { success: false, error: 'Failed to update user roles' },
          { status: 500 }
        );
      }
    }

    // Get updated user data
    const updatedUser = await LocalAdminService.getLocalAdminUser(targetUserId);
    
    return NextResponse.json({
      success: true,
      data: updatedUser,
      message: 'User updated successfully'
    });

  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get actual database user ID
    const actualUserId = await getUserDatabaseId(session.user.id);
    if (!actualUserId) {
      return NextResponse.json(
        { success: false, error: 'User not found in database' },
        { status: 404 }
      );
    }

    // Check if user has admin permissions
    const hasPermission = await DocFlowAuth.hasPermission(actualUserId, DOCFLOW_PERMISSIONS.ADMIN_USERS);
    const isLocalAdmin = await LocalAdminService.isLocalAdmin(actualUserId);
    
    if (!hasPermission && !isLocalAdmin) {
      return NextResponse.json(
        { success: false, error: 'Permission denied. Admin access required.' },
        { status: 403 }
      );
    }

    const targetUserId = parseInt(userId);
    if (isNaN(targetUserId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    // Prevent deleting self
    if (targetUserId === actualUserId) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    await LocalAdminService.deleteUser(targetUserId);
    
    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}