"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, Database, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

// Server action to check database connection
async function checkDatabaseConnection() {
  try {
    const response = await fetch('/api/check-db-connection');
    const data = await response.json();
    
    if (data.success) {
      return { success: true, message: data.message };
    } else {
      return { success: false, message: data.error || 'เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล' };
    }
  } catch (error) {
    console.error('Database connection check error:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล' 
    };
  }
}

export function DatabaseConnectionCheck() {
  const [isChecking, setIsChecking] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    checked: boolean;
    success?: boolean;
    message?: string;
  }>({ checked: false });

  const handleCheckConnection = async () => {
    setIsChecking(true);
    setConnectionStatus({ checked: false });
    
    try {
      const result = await checkDatabaseConnection();
      
      setConnectionStatus({
        checked: true,
        success: result.success,
        message: result.message
      });
      
      if (result.success) {
        toast.success("การเชื่อมต่อฐานข้อมูลสำเร็จ");
      } else {
        toast.error(`การเชื่อมต่อฐานข้อมูลล้มเหลว: ${result.message}`);
      }
    } catch (error) {
      setConnectionStatus({
        checked: true,
        success: false,
        message: error instanceof Error ? error.message : 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ'
      });
      
      toast.error("เกิดข้อผิดพลาดในการตรวจสอบการเชื่อมต่อฐานข้อมูล");
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="space-y-4">
      <Button 
        onClick={handleCheckConnection}
        disabled={isChecking}
        variant="default"
        className="w-full"
      >
        {isChecking ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            กำลังตรวจสอบการเชื่อมต่อ...
          </>
        ) : (
          <>
            <Database className="mr-2 h-4 w-4" />
            ตรวจสอบการเชื่อมต่อฐานข้อมูล
          </>
        )}
      </Button>
      
      {connectionStatus.checked && (
        <div className={`flex items-center p-3 rounded-md text-sm ${
          connectionStatus.success 
            ? "bg-green-50 text-green-700 border border-green-200" 
            : "bg-red-50 text-red-700 border border-red-200"
        }`}>
          {connectionStatus.success ? (
            <CheckCircle className="h-4 w-4 mr-2 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
          )}
          <span>{connectionStatus.message}</span>
        </div>
      )}
    </div>
  );
}
