// src/app/admin/roles/add/page.tsx

import { getDb } from "@/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AddRoleForm } from "@/components/admin/add-role-form";

export default async function AddRolePage() {
  // เข้าถึงฐานข้อมูล
  const db = await getDb();
  if (!db) {
    throw new Error('ไม่สามารถเชื่อมต่อกับฐานข้อมูลได้');
  }
  
  // Fetch all permissions
  const permissions = await db.query.permissions.findMany({
    orderBy: (permissions) => permissions.name,
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">เพิ่มบทบาทใหม่</h1>
        <Link href="/admin/roles">
          <Button variant="outline">กลับ</Button>
        </Link>
      </div>

      <div className="bg-white rounded-md shadow p-6">
        <AddRoleForm permissions={permissions} />
      </div>
    </div>
  );
}
