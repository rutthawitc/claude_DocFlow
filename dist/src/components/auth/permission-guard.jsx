"use strict";
// src/components/auth/permission-guard.tsx
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PermissionGuard;
const auth_context_1 = require("@/context/auth-context");
function PermissionGuard({ children, requiredPermissions, fallback = null, }) {
    const { hasPermission } = (0, auth_context_1.useAuth)();
    const hasAccess = hasPermission(requiredPermissions);
    if (!hasAccess) {
        return fallback;
    }
    return <>{children}</>;
}
