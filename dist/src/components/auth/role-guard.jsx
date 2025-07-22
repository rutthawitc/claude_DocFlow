"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = RoleGuard;
const react_1 = require("react");
const auth_context_1 = require("@/context/auth-context");
const navigation_1 = require("next/navigation");
function RoleGuard({ children, allowedRoles = [], requiredPermissions = [], fallbackPath = "/", }) {
    const { user, isAuthenticated, isLoading } = (0, auth_context_1.useAuth)();
    const router = (0, navigation_1.useRouter)();
    (0, react_1.useEffect)(() => {
        // Skip if still loading
        if (isLoading)
            return;
        // Redirect if not authenticated
        if (!isAuthenticated) {
            router.push("/login");
            return;
        }
        // Check role access
        if (allowedRoles.length > 0) {
            const hasAllowedRole = allowedRoles.some((role) => user === null || user === void 0 ? void 0 : user.roles.includes(role));
            if (!hasAllowedRole) {
                router.push(fallbackPath);
                return;
            }
        }
        // Check permission access
        if (requiredPermissions.length > 0) {
            const hasAllRequiredPermissions = requiredPermissions.every((permission) => user === null || user === void 0 ? void 0 : user.permissions.includes(permission));
            if (!hasAllRequiredPermissions) {
                router.push(fallbackPath);
                return;
            }
        }
    }, [
        user,
        isAuthenticated,
        isLoading,
        router,
        allowedRoles,
        requiredPermissions,
        fallbackPath,
    ]);
    // Show nothing while authentication is in progress
    if (isLoading) {
        return null;
    }
    // If all checks pass, render children
    return <>{children}</>;
}
