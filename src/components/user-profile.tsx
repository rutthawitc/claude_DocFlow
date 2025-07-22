// src/components/user-profile.tsx

"use client";

import { useSession, signOut } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function UserProfile() {
  const { data: session } = useSession();

  if (!session) {
    return null;
  }

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">ข้อมูลผู้ใช้</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* ตรวจสอบว่ามีข้อมูล pwa หรือไม่ */}
        {session.user.pwa ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold">รหัสพนักงาน</h3>
                <p>{session.user.pwa.username}</p>
              </div>
              <div>
                <h3 className="font-semibold">ชื่อ-นามสกุล</h3>
                <p>
                  {session.user.pwa.firstName} {session.user.pwa.lastName}
                </p>
              </div>
              <div>
                <h3 className="font-semibold">BA</h3>
                <p>{session.user.pwa.ba}</p>
              </div>
              <div>
                <h3 className="font-semibold">Part</h3>
                <p>{session.user.pwa.part}</p>
              </div>
              <div>
                <h3 className="font-semibold">อีเมล</h3>
                <p>{session.user.pwa.email}</p>
              </div>
              <div>
                <h3 className="font-semibold">ตำแหน่ง</h3>
                <p>{session.user.pwa.position}</p>
              </div>
              <div>
                <h3 className="font-semibold">หน่วยงาน</h3>
                <p>{session.user.pwa.divName}</p>
              </div>
              <div>
                <h3 className="font-semibold">สังกัด</h3>
                <p>{session.user.pwa.depName}</p>
              </div>
              <div>
                <h3 className="font-semibold">สายงาน</h3>
                <p>{session.user.pwa.orgName}</p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">บทบาท</h3>
              <div className="flex flex-wrap gap-2">
                {session.user.pwa.roles.map((role) => (
                  <Badge key={role} variant="secondary">
                    {role}
                  </Badge>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center text-red-500">ไม่พบข้อมูลผู้ใช้งาน</div>
        )}

        <div className="pt-4">
          <Button
            variant="destructive"
            onClick={() => signOut({ callbackUrl: "/" })}
          >
            ออกจากระบบ
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
