"use client";

import { useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";

type RoleGuardProps = {
  children: React.ReactNode;
  allowedRoles?: string[];
  requiredPermissions?: string[];
  fallbackPath?: string;
};

export default function RoleGuard({
  children,
  allowedRoles = [],
  requiredPermissions = [],
  fallbackPath = "/",
}: RoleGuardProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Skip if still loading
    if (isLoading) return;

    // Redirect if not authenticated
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    // Check role access
    if (allowedRoles.length > 0) {
      // ตรวจสอบสิทธิ์จาก user.pwa.roles ตามโครงสร้างข้อมูลใหม่
      console.log('RoleGuard: User data:', user);
      console.log('RoleGuard: Checking for roles:', allowedRoles);
      
      const userRoles = user?.pwa?.roles || [];
      console.log('RoleGuard: User roles:', userRoles);
      
      const hasAllowedRole = allowedRoles.some((role) =>
        userRoles.includes(role)
      );

      if (!hasAllowedRole) {
        console.log('RoleGuard: User does not have required roles, redirecting to', fallbackPath);
        router.push(fallbackPath);
        return;
      }
    }

    // Check permission access
    if (requiredPermissions.length > 0) {
      console.log('RoleGuard: Checking for permissions:', requiredPermissions);
      
      // ตรวจสอบสิทธิ์จาก user.pwa.permissions ตามโครงสร้างข้อมูลใหม่
      const userPermissions = user?.pwa?.permissions || [];
      console.log('RoleGuard: User permissions:', userPermissions);
      
      const hasAllRequiredPermissions = requiredPermissions.every(
        (permission) => userPermissions.includes(permission)
      );

      console.log('RoleGuard: Has all required permissions:', hasAllRequiredPermissions);
      
      if (!hasAllRequiredPermissions) {
        console.log('RoleGuard: User does not have required permissions, redirecting to', fallbackPath);
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
