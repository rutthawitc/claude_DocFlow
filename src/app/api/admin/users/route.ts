import { NextRequest, NextResponse } from 'next/server';
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

// GET - List all users
export async function GET(request: NextRequest) {
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

    // Get all users
    const allUsers = await LocalAdminService.listAllUsers();
    
    return NextResponse.json({
      success: true,
      data: {
        users: allUsers,
        total: allUsers.length
      }
    });

  } catch (error) {
    console.error('Error getting users:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new local admin user
export async function POST(request: NextRequest) {
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

    // Check if user has admin permissions or is local admin
    const hasPermission = await DocFlowAuth.hasPermission(actualUserId, DOCFLOW_PERMISSIONS.ADMIN_USERS);
    const isLocalAdmin = await LocalAdminService.isLocalAdmin(actualUserId);
    
    if (!hasPermission && !isLocalAdmin) {
      return NextResponse.json(
        { success: false, error: 'Permission denied. Admin access required.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { username, email, firstName, lastName, password } = body;

    if (!username || !email || !firstName || !lastName || !password) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create local admin user
    const newUser = await LocalAdminService.createLocalAdmin({
      username,
      email,
      firstName,
      lastName,
      password
    });

    if (!newUser) {
      return NextResponse.json(
        { success: false, error: 'Failed to create user' },
        { status: 500 }
      );
    }

    // Remove sensitive data from response
    const { ...userResponse } = newUser;
    
    return NextResponse.json({
      success: true,
      data: userResponse,
      message: 'Local admin user created successfully'
    });

  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}