// src/app/admin/layout.tsx

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session || !session.user.pwa?.roles?.includes("admin")) {
    redirect("/unauthorized");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm">
        <div className="container mx-auto">
          <div className="flex items-center space-x-4 py-4">
            <Link href="/admin" className="font-semibold text-lg">
              Admin Dashboard
            </Link>
            <div className="ml-auto flex space-x-2">
              <Link href="/admin/users">
                <Button variant="ghost" size="sm">
                  ผู้ใช้งาน
                </Button>
              </Link>
              <Link href="/admin/roles">
                <Button variant="ghost" size="sm">
                  บทบาท
                </Button>
              </Link>
              <Link href="/admin/permissions">
                <Button variant="ghost" size="sm">
                  สิทธิ์
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">
                  กลับสู่แดชบอร์ด
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
      <div className="container mx-auto py-8">{children}</div>
    </div>
  );
}
