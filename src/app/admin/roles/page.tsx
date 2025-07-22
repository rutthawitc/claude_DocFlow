/* eslint-disable @typescript-eslint/no-unused-vars */
// src/app/admin/roles/page.tsx

import { getDb } from "@/db";
import * as schema from "@/db/schema";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function RolesPage() {
  // เข้าถึงฐานข้อมูล
  const db = await getDb();
  if (!db) {
    throw new Error('ไม่สามารถเชื่อมต่อกับฐานข้อมูลได้');
  }
  
  // Fetch roles with their permissions
  const roles = await db.query.roles.findMany({
    with: {
      rolePermissions: {
        with: {
          permission: true,
        },
      },
    },
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">จัดการบทบาท</h1>
        <Link href="/admin/roles/add">
          <Button>เพิ่มบทบาท</Button>
        </Link>
      </div>

      <div className="bg-white rounded-md shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ชื่อบทบาท</TableHead>
              <TableHead>คำอธิบาย</TableHead>
              <TableHead>สิทธิ์</TableHead>
              <TableHead className="text-right">จัดการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.map((role) => (
              <TableRow key={role.id}>
                <TableCell className="font-medium">{role.name}</TableCell>
                <TableCell>{role.description}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {role.rolePermissions.map((rolePermission) => (
                      <Badge
                        key={rolePermission.permissionId}
                        variant="outline"
                      >
                        {rolePermission.permission.name}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Link href={`/admin/roles/${role.id}`}>
                    <Button variant="ghost" size="sm">
                      แก้ไข
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
