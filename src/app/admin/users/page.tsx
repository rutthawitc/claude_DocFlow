import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { UserManagement } from "@/components/admin/user-management";

export default async function UsersPage() {
  const session = await auth();

  const userRoles = session?.user?.pwa?.roles || [];
  const canAccessAdmin = userRoles.includes("admin") || userRoles.includes("district_manager");
  
  if (!session || !canAccessAdmin) {
    redirect("/unauthorized");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">จัดการผู้ใช้งาน</h1>
      </div>
      
      <UserManagement />
    </div>
  );
}
