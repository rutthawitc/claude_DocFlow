// src/app/admin/users/[id]/page.tsx
import { getDb } from "@/db";
import * as schema from "@/db/schema";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { UserRoleForm } from "@/components/admin/user-role-form";

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const userId = parseInt(id);

  if (isNaN(userId)) {
    notFound();
  }

  // เข้าถึงฐานข้อมูล
  const db = await getDb();
  if (!db) {
    throw new Error('ไม่สามารถเชื่อมต่อกับฐานข้อมูลได้');
  }

  // Fetch user with their roles
  const user = await db.query.users.findFirst({
    where: eq(schema.users.id, userId),
    with: {
      userRoles: {
        with: {
          role: true,
        },
      },
    },
  });

  if (!user) {
    notFound();
  }

  // Fetch all roles for the form
  const roles = await db.query.roles.findMany({
    orderBy: (roles) => roles.name,
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          แก้ไขผู้ใช้งาน: {user.firstName} {user.lastName}
        </h1>
        <Link href="/admin/users">
          <Button variant="outline">กลับ</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-md shadow p-4">
          <h2 className="font-semibold mb-2">ข้อมูลผู้ใช้งาน</h2>
          <div className="space-y-1 text-sm">
            <p>
              ชื่อผู้ใช้: <span className="font-medium">{user.username}</span>
            </p>
            <p>
              ชื่อ-นามสกุล:{" "}
              <span className="font-medium">
                {user.firstName} {user.lastName}
              </span>
            </p>
            <p>
              อีเมล: <span className="font-medium">{user.email}</span>
            </p>
            <p>
              ตำแหน่ง: <span className="font-medium">{user.position}</span>
            </p>
            <p>
              สังกัด: <span className="font-medium">{user.depName}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-md shadow p-6">
        <h2 className="font-semibold mb-4">จัดการบทบาท</h2>
        <UserRoleForm
          user={user}
          roles={roles}
          selectedRoles={user.userRoles.map((ur) => ur.roleId)}
        />
      </div>
    </div>
  );
}
