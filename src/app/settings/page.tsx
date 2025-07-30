"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
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
  Shield,
  Database,
  FileText,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  MessageSquare,
  Send,
  Bot,
  TestTube,
} from "lucide-react";

export default function SettingsPage() {
  // System settings state
  const [systemSettings, setSystemSettings] = useState({
    autoBackup: true,
    maintenanceMode: false,
    debugMode: false,
    cacheEnabled: true,
    maintenanceMessage: 'ระบบอยู่ระหว่างการบำรุงรักษา กรุณากลับมาอีกครั้งในภายหลัง',
    maintenanceStartTime: '',
    maintenanceEndTime: '',
  });

  const [telegramSettings, setTelegramSettings] = useState({
    enabled: false,
    botToken: "",
    defaultChatId: "",
    notifications: {
      documentUploaded: true,
      documentSent: true,
      documentAcknowledged: true,
      documentSentBack: true,
      systemAlerts: false,
      dailyReports: true,
    },
    messageFormat: {
      includeUserName: true,
      includeBranchName: true,
      includeTimestamp: true,
    },
  });

  const [loading, setLoading] = useState({
    testConnection: false,
    testMessage: false,
    saving: false,
    loading: true, // Start with loading true
    systemAlert: false,
  });

  // Load settings when component mounts
  useEffect(() => {
    const loadSettings = async () => {
      setLoading(prev => ({ ...prev, loading: true }));
      
      try {
        // Load Telegram settings
        const telegramResponse = await fetch('/api/telegram/settings');
        const telegramResult = await telegramResponse.json();
        
        if (telegramResult.success && telegramResult.data) {
          setTelegramSettings(telegramResult.data);
          console.log('Telegram settings loaded:', telegramResult.data);
        } else if (telegramResponse.status === 403) {
          toast.error("❌ ไม่มีสิทธิ์ในการเข้าถึงการตั้งค่า Telegram");
        } else {
          console.log('No saved Telegram settings found, using defaults');
        }

        // Load System settings
        const systemResponse = await fetch('/api/system-settings');
        const systemResult = await systemResponse.json();
        
        if (systemResult.success && systemResult.data) {
          setSystemSettings(prev => ({ ...prev, ...systemResult.data }));
          console.log('System settings loaded:', systemResult.data);
        } else {
          console.log('No saved system settings found, using defaults');
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        toast.error("❌ เกิดข้อผิดพลาดในการโหลดการตั้งค่า");
      } finally {
        setLoading(prev => ({ ...prev, loading: false }));
      }
    };

    loadSettings();
  }, []);

  // Test Telegram bot connection
  const handleTestConnection = async () => {
    if (!telegramSettings.botToken) {
      toast.error("กรุณาใส่ Bot Token");
      return;
    }

    setLoading(prev => ({ ...prev, testConnection: true }));

    try {
      const response = await fetch('/api/telegram/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          botToken: telegramSettings.botToken,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`✅ เชื่อมต่อสำเร็จ!\nBot: ${result.botInfo?.name} (@${result.botInfo?.username})`);
      } else {
        toast.error(`❌ การเชื่อมต่อล้มเหลว: ${result.error}`);
      }
    } catch (error) {
      console.error('Test connection error:', error);
      toast.error("❌ เกิดข้อผิดพลาดในการทดสอบการเชื่อมต่อ");
    } finally {
      setLoading(prev => ({ ...prev, testConnection: false }));
    }
  };

  // Send test message
  const handleTestMessage = async () => {
    if (!telegramSettings.botToken) {
      toast.error("กรุณาใส่ Bot Token");
      return;
    }

    if (!telegramSettings.defaultChatId) {
      toast.error("กรุณาใส่ Chat ID");
      return;
    }

    setLoading(prev => ({ ...prev, testMessage: true }));

    try {
      const response = await fetch('/api/telegram/test-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          botToken: telegramSettings.botToken,
          chatId: telegramSettings.defaultChatId,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`✅ ส่งข้อความทดสอบสำเร็จ!\nMessage ID: ${result.messageId}`);
      } else {
        toast.error(`❌ ส่งข้อความล้มเหลว: ${result.error}`);
      }
    } catch (error) {
      console.error('Test message error:', error);
      toast.error("❌ เกิดข้อผิดพลาดในการส่งข้อความทดสอบ");
    } finally {
      setLoading(prev => ({ ...prev, testMessage: false }));
    }
  };

  // Save Telegram settings
  const handleSaveSettings = async () => {
    setLoading(prev => ({ ...prev, saving: true }));

    try {
      const response = await fetch('/api/telegram/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(telegramSettings),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("✅ บันทึกการตั้งค่า Telegram สำเร็จ!");
        
        // Reload settings to confirm they were saved
        try {
          const loadResponse = await fetch('/api/telegram/settings');
          const loadResult = await loadResponse.json();
          if (loadResult.success && loadResult.data) {
            console.log('Settings confirmed saved:', loadResult.data);
          }
        } catch (loadError) {
          console.error('Error confirming settings save:', loadError);
        }
      } else {
        toast.error(`❌ บันทึกล้มเหลว: ${result.error}`);
      }
    } catch (error) {
      console.error('Save settings error:', error);
      toast.error("❌ เกิดข้อผิดพลาดในการบันทึกการตั้งค่า");
    } finally {
      setLoading(prev => ({ ...prev, saving: false }));
    }
  };

  // Save system settings
  const handleSaveSystemSettings = async () => {
    setLoading(prev => ({ ...prev, saving: true }));

    try {
      const response = await fetch('/api/system-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(systemSettings),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("✅ บันทึกการตั้งค่าระบบสำเร็จ!");
        
        // Update local state with server response
        if (result.data) {
          setSystemSettings(prev => ({ ...prev, ...result.data }));
        }
      } else {
        toast.error(`❌ บันทึกล้มเหลว: ${result.error}`);
      }
    } catch (error) {
      console.error('Save system settings error:', error);
      toast.error("❌ เกิดข้อผิดพลาดในการบันทึกการตั้งค่าระบบ");
    } finally {
      setLoading(prev => ({ ...prev, saving: false }));
    }
  };

  // Send test system alert
  const handleTestSystemAlert = async () => {
    setLoading(prev => ({ ...prev, systemAlert: true }));

    try {
      const response = await fetch('/api/telegram/system-alert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'ทดสอบระบบแจ้งเตือน',
          message: 'นี่เป็นการทดสอบการแจ้งเตือนระบบของ DocFlow ณ วันที่ ' + new Date().toLocaleString('th-TH'),
          severity: 'info'
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("✅ ส่งการแจ้งเตือนระบบทดสอบสำเร็จ!");
      } else {
        toast.error(`❌ ส่งการแจ้งเตือนล้มเหลว: ${result.error}`);
      }
    } catch (error) {
      console.error('Test system alert error:', error);
      toast.error("❌ เกิดข้อผิดพลาดในการส่งการแจ้งเตือนทดสอบ");
    } finally {
      setLoading(prev => ({ ...prev, systemAlert: false }));
    }
  };

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
            <Button 
              size="sm" 
              onClick={handleSaveSettings}
              disabled={loading.saving}
            >
              {loading.saving ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {loading.saving ? "กำลังบันทึก..." : "บันทึก"}
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
                  <MessageSquare className="h-4 w-4" />
                  Telegram
                </button>
                <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground hover:bg-muted rounded-md">
                  <Shield className="h-4 w-4" />
                  ความปลอดภัย
                </button>
                <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground hover:bg-muted rounded-md">
                  <Database className="h-4 w-4" />
                  ระบบ
                </button>
                <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground hover:bg-muted rounded-md">
                  <FileText className="h-4 w-4" />
                  การจัดการไฟล์
                </button>
              </nav>
            </CardContent>
          </Card>

          {/* Settings Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Loading indicator */}
            {loading.loading && (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-center space-x-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>กำลังโหลดการตั้งค่า...</span>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Telegram Settings */}
            {!loading.loading && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  การตั้งค่า Telegram
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Master Enable/Disable */}
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="space-y-0.5">
                    <Label className="text-lg font-medium">
                      เปิดใช้งาน Telegram
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      เปิด/ปิดการแจ้งเตือนผ่าน Telegram ทั้งหมด
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        telegramSettings.enabled ? "default" : "secondary"
                      }
                    >
                      {telegramSettings.enabled ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                    </Badge>
                    <Switch
                      checked={telegramSettings.enabled}
                      onCheckedChange={(checked) =>
                        setTelegramSettings((prev) => ({
                          ...prev,
                          enabled: checked,
                        }))
                      }
                    />
                  </div>
                </div>

                {/* Bot Configuration (Admin Only) */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-blue-500" />
                    <Label className="text-lg font-medium">
                      การตั้งค่า Bot
                    </Label>
                    <Badge variant="outline" className="text-xs">
                      สำหรับผู้ดูแลระบบเท่านั้น
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="botToken">Bot Token</Label>
                      <Input
                        id="botToken"
                        type="password"
                        placeholder="กรอก Telegram Bot Token"
                        value={telegramSettings.botToken}
                        onChange={(e) =>
                          setTelegramSettings((prev) => ({
                            ...prev,
                            botToken: e.target.value,
                          }))
                        }
                        disabled={!telegramSettings.enabled}
                      />
                      <p className="text-xs text-muted-foreground">
                        ได้รับจาก @BotFather บน Telegram
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="chatId">Chat ID เริ่มต้น</Label>
                      <Input
                        id="chatId"
                        placeholder="กรอก Chat ID หรือ Group ID"
                        value={telegramSettings.defaultChatId}
                        onChange={(e) =>
                          setTelegramSettings((prev) => ({
                            ...prev,
                            defaultChatId: e.target.value,
                          }))
                        }
                        disabled={!telegramSettings.enabled}
                      />
                      <p className="text-xs text-muted-foreground">
                        Chat ID สำหรับส่งการแจ้งเตือนทั่วไป
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleTestConnection}
                      disabled={
                        !telegramSettings.enabled || 
                        !telegramSettings.botToken ||
                        loading.testConnection ||
                        loading.testMessage ||
                        loading.systemAlert
                      }
                    >
                      {loading.testConnection ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <TestTube className="h-4 w-4 mr-2" />
                      )}
                      {loading.testConnection ? "กำลังทดสอบ..." : "ทดสอบการเชื่อมต่อ"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleTestMessage}
                      disabled={
                        !telegramSettings.enabled || 
                        !telegramSettings.botToken ||
                        !telegramSettings.defaultChatId ||
                        loading.testConnection ||
                        loading.testMessage ||
                        loading.systemAlert
                      }
                    >
                      {loading.testMessage ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      {loading.testMessage ? "กำลังส่ง..." : "ส่งข้อความทดสอบ"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleTestSystemAlert}
                      disabled={
                        !telegramSettings.enabled || 
                        !telegramSettings.botToken ||
                        !telegramSettings.defaultChatId ||
                        !telegramSettings.notifications.systemAlerts ||
                        loading.testConnection ||
                        loading.testMessage ||
                        loading.systemAlert
                      }
                    >
                      {loading.systemAlert ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 mr-2" />
                      )}
                      {loading.systemAlert ? "กำลังส่ง..." : "ทดสอบแจ้งเตือนระบบ"}
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Notification Types */}
                <div className="space-y-4">
                  <Label className="text-lg font-medium">
                    ประเภทการแจ้งเตือน
                  </Label>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>📄 เอกสารใหม่ถูกอัปโหลด</Label>
                        <p className="text-sm text-muted-foreground">
                          แจ้งเตือนเมื่อมีเอกสารใหม่เข้าระบบ
                        </p>
                      </div>
                      <Switch
                        checked={
                          telegramSettings.notifications.documentUploaded
                        }
                        onCheckedChange={(checked) =>
                          setTelegramSettings((prev) => ({
                            ...prev,
                            notifications: {
                              ...prev.notifications,
                              documentUploaded: checked,
                            },
                          }))
                        }
                        disabled={!telegramSettings.enabled}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>📤 เอกสารส่งไปยังสาขา</Label>
                        <p className="text-sm text-muted-foreground">
                          แจ้งเตือนเมื่อเอกสารถูกส่งไปยังสาขา
                        </p>
                      </div>
                      <Switch
                        checked={telegramSettings.notifications.documentSent}
                        onCheckedChange={(checked) =>
                          setTelegramSettings((prev) => ({
                            ...prev,
                            notifications: {
                              ...prev.notifications,
                              documentSent: checked,
                            },
                          }))
                        }
                        disabled={!telegramSettings.enabled}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>✅ สาขารับทราบเอกสาร</Label>
                        <p className="text-sm text-muted-foreground">
                          แจ้งเตือนเมื่อสาขารับทราบเอกสาร
                        </p>
                      </div>
                      <Switch
                        checked={
                          telegramSettings.notifications.documentAcknowledged
                        }
                        onCheckedChange={(checked) =>
                          setTelegramSettings((prev) => ({
                            ...prev,
                            notifications: {
                              ...prev.notifications,
                              documentAcknowledged: checked,
                            },
                          }))
                        }
                        disabled={!telegramSettings.enabled}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>🔄 เอกสารส่งกลับจากสาขา</Label>
                        <p className="text-sm text-muted-foreground">
                          แจ้งเตือนเมื่อสาขาส่งเอกสารกลับ
                        </p>
                      </div>
                      <Switch
                        checked={
                          telegramSettings.notifications.documentSentBack
                        }
                        onCheckedChange={(checked) =>
                          setTelegramSettings((prev) => ({
                            ...prev,
                            notifications: {
                              ...prev.notifications,
                              documentSentBack: checked,
                            },
                          }))
                        }
                        disabled={!telegramSettings.enabled}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>⚠️ การแจ้งเตือนระบบ</Label>
                        <p className="text-sm text-muted-foreground">
                          แจ้งเตือนเหตุการณ์สำคัญของระบบ
                        </p>
                      </div>
                      <Switch
                        checked={telegramSettings.notifications.systemAlerts}
                        onCheckedChange={(checked) =>
                          setTelegramSettings((prev) => ({
                            ...prev,
                            notifications: {
                              ...prev.notifications,
                              systemAlerts: checked,
                            },
                          }))
                        }
                        disabled={!telegramSettings.enabled}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>📊 รายงานประจำวัน</Label>
                        <p className="text-sm text-muted-foreground">
                          รายงานสรุปกิจกรรมประจำวัน
                        </p>
                      </div>
                      <Switch
                        checked={telegramSettings.notifications.dailyReports}
                        onCheckedChange={(checked) =>
                          setTelegramSettings((prev) => ({
                            ...prev,
                            notifications: {
                              ...prev.notifications,
                              dailyReports: checked,
                            },
                          }))
                        }
                        disabled={!telegramSettings.enabled}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Message Format */}
                <div className="space-y-4">
                  <Label className="text-lg font-medium">รูปแบบข้อความ</Label>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>แสดงชื่อผู้ใช้</Label>
                        <p className="text-sm text-muted-foreground">
                          รวมชื่อผู้ดำเนินการในข้อความ
                        </p>
                      </div>
                      <Switch
                        checked={telegramSettings.messageFormat.includeUserName}
                        onCheckedChange={(checked) =>
                          setTelegramSettings((prev) => ({
                            ...prev,
                            messageFormat: {
                              ...prev.messageFormat,
                              includeUserName: checked,
                            },
                          }))
                        }
                        disabled={!telegramSettings.enabled}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>แสดงชื่อสาขา</Label>
                        <p className="text-sm text-muted-foreground">
                          รวมชื่อสาขาในข้อความ
                        </p>
                      </div>
                      <Switch
                        checked={
                          telegramSettings.messageFormat.includeBranchName
                        }
                        onCheckedChange={(checked) =>
                          setTelegramSettings((prev) => ({
                            ...prev,
                            messageFormat: {
                              ...prev.messageFormat,
                              includeBranchName: checked,
                            },
                          }))
                        }
                        disabled={!telegramSettings.enabled}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>แสดงเวลา</Label>
                        <p className="text-sm text-muted-foreground">
                          รวมเวลาที่เกิดเหตุการณ์
                        </p>
                      </div>
                      <Switch
                        checked={
                          telegramSettings.messageFormat.includeTimestamp
                        }
                        onCheckedChange={(checked) =>
                          setTelegramSettings((prev) => ({
                            ...prev,
                            messageFormat: {
                              ...prev.messageFormat,
                              includeTimestamp: checked,
                            },
                          }))
                        }
                        disabled={!telegramSettings.enabled}
                      />
                    </div>
                  </div>
                </div>

                {/* Preview Message */}
                {telegramSettings.enabled && (
                  <div className="space-y-2">
                    <Label>ตัวอย่างข้อความ</Label>
                    <div className="p-4 bg-gray-50 rounded-lg border text-sm font-mono">
                      <div className="text-blue-600">
                        🔔 DocFlow Notification
                      </div>
                      <div className="mt-2">
                        📄 เอกสาร MT001-2024 ถูกอัปโหลดใหม่
                        {telegramSettings.messageFormat.includeBranchName && (
                          <div>🏢 ส่งไป: กปภ.สาขาชัยภูมิ</div>
                        )}
                        {telegramSettings.messageFormat.includeUserName && (
                          <div>👤 โดย: สมหมาย ใจดี</div>
                        )}
                        {telegramSettings.messageFormat.includeTimestamp && (
                          <div>
                            🕒 เวลา: {new Date().toLocaleString("th-TH")}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            )}

            {/* System Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SettingsIcon className="h-5 w-5" />
                  การตั้งค่าระบบ
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base font-medium">การสำรองข้อมูลอัตโนมัติ</Label>
                    <p className="text-sm text-muted-foreground">
                      สำรองข้อมูลทุกวันเวลา 02:00 น.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      เปิดใช้งาน
                    </Badge>
                    <Switch
                      checked={systemSettings.autoBackup}
                      onCheckedChange={(checked) =>
                        setSystemSettings((prev) => ({
                          ...prev,
                          autoBackup: checked,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base font-medium">โหมดการบำรุงรักษา</Label>
                    <p className="text-sm text-muted-foreground">
                      ปิดระบบชั่วคราวเพื่อการบำรุงรักษา
                    </p>
                    {systemSettings.maintenanceMode && (
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="destructive" className="text-xs">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          ระบบถูกปิดใช้งาน
                        </Badge>
                        <p className="text-xs text-destructive">
                          Admin สามารถเข้าถึงด้วย ?admin=1
                        </p>
                      </div>
                    )}
                  </div>
                  <Switch
                    checked={systemSettings.maintenanceMode}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        // Show confirmation for enabling maintenance mode
                        if (window.confirm('⚠️ ต้องการเปิดโหมดการบำรุงรักษาหรือไม่?\n\nเมื่อเปิดใช้งาน ผู้ใช้ทั่วไปจะไม่สามารถเข้าถึงระบบได้\nAdmin สามารถเข้าถึงด้วย URL พารามิเตอร์ ?admin=1')) {
                          setSystemSettings((prev) => ({
                            ...prev,
                            maintenanceMode: checked,
                          }));
                        }
                      } else {
                        setSystemSettings((prev) => ({
                          ...prev,
                          maintenanceMode: checked,
                        }));
                      }
                    }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base font-medium">โหมดดีบัก</Label>
                    <p className="text-sm text-muted-foreground">
                      แสดงข้อมูลการดีบักในคอนโซล
                    </p>
                  </div>
                  <Switch
                    checked={systemSettings.debugMode}
                    onCheckedChange={(checked) =>
                      setSystemSettings((prev) => ({
                        ...prev,
                        debugMode: checked,
                      }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base font-medium">การแคชข้อมูล</Label>
                    <p className="text-sm text-muted-foreground">
                      เก็บข้อมูลชั่วคราวเพื่อเพิ่มความเร็ว
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge 
                      variant="secondary" 
                      className={systemSettings.cacheEnabled 
                        ? "bg-green-100 text-green-700 border-green-200" 
                        : "bg-red-100 text-red-700 border-red-200"
                      }
                    >
                      {systemSettings.cacheEnabled ? (
                        <CheckCircle className="h-3 w-3 mr-1" />
                      ) : (
                        <XCircle className="h-3 w-3 mr-1" />
                      )}
                      {systemSettings.cacheEnabled ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                    </Badge>
                    <Switch
                      checked={systemSettings.cacheEnabled}
                      onCheckedChange={(checked) =>
                        setSystemSettings((prev) => ({
                          ...prev,
                          cacheEnabled: checked,
                        }))
                      }
                    />
                  </div>
                </div>

                {/* Save System Settings Button */}
                <div className="pt-4 border-t">
                  <Button 
                    onClick={handleSaveSystemSettings}
                    disabled={loading.saving}
                    className="w-full"
                  >
                    {loading.saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        กำลังบันทึก...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        บันทึกการตั้งค่าระบบ
                      </>
                    )}
                  </Button>
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
                    <Input
                      type="number"
                      defaultValue="365"
                      min="30"
                      max="3650"
                    />
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
