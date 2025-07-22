"use strict";
/* eslint-disable @typescript-eslint/no-explicit-any */
// src/context/auth-context.tsx
"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
// src/context/auth-context.tsx
Object.defineProperty(exports, "__esModule", { value: true });
exports.useAuth = void 0;
exports.AuthContextProvider = AuthContextProvider;
const react_1 = require("react");
const react_2 = require("next-auth/react");
const AuthContext = (0, react_1.createContext)({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    hasRole: () => false,
    hasPermission: () => false,
});
function AuthContextProvider({ children }) {
    return (<react_2.SessionProvider>
      <AuthProviderInternal>{children}</AuthProviderInternal>
    </react_2.SessionProvider>);
}
function AuthProviderInternal({ children }) {
    const { data: session, status } = (0, react_2.useSession)();
    const hasRole = (role) => {
        var _a;
        if (!((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.roles))
            return false;
        if (Array.isArray(role)) {
            return role.some((r) => session.user.roles.includes(r));
        }
        return session.user.roles.includes(role);
    };
    const hasPermission = (permission) => {
        var _a;
        if (!((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.permissions))
            return false;
        if (Array.isArray(permission)) {
            return permission.some((p) => session.user.permissions.includes(p));
        }
        return session.user.permissions.includes(permission);
    };
    const value = {
        isAuthenticated: !!session,
        isLoading: status === "loading",
        user: (session === null || session === void 0 ? void 0 : session.user) || null,
        hasRole,
        hasPermission,
    };
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
const useAuth = () => (0, react_1.useContext)(AuthContext);
exports.useAuth = useAuth;
