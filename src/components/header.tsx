// src/components/header.tsx

import Link from "next/link";
import { auth, signOut } from "@/auth";
import { Button } from "@/components/ui/button";

export async function Header() {
  const session = await auth();

  // Check if user has admin role
  const isAdmin = session?.user.pwa?.roles?.includes("admin");
  
  // Check DocFlow permissions
  const userRoles = session?.user.pwa?.roles || [];
  const canUpload = userRoles.includes('uploader') || userRoles.includes('admin') || userRoles.includes('user');
  const canViewDocuments = userRoles.includes('branch_user') || userRoles.includes('branch_manager') || 
                           userRoles.includes('admin') || userRoles.includes('uploader') || userRoles.includes('user');

  return (
    <header className="bg-white shadow">
      <div className="container mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
        <Link href="/" className="text-xl font-bold">
          DocFlow System
        </Link>

        <nav className="flex flex-wrap gap-2 md:gap-4 items-center">
          <Link href="/" className="hover:underline">
            หน้าหลัก
          </Link>

          {session ? (
            <>
              <Link href="/dashboard" className="hover:underline">
                แดชบอร์ด
              </Link>

              {canViewDocuments && (
                <Link href="/documents" className="hover:underline text-blue-600">
                  เอกสาร
                </Link>
              )}

              {canUpload && (
                <Link href="/documents/upload" className="hover:underline text-green-600">
                  อัปโหลด
                </Link>
              )}

              {isAdmin && (
                <Link href="/admin" className="hover:underline text-indigo-600">
                  จัดการระบบ
                </Link>
              )}

              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <Button type="submit" variant="outline" size="sm">
                  ออกจากระบบ
                </Button>
              </form>
            </>
          ) : (
            <Link href="/login">
              <Button size="sm">เข้าสู่ระบบ</Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
