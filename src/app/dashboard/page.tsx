"use client";

import { Suspense, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { DatabaseConnectionCheck } from "@/components/db-connection-check";
import { BarChart3, Users, FileText, ArrowUpRight, Activity } from "lucide-react";

export default function DashboardPage() {
  const [currentTime, setCurrentTime] = useState("");
  const [currentTimeOnly, setCurrentTimeOnly] = useState("");
  
  useEffect(() => {
    setCurrentTime(new Date().toLocaleString("th-TH"));
    setCurrentTimeOnly(new Date().toLocaleTimeString("th-TH"));
  }, []);
  
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">แดชบอร์ด</h1>
          <div className="text-sm text-muted-foreground">
            อัพเดทล่าสุด: {currentTime || "กำลังโหลด..."}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">ผู้ใช้งานทั้งหมด</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1,234</div>
              <p className="text-xs text-muted-foreground flex items-center mt-1">
                <span className="text-green-500 flex items-center mr-1">
                  <ArrowUpRight className="h-3 w-3 mr-1" /> 12%
                </span>
                จากเดือนที่แล้ว
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">เอกสารทั้งหมด</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">567</div>
              <p className="text-xs text-muted-foreground flex items-center mt-1">
                <span className="text-green-500 flex items-center mr-1">
                  <ArrowUpRight className="h-3 w-3 mr-1" /> 8%
                </span>
                จากเดือนที่แล้ว
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">กิจกรรมล่าสุด</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">89</div>
              <p className="text-xs text-muted-foreground flex items-center mt-1">
                <span className="text-green-500 flex items-center mr-1">
                  <ArrowUpRight className="h-3 w-3 mr-1" /> 5%
                </span>
                จากสัปดาห์ที่แล้ว
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">รายงานทั้งหมด</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">42</div>
              <p className="text-xs text-muted-foreground flex items-center mt-1">
                <span className="text-green-500 flex items-center mr-1">
                  <ArrowUpRight className="h-3 w-3 mr-1" /> 15%
                </span>
                จากเดือนที่แล้ว
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main content area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content - 2/3 width on large screens */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>กิจกรรมล่าสุด</CardTitle>
                <CardDescription>ข้อมูลกิจกรรมล่าสุดในระบบ</CardDescription>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<Skeleton className="h-[200px] w-full" />}>
                  <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map((item) => (
                      <div key={item} className="flex items-center gap-4 border-b pb-4 last:border-0 last:pb-0">
                        <div className="bg-muted h-10 w-10 rounded-full flex items-center justify-center">
                          <Users className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">กิจกรรม {item}</div>
                          <div className="text-sm text-muted-foreground">รายละเอียดกิจกรรม {item}</div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {currentTimeOnly || "กำลังโหลด..."}
                        </div>
                      </div>
                    ))}
                  </div>
                </Suspense>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - 1/3 width on large screens */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>สถานะระบบ</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="font-semibold flex items-center justify-between">
                      <span>สถานะ:</span> 
                      <span className="text-green-600">ออนไลน์</span>
                    </div>
                    <div className="font-semibold flex items-center justify-between">
                      <span>เซิร์ฟเวอร์:</span> 
                      <span className="text-green-600">ปกติ</span>
                    </div>
                    <div className="font-semibold flex items-center justify-between">
                      <span>ฐานข้อมูล:</span> 
                      <span className="text-green-600">เชื่อมต่อแล้ว</span>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <DatabaseConnectionCheck />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>งานที่ต้องทำ</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="flex items-center gap-2">
                      <div className="h-4 w-4 border rounded-sm"></div>
                      <span>งานที่ต้องทำ {item}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
