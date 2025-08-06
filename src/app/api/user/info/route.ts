// src/app/api/user/info/route.ts

import { withAuthHandler } from '@/lib/middleware/api-auth';
import { ApiResponseHandler } from '@/lib/middleware/api-responses';
import { auth } from '@/auth';

export const GET = withAuthHandler(
  async () => {
    // Get the session to access user info
    const session = await auth();
    
    if (!session) {
      return ApiResponseHandler.unauthorized();
    }
    
    // Return user info, excluding sensitive data
    const userInfo = {
      id: session.user.id,
      username: session.user.pwa?.username,
      firstName: session.user.pwa?.firstName,
      lastName: session.user.pwa?.lastName,
      email: session.user.email,
      position: session.user.pwa?.position,
      division: session.user.pwa?.divName,
      department: session.user.pwa?.depName,
      organization: session.user.pwa?.orgName,
    };
    
    return ApiResponseHandler.success(userInfo);
  },
  {
    requireAuth: true
  }
);