// src/app/admin/permissions/page.tsx

import { getDb } from "@/db";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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

export default async function PermissionsPage() {
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
        <h1 className="text-2xl font-bold">จัดการสิทธิ์</h1>
        <Link href="/admin/permissions/add">
          <Button>เพิ่มสิทธิ์</Button>
        </Link>
      </div>

      <div className="bg-white rounded-md shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ชื่อสิทธิ์</TableHead>
              <TableHead>คำอธิบาย</TableHead>
              <TableHead className="text-right">จัดการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {permissions.map((permission) => (
              <TableRow key={permission.id}>
                <TableCell className="font-medium">{permission.name}</TableCell>
                <TableCell>{permission.description}</TableCell>
                <TableCell className="text-right">
                  <Link href={`/admin/permissions/${permission.id}`}>
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
