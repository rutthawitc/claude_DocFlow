/* eslint-disable @typescript-eslint/no-unused-vars */
// src/app/admin/page.tsx

import { Suspense } from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default async function AdminDashboardPage() {
  const session = await auth();

  if (!session || !session.user.pwa?.roles?.includes("admin")) {
    redirect("/unauthorized");
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">หน้าจัดการระบบ</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>จัดการผู้ใช้งาน</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">จัดการข้อมูลผู้ใช้งานและสิทธิ์การเข้าถึง</p>
            <Link href="/admin/users">
              <Button>จัดการผู้ใช้งาน</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>จัดการบทบาท</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">กำหนดบทบาทและสิทธิ์การเข้าถึงระบบ</p>
            <Link href="/admin/roles">
              <Button>จัดการบทบาท</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>จัดการสิทธิ์</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">กำหนดสิทธิ์การเข้าถึงฟีเจอร์ต่างๆ</p>
            <Link href="/admin/permissions">
              <Button>จัดการสิทธิ์</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
