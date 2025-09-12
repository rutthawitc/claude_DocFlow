import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { LocalAdminService } from '@/lib/auth/local-admin';
import { DocFlowAuth, DOCFLOW_PERMISSIONS } from '@/lib/auth/docflow-auth';
import { getDb } from '@/db';
import { eq } from 'drizzle-orm';
import { users } from '@/db/schema';

// Helper function to get actual user database ID from username
async function getUserDatabaseId(username: string): Promise<number | null> {
  try {
    const db = await getDb();
    if (!db) return null;
    
    const user = await db.query.users.findFirst({
      where: eq(users.username, username)
    });
    
    return user?.id || null;
  } catch (error) {
    console.error('Error getting user database ID:', error);
    return null;
  }
}

// GET - Get all available roles
export async function GET() {
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
    const hasPermission = await DocFlowAuth.hasPermission(actualUserId, DOCFLOW_PERMISSIONS.ADMIN_ROLES);
    const isLocalAdmin = await LocalAdminService.isLocalAdmin(actualUserId);
    
    if (!hasPermission && !isLocalAdmin) {
      return NextResponse.json(
        { success: false, error: 'Permission denied. Admin access required.' },
        { status: 403 }
      );
    }

    // Get all roles
    const allRoles = await LocalAdminService.getAllRoles();
    
    return NextResponse.json({
      success: true,
      data: {
        roles: allRoles,
        total: allRoles.length
      }
    });

  } catch (error) {
    console.error('Error getting roles:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
