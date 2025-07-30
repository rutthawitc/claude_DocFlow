import { NextRequest, NextResponse } from 'next/server';
import { auth } from './auth';
import { rateLimiters, addRateLimitHeaders } from '@/lib/rate-limit';
import { applySecurityHeaders, applyAPISecurityHeaders } from '@/lib/security/headers';
import { validateCSRFMiddleware } from '@/lib/security/csrf';
import { SystemSettingsService } from '@/lib/services/system-settings-service';

// กำหนดค่า config สำหรับ middleware

export async function middleware(request: NextRequest) {
  // Log to both console and server logs
  console.log('🔒 MIDDLEWARE EXECUTING:', request.method, request.nextUrl.pathname);
  console.error('🔒 MIDDLEWARE EXECUTING (ERROR LOG):', request.method, request.nextUrl.pathname);
  
  // Check for maintenance mode first (before other checks)
  const isMaintenancePage = request.nextUrl.pathname === '/maintenance';
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/');
  const isAdminOverride = request.nextUrl.searchParams.get('admin') === '1';
  
  if (!isMaintenancePage && !isApiRoute && !isAdminOverride) {
    try {
      const isMaintenanceMode = await SystemSettingsService.isMaintenanceModeEnabled();
      
      if (isMaintenanceMode) {
        console.log('🚧 Maintenance mode is enabled, redirecting to maintenance page');
        const maintenanceUrl = new URL('/maintenance', request.url);
        return NextResponse.redirect(maintenanceUrl);
      }
    } catch (error) {
      console.error('Error checking maintenance mode:', error);
      // Continue without maintenance check if there's an error
    }
  }
  
  // Apply rate limiting to API routes first
  if (request.nextUrl.pathname.startsWith('/api/')) {
    try {
      let rateLimiter = rateLimiters.api; // Default API rate limiter
      
      // Use specific rate limiters for different endpoints
      if (request.nextUrl.pathname.startsWith('/api/auth/') && request.method === 'POST') {
        rateLimiter = rateLimiters.login;
      } else if (request.nextUrl.pathname.startsWith('/api/documents') && request.method === 'POST') {
        const contentType = request.headers.get('content-type');
        if (contentType?.includes('multipart/form-data')) {
          rateLimiter = rateLimiters.upload;
        }
      }
      
      // Check rate limit
      const result = await rateLimiter.checkLimit(request);
      
      if (!result.success) {
        const response = NextResponse.json(
          {
            success: false,
            error: 'Too Many Requests',
            message: 'Rate limit exceeded. Please try again later.',
            retryAfter: result.retryAfter
          },
          { status: 429 }
        );
        addRateLimitHeaders(response, result);
        return applyAPISecurityHeaders(response);
      }
      
      // Apply CSRF protection to state-changing API requests
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
        console.log('Applying CSRF protection to:', request.method, request.nextUrl.pathname);
        const csrfValidation = validateCSRFMiddleware(request);
        console.log('CSRF validation result:', csrfValidation.valid);
        if (!csrfValidation.valid && csrfValidation.response) {
          console.log('CSRF validation failed, returning 403');
          return applyAPISecurityHeaders(csrfValidation.response);
        }
      }
      
      // If this is an API route, we don't need to continue with auth checks
      // The API routes handle their own authentication
      const response = NextResponse.next();
      addRateLimitHeaders(response, result);
      return applyAPISecurityHeaders(response);
    } catch (error) {
      console.error('Rate limiting error:', error);
      // Continue without rate limiting if there's an error
    }
  }
  
  // ขั้นตอนแรก ถ้าเป็นการเรียกหน้า login และมีการเพิ่ม parameter debug=1 ให้ดำเนินการต่อโดยไม่มีการตรวจสอบ
  // เพื่อป้องกัน redirect loop ในกรณีที่มีปัญหากับการตรวจสอบสิทธิ์
  if (request.nextUrl.pathname === '/login' && request.nextUrl.searchParams.get('debug') === '1') {
    console.log('Debugging login page, skipping middleware checks');
    const response = NextResponse.next();
    return applySecurityHeaders(response);
  }
  
  // ถ้าเป็นหน้า dashboard ให้ดำเนินการต่อโดยไม่มีการตรวจสอบเพื่อแก้ปัญหา redirect loop ชั่วคราว
  if (request.nextUrl.pathname === '/dashboard') {
    console.log('Dashboard access granted without permission check');
    const response = NextResponse.next();
    return applySecurityHeaders(response);
  }
  
  const session = await auth();
  console.log('Session exists:', !!session);
  
  // Session timeout validation for authenticated routes
  if (session) {
    const now = Math.floor(Date.now() / 1000); // Current time in seconds
    const sessionExp = session.expires ? Math.floor(new Date(session.expires).getTime() / 1000) : null;
    
    // Check if session has expired (absolute timeout)
    if (sessionExp && now > sessionExp) {
      console.log('Session expired (absolute timeout), redirecting to login');
      const redirectUrl = new URL('/login', request.url);
      redirectUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
      redirectUrl.searchParams.set('expired', '1');
      return NextResponse.redirect(redirectUrl);
    }
    
    // Log session timing info
    if (sessionExp) {
      const timeLeft = sessionExp - now;
      console.log(`Session valid for ${Math.floor(timeLeft / 60)} more minutes`);
    }
  }
  
  // Define protected routes and their required roles/permissions
  const protectedRoutes = [
    { 
      path: '/admin', 
      requiredRoles: ['admin', 'district_manager'] 
    },
    { 
      path: '/reports', 
      requiredPermissions: ['reports:read'] 
    },
    { 
      path: '/users', 
      requiredPermissions: ['users:read'] 
    },
  ];
  
  // Check if the route is protected
  let matchedRoute = null;
  for (const route of protectedRoutes) {
    if (request.nextUrl.pathname.startsWith(route.path)) {
      matchedRoute = route;
      break;
    }
  }
  
  // If the route is not protected, continue with security headers
  if (!matchedRoute) {
    console.log('Route not protected, proceeding');
    const response = NextResponse.next();
    return applySecurityHeaders(response);
  }
  
  // If user is not authenticated, redirect to login
  if (!session) {
    console.log('No session found, redirecting to login');
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }
  
  console.log('Checking user roles and permissions for protected route');
  
  // Check role-based access
  if (matchedRoute.requiredRoles && Array.isArray(matchedRoute.requiredRoles)) {
    console.log('User roles:', session?.user?.pwa?.roles || 'none');
    console.log('Required roles:', matchedRoute.requiredRoles);
    
    // ตรวจสอบว่า session.user.pwa และ session.user.pwa.roles มีค่าหรือไม่
    if (!session?.user?.pwa?.roles) {
      console.log('No roles found in user session');
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
    
    const userRoles = session.user.pwa.roles;
    const hasRequiredRole = matchedRoute.requiredRoles.some(
      role => userRoles.includes(role)
    );
    
    console.log('Has required role:', hasRequiredRole);
    
    if (!hasRequiredRole) {
      console.log('User does not have required role, redirecting to unauthorized');
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }
  
  // Check permission-based access
  if (matchedRoute.requiredPermissions && Array.isArray(matchedRoute.requiredPermissions)) {
    console.log('User permissions:', session?.user?.pwa?.permissions || 'none');
    console.log('Required permissions:', matchedRoute.requiredPermissions);
    
    // ตรวจสอบว่า session.user.pwa และ session.user.pwa.permissions มีค่าหรือไม่
    if (!session?.user?.pwa?.permissions) {
      console.log('No permissions found in user session');
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
    
    const userPermissions = session.user.pwa.permissions;
    const hasRequiredPermissions = matchedRoute.requiredPermissions.every(
      permission => userPermissions.includes(permission)
    );
    
    console.log('Has required permissions:', hasRequiredPermissions);
    
    if (!hasRequiredPermissions) {
      console.log('User does not have required permissions, redirecting to unauthorized');
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }
  
  console.log('All checks passed, allowing access to protected route');
  const response = NextResponse.next();
  return applySecurityHeaders(response);
}

// กำหนดค่า config สำหรับ middleware
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};