import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getDb } from '@/db';
import { eq } from 'drizzle-orm';
import { users } from '@/db/schema';
import { DocFlowAuth, DOCFLOW_PERMISSIONS } from '@/lib/auth/docflow-auth';
import { LocalAdminService } from '@/lib/auth/local-admin';

export interface AuthenticatedUser {
  sessionUserId: string; // The username from session
  databaseId: number; // The actual database ID
  user: Record<string, unknown>; // Full user object from database
}

export interface AuthOptions {
  requireAuth?: boolean;
  requiredPermissions?: string[];
  allowLocalAdmin?: boolean;
  requireAdminAccess?: boolean;
}

export class ApiAuthError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errorCode: string
  ) {
    super(message);
    this.name = 'ApiAuthError';
  }
}

/**
 * Get user database ID from session username
 * This eliminates the duplicated getUserDatabaseId function across multiple files
 */
export async function getUserDatabaseId(username: string): Promise<number | null> {
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

/**
 * Get full user object from database by username
 * Consolidated user lookup logic
 */
export async function getUserFromDatabase(username: string): Promise<Record<string, unknown> | null> {
  try {
    const db = await getDb();
    if (!db) return null;
    
    const user = await db.query.users.findFirst({
      where: eq(users.username, username)
    });
    
    return user || null;
  } catch (error) {
    console.error('Error getting user from database:', error);
    return null;
  }
}

/**
 * Authenticate user and return user information
 * Consolidates the authentication logic used across ~30 API routes
 */
export async function authenticateUser(request: NextRequest): Promise<AuthenticatedUser> {
  const session = await auth();
  
  if (!session?.user?.id) {
    throw new ApiAuthError('Authentication required', 401, 'UNAUTHORIZED');
  }

  const sessionUserId = session.user.id; // This is actually the username
  
  // Get user from database
  const user = await getUserFromDatabase(sessionUserId);
  if (!user) {
    console.error('User not found in database:', sessionUserId);
    throw new ApiAuthError('User not found in database', 401, 'USER_NOT_FOUND');
  }
  
  return {
    sessionUserId,
    databaseId: user.id,
    user
  };
}

/**
 * Check if user has required permissions
 * Consolidates permission checking logic
 */
export async function checkUserPermissions(
  userId: number,
  requiredPermissions: string[],
  allowLocalAdmin = false
): Promise<boolean> {
  try {
    // Check if user is local admin (if allowed)
    if (allowLocalAdmin) {
      const isLocalAdmin = await LocalAdminService.isLocalAdmin(userId);
      if (isLocalAdmin) return true;
    }

    // Check specific permissions
    for (const permission of requiredPermissions) {
      const hasPermission = await DocFlowAuth.hasPermission(userId, permission);
      if (hasPermission) return true;
    }

    return false;
  } catch (error) {
    console.error('Error checking user permissions:', error);
    return false;
  }
}

/**
 * Check if user has admin access (consolidated admin role checking)
 */
export async function checkAdminAccess(userId: number): Promise<boolean> {
  try {
    const hasAdminPermission = await DocFlowAuth.hasPermission(userId, DOCFLOW_PERMISSIONS.ADMIN_FULL_ACCESS);
    const hasAdminUsers = await DocFlowAuth.hasPermission(userId, DOCFLOW_PERMISSIONS.ADMIN_USERS);
    const hasSystemAdmin = await DocFlowAuth.hasPermission(userId, DOCFLOW_PERMISSIONS.ADMIN_SYSTEM);
    const isLocalAdmin = await LocalAdminService.isLocalAdmin(userId);
    
    return hasAdminPermission || hasAdminUsers || hasSystemAdmin || isLocalAdmin;
  } catch (error) {
    console.error('Error checking admin access:', error);
    return false;
  }
}

/**
 * Comprehensive authentication middleware
 * Replaces duplicated auth logic across all API routes
 */
export async function withAuth<T = any>(
  request: NextRequest,
  options: AuthOptions = {}
): Promise<{ 
  user: AuthenticatedUser;
  error?: never;
}> {
  const {
    requireAuth = true,
    requiredPermissions = [],
    allowLocalAdmin = false,
    requireAdminAccess = false
  } = options;

  try {
    // Skip auth check if not required
    if (!requireAuth) {
      return { user: null as any };
    }

    // Authenticate user
    const user = await authenticateUser(request);

    // Check admin access if required
    if (requireAdminAccess) {
      const hasAdminAccess = await checkAdminAccess(user.databaseId);
      if (!hasAdminAccess) {
        throw new ApiAuthError(
          'Permission denied. Admin access required.',
          403,
          'ADMIN_ACCESS_REQUIRED'
        );
      }
    }

    // Check specific permissions if required
    if (requiredPermissions.length > 0) {
      const hasPermission = await checkUserPermissions(
        user.databaseId,
        requiredPermissions,
        allowLocalAdmin
      );
      
      if (!hasPermission) {
        throw new ApiAuthError(
          'Insufficient permissions',
          403,
          'INSUFFICIENT_PERMISSIONS'
        );
      }
    }

    return { user };

  } catch (error) {
    if (error instanceof ApiAuthError) {
      throw error;
    }
    
    console.error('Authentication middleware error:', error);
    throw new ApiAuthError(
      'Internal authentication error',
      500,
      'INTERNAL_ERROR'
    );
  }
}

/**
 * Create standardized error response for authentication errors
 */
export function createAuthErrorResponse(error: ApiAuthError): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: error.message,
      code: error.errorCode
    },
    { status: error.statusCode }
  );
}

/**
 * Higher-order function to wrap API route handlers with authentication
 * Usage: export const GET = withAuthHandler(async (request, { user }) => { ... })
 */
export function withAuthHandler<T = any>(
  handler: (
    request: NextRequest,
    context: { user: AuthenticatedUser; params?: any }
  ) => Promise<NextResponse>,
  options: AuthOptions = {}
) {
  return async (request: NextRequest, context?: { params?: any }): Promise<NextResponse> => {
    try {
      const { user } = await withAuth(request, options);
      return await handler(request, { user, params: context?.params });
    } catch (error) {
      if (error instanceof ApiAuthError) {
        return createAuthErrorResponse(error);
      }
      
      console.error('API handler error:', error);
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

/**
 * Consolidated branch access validation
 */
export async function validateBranchAccess(
  userId: number,
  branchBaCode: string
): Promise<boolean> {
  try {
    return await DocFlowAuth.validateBranchAccess(userId, branchBaCode);
  } catch (error) {
    console.error('Error validating branch access:', error);
    return false;
  }
}