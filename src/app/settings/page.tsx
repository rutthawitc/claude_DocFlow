"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Settings as SettingsIcon, 
  User, 
  Bell, 
  Shield, 
  Database,
  FileText,
  Palette,
  Globe,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle
} from "lucide-react";

export default function SettingsPage() {
  // Mock state for settings
  const [notifications, setNotifications] = useState({
    newDocuments: true,
    statusUpdates: true,
    systemAlerts: false,
    dailyReports: true
  });

  const [systemSettings, setSystemSettings] = useState({
    autoBackup: true,
    maintenanceMode: false,
    debugMode: false,
    cacheEnabled: true
  });

  const [appearance, setAppearance] = useState({
    theme: "light",
    language: "th",
    compactMode: false
  });

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">ตั้งค่าระบบ</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              รีเซ็ตการตั้งค่า
            </Button>
            <Button size="sm">
              <Save className="h-4 w-4 mr-2" />
              บันทึก
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Settings Navigation */}
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5" />
                หมวดหมู่การตั้งค่า
              </CardTitle>
            </CardHeader>
            <CardContent>
              <nav className="space-y-2">
                <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium bg-primary/10 text-primary rounded-md">
                  <User className="h-4 w-4" />
                  ข้อมูลส่วนตัว
                </button>
                <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground hover:bg-muted rounded-md">
                  <Bell className="h-4 w-4" />
                  การแจ้งเตือน
                </button>
                <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground hover:bg-muted rounded-md">
                  <Palette className="h-4 w-4" />
                  การแสดงผล
                </button>
                <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground hover:bg-muted rounded-md">
                  <Shield className="h-4 w-4" />
                  ความปลอดภัย
                </button>
                <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground hover:bg-muted rounded-md">
                  <Database className="h-4 w-4" />
                  ระบบ
                </button>
              </nav>
            </CardContent>
          </Card>

          {/* Settings Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  ข้อมูลส่วนตัว
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">ชื่อ</Label>
                    <Input id="firstName" placeholder="ชื่อ" defaultValue="สมหมาย" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">นามสกุล</Label>
                    <Input id="lastName" placeholder="นามสกุล" defaultValue="ใจดี" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">อีเมล</Label>
                  <Input id="email" type="email" placeholder="อีเมล" defaultValue="sommai@pwa.co.th" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">ตำแหน่ง</Label>
                  <Input id="position" placeholder="ตำแหน่ง" defaultValue="เจ้าหน้าที่" disabled />
                  <p className="text-xs text-muted-foreground">ข้อมูลนี้ซิงค์มาจากระบบ PWA Authentication</p>
                </div>
              </CardContent>
            </Card>

            {/* Notification Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  การแจ้งเตือน
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>เอกสารใหม่</Label>
                    <p className="text-sm text-muted-foreground">รับแจ้งเตือนเมื่อมีเอกสารใหม่</p>
                  </div>
                  <Switch 
                    checked={notifications.newDocuments}
                    onCheckedChange={(checked) => 
                      setNotifications(prev => ({ ...prev, newDocuments: checked }))
                    }
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>อัปเดตสถานะ</Label>
                    <p className="text-sm text-muted-foreground">แจ้งเตือนเมื่อสถานะเอกสารเปลี่ยนแปลง</p>
                  </div>
                  <Switch 
                    checked={notifications.statusUpdates}
                    onCheckedChange={(checked) => 
                      setNotifications(prev => ({ ...prev, statusUpdates: checked }))
                    }
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>การแจ้งเตือนระบบ</Label>
                    <p className="text-sm text-muted-foreground">แจ้งเตือนเหตุการณ์สำคัญของระบบ</p>
                  </div>
                  <Switch 
                    checked={notifications.systemAlerts}
                    onCheckedChange={(checked) => 
                      setNotifications(prev => ({ ...prev, systemAlerts: checked }))
                    }
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>รายงานประจำวัน</Label>
                    <p className="text-sm text-muted-foreground">รับรายงานสรุปกิจกรรมประจำวัน</p>
                  </div>
                  <Switch 
                    checked={notifications.dailyReports}
                    onCheckedChange={(checked) => 
                      setNotifications(prev => ({ ...prev, dailyReports: checked }))
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* Appearance Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  การแสดงผล
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>ธีม</Label>
                  <div className="flex gap-2">
                    <Button 
                      variant={appearance.theme === "light" ? "default" : "outline"} 
                      size="sm"
                      onClick={() => setAppearance(prev => ({ ...prev, theme: "light" }))}
                    >
                      สว่าง
                    </Button>
                    <Button 
                      variant={appearance.theme === "dark" ? "default" : "outline"} 
                      size="sm"
                      onClick={() => setAppearance(prev => ({ ...prev, theme: "dark" }))}
                    >
                      มืด
                    </Button>
                    <Button 
                      variant={appearance.theme === "auto" ? "default" : "outline"} 
                      size="sm"
                      onClick={() => setAppearance(prev => ({ ...prev, theme: "auto" }))}
                    >
                      อัตโนมัติ
                    </Button>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label>ภาษา</Label>
                  <div className="flex gap-2">
                    <Button 
                      variant={appearance.language === "th" ? "default" : "outline"} 
                      size="sm"
                      onClick={() => setAppearance(prev => ({ ...prev, language: "th" }))}
                    >
                      <Globe className="h-4 w-4 mr-1" />
                      ไทย
                    </Button>
                    <Button 
                      variant={appearance.language === "en" ? "default" : "outline"} 
                      size="sm"
                      onClick={() => setAppearance(prev => ({ ...prev, language: "en" }))}
                    >
                      <Globe className="h-4 w-4 mr-1" />
                      English
                    </Button>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>โหมดกะทัดรัด</Label>
                    <p className="text-sm text-muted-foreground">แสดงข้อมูลในพื้นที่น้อยลง</p>
                  </div>
                  <Switch 
                    checked={appearance.compactMode}
                    onCheckedChange={(checked) => 
                      setAppearance(prev => ({ ...prev, compactMode: checked }))
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* System Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  การตั้งค่าระบบ
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>การสำรองข้อมูลอัตโนมัติ</Label>
                    <p className="text-sm text-muted-foreground">สำรองข้อมูลทุกวันเวลา 02:00 น.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      เปิดใช้งาน
                    </Badge>
                    <Switch 
                      checked={systemSettings.autoBackup}
                      onCheckedChange={(checked) => 
                        setSystemSettings(prev => ({ ...prev, autoBackup: checked }))
                      }
                    />
                  </div>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>โหมดการบำรุงรักษา</Label>
                    <p className="text-sm text-muted-foreground">ปิดระบบชั่วคราวเพื่อการบำรุงรักษา</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {systemSettings.maintenanceMode && (
                      <Badge variant="destructive">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        ใช้งานด้วยความระมัดระวัง
                      </Badge>
                    )}
                    <Switch 
                      checked={systemSettings.maintenanceMode}
                      onCheckedChange={(checked) => 
                        setSystemSettings(prev => ({ ...prev, maintenanceMode: checked }))
                      }
                    />
                  </div>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>โหมดดีบัก</Label>
                    <p className="text-sm text-muted-foreground">แสดงข้อมูลการดีบักในคอนโซล</p>
                  </div>
                  <Switch 
                    checked={systemSettings.debugMode}
                    onCheckedChange={(checked) => 
                      setSystemSettings(prev => ({ ...prev, debugMode: checked }))
                    }
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>การแคชข้อมูล</Label>
                    <p className="text-sm text-muted-foreground">เก็บข้อมูลชั่วคราวเพื่อเพิ่มความเร็ว</p>
                  </div>
                  <Switch 
                    checked={systemSettings.cacheEnabled}
                    onCheckedChange={(checked) => 
                      setSystemSettings(prev => ({ ...prev, cacheEnabled: checked }))
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* File Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  การจัดการไฟล์
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>ขนาดไฟล์สูงสุด (MB)</Label>
                    <Input type="number" defaultValue="10" min="1" max="50" />
                  </div>
                  <div className="space-y-2">
                    <Label>ระยะเวลาเก็บไฟล์ (วัน)</Label>
                    <Input type="number" defaultValue="365" min="30" max="3650" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>ไดเรกทอรีเก็บไฟล์</Label>
                  <Input defaultValue="/var/www/docflow/uploads" disabled />
                  <p className="text-xs text-muted-foreground">
                    พื้นที่ใช้งาน: 2.3 GB / 10 GB (23%)
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    ทำความสะอาดไฟล์
                  </Button>
                  <Button variant="outline" size="sm">
                    <Database className="h-4 w-4 mr-2" />
                    สำรองข้อมูล
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}