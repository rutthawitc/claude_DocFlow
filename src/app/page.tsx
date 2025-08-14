import Link from "next/link";
import { Button } from "@/components/ui/button";
import { auth } from "@/auth";

export default async function Home() {
  const session = await auth();

  return (
    <div className="flex flex-col min-h-[calc(100vh-64px)] items-center justify-center bg-gray-50 py-12 px-4">
      <div className="text-center space-y-6 max-w-3xl">
        <h1 className="text-4xl font-bold tracking-tight sm:text-4xl">
          ระบบติดตามสถานะเอกสารเบิกจ่าย
        </h1>
        <p className="text-xl text-gray-600">
          ระบบนี้ช่วยให้คุณสามารถติดตามสถานะเอกสารเบิกจ่ายได้อย่างง่ายดาย
          และมีประสิทธิภาพ
        </p>
        <div className="flex justify-center gap-4">
          {session ? (
            <Link href="/dashboard">
              <Button size="lg">ไปที่แดชบอร์ด</Button>
            </Link>
          ) : (
            <Link href="/login">
              <Button size="lg">เข้าสู่ระบบ</Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
