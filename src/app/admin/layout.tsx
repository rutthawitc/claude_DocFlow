// src/app/admin/layout.tsx

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  const userRoles = session?.user?.pwa?.roles || [];
  const canAccessAdmin = userRoles.includes("admin") || userRoles.includes("district_manager");
  
  if (!session || !canAccessAdmin) {
    redirect("/unauthorized");
  }

  return (
    <DashboardLayout>
      {children}
    </DashboardLayout>
  );
}
