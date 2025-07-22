"use client";

import { Suspense, useState, useEffect } from "react";
import { UserProfile } from "@/components/user-profile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DatabaseConnectionCheck } from "@/components/db-connection-check";

// ใช้ useSession โดยตรงแทน RoleGuard เพื่อลดความซับซ้อน

export default function ProfilePage() {
  // ใช้ state สำหรับเก็บเวลาเพื่อป้องกัน hydration error
  const [currentTime, setCurrentTime] = useState("");
  
  // ใช้ useEffect เพื่อเรียกใช้ Date เฉพาะในฝั่ง client เท่านั้น
  useEffect(() => {
    setCurrentTime(new Date().toLocaleString("th-TH"));
  }, []);
  
  // แสดงหน้า profile โดยไม่มีการตรวจสอบสิทธิ์โดยตรงในหน้านี้
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-center">โปรไฟล์</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>ข้อมูลส่วนตัว</CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<Skeleton className="h-20 w-full" />}>
              <UserProfile />
            </Suspense>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>สถานะการใช้งาน</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="font-semibold">
                  สถานะ: <span className="text-green-600">ออนไลน์</span>
                </div>
                <div className="font-semibold">
                  เข้าสู่ระบบล่าสุด:{" "}
                  <span>{currentTime || 'กำลังโหลด...'}</span>
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <DatabaseConnectionCheck />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
