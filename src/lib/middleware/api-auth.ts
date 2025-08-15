import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getDb } from '@/db';
import { eq } from 'drizzle-orm';
import { users } from '@/db/schema';
import { DocFlowAuth, DOCFLOW_PERMISSIONS } from '@/lib/auth/docflow-auth';
import { LocalAdminService } from '@/lib/auth/local-admin';
import { rateLimiters, addRateLimitHeaders } from '@/lib/rate-limit';
import { z } from 'zod';
import { ValidationError, formatValidationErrors } from '@/lib/validation/middleware';

export interface AuthenticatedUser {
  sessionUserId: string; // The username from session
  databaseId: number; // The actual database ID
  user: Record<string, unknown>; // Full user object from database
}

export interface ValidatedData {
  body?: any;
  params?: any;
  query?: any;
}

export interface AuthOptions {
  requireAuth?: boolean;
  requiredPermissions?: string[];
  allowLocalAdmin?: boolean;
  requireAdminAccess?: boolean;
  rateLimit?: 'api' | 'upload' | 'login' | null; // Rate limiting type
  validation?: {
    body?: z.ZodSchema<any>;
    params?: z.ZodSchema<any>;
    query?: z.ZodSchema<any>;
  };
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
 * Validate request data based on schemas
 * Consolidates validation logic across API routes
 */
export async function validateRequest(
  request: NextRequest,
  validation: AuthOptions['validation'],
  context?: { params?: any }
): Promise<ValidatedData> {
  const validatedData: ValidatedData = {};

  try {
    // Validate body if schema provided
    if (validation?.body) {
      const contentType = request.headers.get('content-type');
      
      if (contentType?.includes('application/json')) {
        const body = await request.json();
        validatedData.body = validation.body.parse(body);
      } else if (contentType?.includes('multipart/form-data')) {
        const formData = await request.formData();
        const formObj: Record<string, any> = {};
        
        for (const [key, value] of formData.entries()) {
          if (value instanceof File) {
            formObj[key] = value;
          } else {
            if (formObj[key]) {
              if (Array.isArray(formObj[key])) {
                formObj[key].push(value);
              } else {
                formObj[key] = [formObj[key], value];
              }
            } else {
              formObj[key] = value;
            }
          }
        }
        
        validatedData.body = validation.body.parse(formObj);
      }
    }

    // Validate params if schema provided
    if (validation?.params && context?.params) {
      // Handle Next.js 15 params Promise
      const params = context.params instanceof Promise ? await context.params : context.params;
      validatedData.params = validation.params.parse(params);
    }

    // Validate query parameters if schema provided
    if (validation?.query) {
      const searchParams = request.nextUrl.searchParams;
      const queryObj: Record<string, any> = {};
      
      for (const [key, value] of searchParams.entries()) {
        queryObj[key] = value;
      }
      
      validatedData.query = validation.query.parse(queryObj);
    }

    return validatedData;
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError(error);
    }
    throw error;
  }
}

/**
 * Comprehensive authentication middleware
 * Replaces duplicated auth logic across all API routes
 */
export async function withAuth<T = any>(
  request: NextRequest,
  options: AuthOptions = {},
  context?: { params?: any }
): Promise<{ 
  user: AuthenticatedUser;
  validatedData: ValidatedData;
  error?: never;
}> {
  const {
    requireAuth = true,
    requiredPermissions = [],
    allowLocalAdmin = false,
    requireAdminAccess = false,
    rateLimit = null,
    validation
  } = options;

  try {
    // Apply rate limiting if specified
    if (rateLimit && rateLimiters[rateLimit]) {
      const rateLimitResult = await rateLimiters[rateLimit].checkLimit(request);
      if (!rateLimitResult.success) {
        throw new ApiAuthError(
          'Too Many Requests',
          429,
          'RATE_LIMIT_EXCEEDED'
        );
      }
    }

    // Perform request validation if schemas provided
    const validatedData = validation 
      ? await validateRequest(request, validation, context)
      : {};

    // Skip auth check if not required
    if (!requireAuth) {
      return { user: null as any, validatedData };
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

    return { user, validatedData };

  } catch (error) {
    if (error instanceof ApiAuthError) {
      throw error;
    }
    
    if (error instanceof ValidationError) {
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
 * Includes rate limit headers when applicable
 */
export function createAuthErrorResponse(error: ApiAuthError, request?: NextRequest, rateLimit?: string): NextResponse {
  const responseBody = {
    success: false,
    error: error.message,
    code: error.errorCode
  };

  // Add retry after header for rate limit errors
  if (error.statusCode === 429) {
    responseBody.retryAfter = 900; // 15 minutes in seconds (default)
  }

  const response = NextResponse.json(responseBody, { status: error.statusCode });

  // Add rate limit headers if it's a rate limit error
  if (error.statusCode === 429 && request && rateLimit && rateLimiters[rateLimit]) {
    rateLimiters[rateLimit].checkLimit(request).then(rateLimitResult => {
      if (!rateLimitResult.success) {
        addRateLimitHeaders(response, rateLimitResult);
      }
    }).catch(() => {
      // Ignore rate limit header errors
    });
  }

  return response;
}

/**
 * Higher-order function to wrap API route handlers with authentication
 * Usage: export const GET = withAuthHandler(async (request, { user }) => { ... })
 */
export function withAuthHandler<T = any>(
  handler: (
    request: NextRequest,
    context: { user: AuthenticatedUser; params?: any; validatedData: ValidatedData }
  ) => Promise<NextResponse>,
  options: AuthOptions = {}
) {
  return async (request: NextRequest, context?: { params?: any }): Promise<NextResponse> => {
    try {
      const { user, validatedData } = await withAuth(request, options, context);
      // Handle Next.js 15 params Promise
      const params = context?.params instanceof Promise ? await context.params : context?.params;
      return await handler(request, { user, params, validatedData });
    } catch (error) {
      if (error instanceof ApiAuthError) {
        return createAuthErrorResponse(error, request, options.rateLimit);
      }
      
      if (error instanceof ValidationError) {
        const formattedErrors = formatValidationErrors(error.errors);
        return NextResponse.json(
          {
            success: false,
            error: 'Validation failed',
            ...formattedErrors
          },
          { status: 400 }
        );
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