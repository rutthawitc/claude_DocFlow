'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wrench, Clock, Home, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface MaintenanceInfo {
  message: string;
  startTime?: string;
  endTime?: string;
}

export default function MaintenancePage() {
  const [maintenanceInfo, setMaintenanceInfo] = useState<MaintenanceInfo>({
    message: 'ระบบอยู่ระหว่างการบำรุงรักษา กรุณากลับมาอีกครั้งในภายหลัง'
  });
  const [currentTime, setCurrentTime] = useState(new Date());
  const router = useRouter();

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Try to fetch maintenance info from system settings
  useEffect(() => {
    const fetchMaintenanceInfo = async () => {
      try {
        const response = await fetch('/api/system-settings');
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            setMaintenanceInfo({
              message: result.data.maintenanceMessage || maintenanceInfo.message,
              startTime: result.data.maintenanceStartTime,
              endTime: result.data.maintenanceEndTime,
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch maintenance info:', error);
      }
    };

    fetchMaintenanceInfo();
  }, []);

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    router.push('/');
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return null;
    try {
      return new Date(dateString).toLocaleString('th-TH');
    } catch {
      return dateString;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Main Maintenance Card */}
        <Card className="border-orange-200 shadow-lg">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-orange-100 rounded-full">
                <Wrench className="h-12 w-12 text-orange-600" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-gray-800 mb-2">
              ระบบอยู่ระหว่างการบำรุงรักษา
            </CardTitle>
            <Badge variant="secondary" className="bg-orange-100 text-orange-700 border-orange-200">
              <Wrench className="h-3 w-3 mr-1" />
              Maintenance Mode
            </Badge>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <p className="text-lg text-gray-600 leading-relaxed">
              {maintenanceInfo.message}
            </p>

            {/* Current Time */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">เวลาปัจจุบัน</span>
              </div>
              <p className="text-xl font-mono text-gray-800">
                {currentTime.toLocaleString('th-TH')}
              </p>
            </div>

            {/* Maintenance Schedule */}
            {(maintenanceInfo.startTime || maintenanceInfo.endTime) && (
              <div className="bg-blue-50 rounded-lg p-4 space-y-2">
                <h3 className="font-semibold text-blue-800 mb-3">ช่วงเวลาการบำรุงรักษา</h3>
                
                {maintenanceInfo.startTime && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-blue-600">เริ่มต้น:</span>
                    <span className="font-mono text-blue-800">
                      {formatTime(maintenanceInfo.startTime)}
                    </span>
                  </div>
                )}
                
                {maintenanceInfo.endTime && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-blue-600">สิ้นสุด:</span>
                    <span className="font-mono text-blue-800">
                      {formatTime(maintenanceInfo.endTime)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button 
                onClick={handleRefresh}
                variant="default"
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                รีเฟรชหน้า
              </Button>
              <Button 
                onClick={handleGoHome}
                variant="outline"
                className="flex-1 border-gray-300 hover:bg-gray-50"
              >
                <Home className="h-4 w-4 mr-2" />
                กลับหน้าหลัก
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Additional Info Card */}
        <Card className="bg-gray-50 border-gray-200">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <h3 className="font-semibold text-gray-700">DocFlow Document Management System</h3>
              <p className="text-sm text-gray-500">
                ขอบคุณสำหรับความอดทนของท่าน เราจะกลับมาให้บริการโดยเร็วที่สุด
              </p>
              <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                <span>•</span>
                <span>กปภ.ภูมิภาคที่ 6</span>
                <span>•</span>
                <span>22 สาขา</span>
                <span>•</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}