import { withAuthHandler } from '@/lib/middleware/api-auth';
import { ApiResponseHandler } from '@/lib/middleware/api-responses';
import { LocalAdminService } from '@/lib/auth/local-admin';
import { DOCFLOW_PERMISSIONS } from '@/lib/auth/docflow-auth';

// GET - List all users
export const GET = withAuthHandler(
  async () => {
    const allUsers = await LocalAdminService.listAllUsers();
    
    return ApiResponseHandler.success({
      users: allUsers,
      total: allUsers.length
    });
  },
  {
    requiredPermissions: [DOCFLOW_PERMISSIONS.ADMIN_USERS],
    allowLocalAdmin: true
  }
);

// POST - Create new local admin user
export const POST = withAuthHandler(
  async (request) => {
    const body = await request.json();
    const { username, email, firstName, lastName, password } = body;

    if (!username || !email || !firstName || !lastName || !password) {
      return ApiResponseHandler.badRequest('Missing required fields');
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
      return ApiResponseHandler.internalError('Failed to create user');
    }

    // Remove sensitive data from response
    const { ...userResponse } = newUser;
    
    return ApiResponseHandler.success(
      userResponse, 
      'Local admin user created successfully',
      201
    );
  },
  {
    requiredPermissions: [DOCFLOW_PERMISSIONS.ADMIN_USERS],
    allowLocalAdmin: true
  }
);