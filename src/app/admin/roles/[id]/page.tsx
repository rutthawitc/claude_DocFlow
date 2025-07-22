// src/app/admin/roles/[id]/page.tsx
import { getDb } from "@/db";
import * as schema from "@/db/schema";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RoleForm } from "@/components/admin/role-form";

export default async function EditRolePage({
  params,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const roleId = parseInt(id);

  if (isNaN(roleId)) {
    notFound();
  }

  // เข้าถึงฐานข้อมูล
  const db = await getDb();
  if (!db) {
    throw new Error('ไม่สามารถเชื่อมต่อกับฐานข้อมูลได้');
  }

  // Fetch role with its permissions
  const role = await db.query.roles.findFirst({
    where: eq(schema.roles.id, roleId),
    with: {
      rolePermissions: {
        with: {
          permission: true,
        },
      },
    },
  });

  if (!role) {
    notFound();
  }

  // Fetch all permissions for the form
  const permissions = await db.query.permissions.findMany({
    orderBy: (permissions) => permissions.name,
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">แก้ไขบทบาท: {role.name}</h1>
        <Link href="/admin/roles">
          <Button variant="outline">กลับ</Button>
        </Link>
      </div>

      <div className="bg-white rounded-md shadow p-6">
        <RoleForm
          role={role}
          permissions={permissions}
          selectedPermissions={role.rolePermissions.map(
            (rp) => rp.permissionId
          )}
        />
      </div>
    </div>
  );
}
