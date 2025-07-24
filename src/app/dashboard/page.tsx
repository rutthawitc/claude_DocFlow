"use client";

import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">ระบบจัดการเอกสาร PWA DocFlow</h1>
        </div>

        <Card>
          <CardContent className="p-8 text-center">
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold text-muted-foreground">
                ยินดีต้อนรับสู่ระบบจัดการเอกสาร
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                เริ่มต้นการทำงานของคุณด้วยการไปที่เมนูเอกสารเพื่อดูและจัดการเอกสารในระบบ
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}