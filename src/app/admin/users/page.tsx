/* eslint-disable @typescript-eslint/no-unused-vars */
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

export default async function UsersPage() {
  // เข้าถึงฐานข้อมูล
  const db = await getDb();
  if (!db) {
    throw new Error('ไม่สามารถเชื่อมต่อกับฐานข้อมูลได้');
  }

  // Fetch users with their roles
  const users = await db.query.users.findMany({
    with: {
      userRoles: {
        with: {
          role: true,
        },
      },
    },
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">จัดการผู้ใช้งาน</h1>
        <Link href="/admin/users/add">
          <Button>เพิ่มผู้ใช้งาน</Button>
        </Link>
      </div>

      <div className="bg-white rounded-md shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ชื่อผู้ใช้</TableHead>
              <TableHead>ชื่อ-นามสกุล</TableHead>
              <TableHead>อีเมล</TableHead>
              <TableHead>ตำแหน่ง</TableHead>
              <TableHead>บทบาท</TableHead>
              <TableHead className="text-right">จัดการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.username}</TableCell>
                <TableCell>
                  {user.firstName} {user.lastName}
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.position}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {user.userRoles.map((userRole) => (
                      <Badge key={userRole.roleId} variant="outline">
                        {userRole.role.name}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Link href={`/admin/users/${user.id}`}>
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
