// src/components/auth/permission-guard.tsx
"use client";

import { useAuth } from "@/context/auth-context";

type PermissionGuardProps = {
  children: React.ReactNode;
  requiredPermissions: string | string[];
  fallback?: React.ReactNode;
};

export default function PermissionGuard({
  children,
  requiredPermissions,
  fallback = null,
}: PermissionGuardProps) {
  const { hasPermission } = useAuth();

  const hasAccess = hasPermission(requiredPermissions);

  if (!hasAccess) {
    return fallback;
  }

  return <>{children}</>;
}
