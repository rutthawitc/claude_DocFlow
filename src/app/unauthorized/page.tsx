// src/app/unauthorized/page.tsx

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-gray-50 py-12 px-4">
      <div className="text-center space-y-6 max-w-3xl">
        <h1 className="text-4xl font-bold tracking-tight text-red-600">
          ไม่มีสิทธิ์เข้าถึง
        </h1>
        <p className="text-xl text-gray-600">
          คุณไม่มีสิทธิ์ในการเข้าถึงหน้านี้
          โปรดติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์เพิ่มเติม
        </p>
        <div className="flex justify-center gap-4">
          <Link href="/dashboard">
            <Button variant="outline">กลับไปยังแดชบอร์ด</Button>
          </Link>
          <Link href="/">
            <Button>กลับไปยังหน้าหลัก</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
