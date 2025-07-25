"use client";

import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart3, 
  FileText, 
  Users, 
  Calendar,
  Download,
  Eye,
  TrendingUp,
  Building2
} from "lucide-react";

export default function ReportsPage() {
  // Mock data for demonstration
  const reportStats = {
    totalDocuments: 1247,
    pendingDocuments: 34,
    processedDocuments: 1213,
    activeBranches: 22
  };

  const branchStats = [
    { branchName: "กปภ.สาขาขอนแก่น(ชั้นพิเศษ)", baCode: "1060", documents: 89, pending: 5 },
    { branchName: "กปภ.สาขาบ้านไผ่", baCode: "1061", documents: 67, pending: 2 },
    { branchName: "กปภ.สาขาชุมแพ", baCode: "1062", documents: 45, pending: 1 },
    { branchName: "กปภ.สาขาน้ำพอง", baCode: "1063", documents: 52, pending: 3 },
    { branchName: "กปภ.สาขาชนบท", baCode: "1064", documents: 38, pending: 0 },
  ];

  const monthlyData = [
    { month: "ม.ค. 2568", documents: 95, processed: 92 },
    { month: "ก.พ. 2568", documents: 87, processed: 85 },
    { month: "มี.ค. 2568", documents: 102, processed: 98 },
    { month: "เม.ย. 2568", documents: 78, processed: 76 },
    { month: "พ.ค. 2568", documents: 91, processed: 88 },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">รายงานระบบ</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Calendar className="h-4 w-4 mr-2" />
              เลือกช่วงเวลา
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              ส่งออกรายงาน
            </Button>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">เอกสารทั้งหมด</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reportStats.totalDocuments.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                +12% จากเดือนที่แล้ว
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">รอดำเนินการ</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{reportStats.pendingDocuments}</div>
              <p className="text-xs text-muted-foreground">
                -5% จากเดือนที่แล้ว
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">ดำเนินการแล้ว</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{reportStats.processedDocuments.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                +8% จากเดือนที่แล้ว
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">สาขาที่ใช้งาน</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reportStats.activeBranches}</div>
              <p className="text-xs text-muted-foreground">
                เขต R6 ทั้งหมด
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Reports Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Branch Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                สถิติตามสาขา (5 อันดับแรก)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {branchStats.map((branch, index) => (
                  <div key={branch.baCode} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{branch.branchName}</p>
                        <p className="text-xs text-muted-foreground">BA: {branch.baCode}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{branch.documents} เอกสาร</Badge>
                      {branch.pending > 0 && (
                        <Badge variant="destructive">{branch.pending} รอ</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t">
                <Button variant="outline" size="sm" className="w-full">
                  <Eye className="h-4 w-4 mr-2" />
                  ดูรายงานเต็ม
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Trends */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                แนวโน้มรายเดือน
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {monthlyData.map((data) => (
                  <div key={data.month} className="flex items-center justify-between">
                    <div className="font-medium">{data.month}</div>
                    <div className="flex items-center gap-4">
                      <div className="text-sm text-muted-foreground">
                        รับ: {data.documents}
                      </div>
                      <div className="text-sm text-green-600">
                        ดำเนินการ: {data.processed}
                      </div>
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full" 
                          style={{ width: `${(data.processed / data.documents) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t">
                <Button variant="outline" size="sm" className="w-full">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  ดูกราฟแนวโน้ม
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Reports */}
        <Card>
          <CardHeader>
            <CardTitle>รายงานด่วน</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button variant="outline" className="h-20 flex-col">
                <FileText className="h-6 w-6 mb-2" />
                <span className="text-sm">รายงานเอกสารรายวัน</span>
              </Button>
              <Button variant="outline" className="h-20 flex-col">
                <Users className="h-6 w-6 mb-2" />
                <span className="text-sm">รายงานการใช้งานผู้ใช้</span>
              </Button>
              <Button variant="outline" className="h-20 flex-col">
                <Building2 className="h-6 w-6 mb-2" />
                <span className="text-sm">รายงานประสิทธิภาพสาขา</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle>สถานะระบบ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-3">ประสิทธิภาพระบบ</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Uptime</span>
                    <Badge variant="secondary">99.9%</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">เวลาตอบสนองเฉลี่ย</span>
                    <Badge variant="secondary">245ms</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">จำนวนไฟล์ที่เก็บ</span>
                    <Badge variant="secondary">1,247 ไฟล์</Badge>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-3">กิจกรรมล่าสุด</h4>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div>• เอกสารใหม่: 5 ไฟล์ (2 ชั่วโมงที่แล้ว)</div>
                  <div>• การรับทราบ: 12 รายการ (วันนี้)</div>
                  <div>• ส่งกลับเขต: 8 รายการ (วันนี้)</div>
                  <div>• ผู้ใช้ออนไลน์: 15 คน</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}