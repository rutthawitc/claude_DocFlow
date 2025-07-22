"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.middleware = middleware;
const server_1 = require("next/server");
const auth_1 = require("@/auth");
async function middleware(request) {
    const session = await (0, auth_1.auth)();
    // Define protected routes and their required roles/permissions
    const protectedRoutes = [
        {
            path: '/dashboard',
            requiredPermissions: ['dashboard:access']
        },
        {
            path: '/admin',
            requiredRoles: ['admin']
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
    // If the route is not protected, continue
    if (!matchedRoute) {
        return server_1.NextResponse.next();
    }
    // If user is not authenticated, redirect to login
    if (!session) {
        const redirectUrl = new URL('/login', request.url);
        redirectUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
        return server_1.NextResponse.redirect(redirectUrl);
    }
    // Check role-based access
    if (matchedRoute.requiredRoles && Array.isArray(matchedRoute.requiredRoles)) {
        const hasRequiredRole = matchedRoute.requiredRoles.some(role => session.user.roles.includes(role));
        if (!hasRequiredRole) {
            return server_1.NextResponse.redirect(new URL('/unauthorized', request.url));
        }
    }
    // Check permission-based access
    if (matchedRoute.requiredPermissions && Array.isArray(matchedRoute.requiredPermissions)) {
        const hasRequiredPermissions = matchedRoute.requiredPermissions.every(permission => session.user.permissions.includes(permission));
        if (!hasRequiredPermissions) {
            return server_1.NextResponse.redirect(new URL('/unauthorized', request.url));
        }
    }
    return server_1.NextResponse.next();
}
exports.config = {
    matcher: [
        '/dashboard/:path*',
        '/admin/:path*',
        '/reports/:path*',
        '/users/:path*',
    ],
};
