/* eslint-disable @typescript-eslint/no-explicit-any */
// src/context/auth-context.tsx

"use client";

import { createContext, useContext, ReactNode } from "react";
import { useSession, SessionProvider } from "next-auth/react";

// ปรับโครงสร้าง User type ให้ตรงกับที่กำหนดใน auth.ts
type PWAUserData = {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  costCenter: string;
  ba: string;
  part: string;
  area: string;
  jobName: string;
  level: string;
  divName: string;
  depName: string;
  orgName: string;
  position: string;
  roles: string[];
  permissions: string[];
};

type User = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  pwa?: PWAUserData;
  [key: string]: any;
};

type AuthContextType = {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  hasRole: (role: string | string[]) => boolean;
  hasPermission: (permission: string | string[]) => boolean;
};

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  hasRole: () => false,
  hasPermission: () => false,
});

export function AuthContextProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <AuthProviderInternal>{children}</AuthProviderInternal>
    </SessionProvider>
  );
}

function AuthProviderInternal({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();

  // เข้าถึง roles จาก session.user.pwa.roles ตามโครงสร้างข้อมูลใหม่
  const hasRole = (role: string | string[]) => {
    console.log('Checking role access:', role);
    console.log('Session user:', session?.user);
    console.log('PWA data:', session?.user?.pwa);
    
    if (!session?.user?.pwa?.roles) {
      console.log('No roles found in session!');
      return false;
    }

    const userRoles = session.user.pwa.roles;
    console.log('User roles:', userRoles);
    
    if (Array.isArray(role)) {
      return role.some((r) => userRoles.includes(r));
    }

    return userRoles.includes(role);
  };

  // เข้าถึง permissions จาก session.user.pwa.permissions ตามโครงสร้างข้อมูลใหม่
  const hasPermission = (permission: string | string[]) => {
    console.log('Checking permission access:', permission);
    
    if (!session?.user?.pwa?.permissions) {
      console.log('No permissions found in session!');
      return false;
    }

    const userPermissions = session.user.pwa.permissions;
    console.log('User permissions:', userPermissions);
    
    if (Array.isArray(permission)) {
      return permission.some((p) => userPermissions.includes(p));
    }

    return userPermissions.includes(permission);
  };

  const value = {
    isAuthenticated: !!session,
    isLoading: status === "loading",
    user: (session?.user as User) || null,
    hasRole,
    hasPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
