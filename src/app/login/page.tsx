// src/app/login/page.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { LoginFormServer } from "@/components/auth/login-form-server";
import { useSession } from "next-auth/react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { AlertCircle, Clock } from "lucide-react";

function LoginContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [redirectAttempted, setRedirectAttempted] = useState(false);
  const [isClient, setIsClient] = useState(false);
  
  // Two-pass rendering strategy to prevent hydration mismatch
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // Check for timeout-related query parameters only after client mount
  const expired = isClient ? searchParams.get('expired') : null;
  const idle = isClient ? searchParams.get('idle') : null;

  useEffect(() => {
    if (!isClient) return; // Only run on client side
    
    // เพิ่ม log เพื่อตรวจสอบสถานะและค่า session
    console.log('Current auth status:', status, 'Path:', pathname);
    console.log('Session data:', JSON.stringify(session));
    
    // เมื่อสถานะการตรวจสอบเสร็จแล้ว ให้กำหนด loading เป็น false
    if (status !== 'loading') {
      setLoading(false);
    }
    
    // ถ้ามี session (ล็อกอินแล้ว) ให้เปลี่ยนเส้นทางไปที่ documents
    if (session && !redirectAttempted) {
      console.log('User is logged in, redirecting to documents');
      setRedirectAttempted(true);
      
      // ใช้ window.location.href เพื่อทำการ full page redirect แทนการใช้ router.push
      // ซึ่งจะเป็นการบังคับให้เปลี่ยนเส้นทางอย่างแน่นอน
      window.location.href = '/documents';
    } else if (status === 'unauthenticated') {
      console.log('User is not authenticated');
    }
  }, [session, status, router, pathname, redirectAttempted, isClient]);

  // แสดงข้อความกำลังโหลดในขณะที่กำลังตรวจสอบสถานะ session หรือรอ client mount
  if (loading || !isClient) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8 text-center">
          <p>กำลังตรวจสอบสถานะการเข้าสู่ระบบ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h1 className="text-center text-3xl font-bold tracking-tight">
            PWA Authentication System
          </h1>
        </div>
        
        {/* Session timeout messages */}
        {expired && (
          <div className="rounded-md bg-amber-50 p-4 border border-amber-200">
            <div className="flex items-center">
              <Clock className="h-5 w-5 text-amber-400 mr-2" />
              <div className="text-sm text-amber-800">
                <p className="font-medium">เซสชันหมดอายุแล้ว</p>
                <p>กรุณาเข้าสู่ระบบอีกครั้ง</p>
              </div>
            </div>
          </div>
        )}
        
        {idle && (
          <div className="rounded-md bg-blue-50 p-4 border border-blue-200">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-blue-400 mr-2" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">เซสชันหมดอายุเนื่องจากไม่มีการใช้งาน</p>
                <p>กรุณาเข้าสู่ระบบอีกครั้ง</p>
              </div>
            </div>
          </div>
        )}
        
        <LoginFormServer />
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8 text-center">
          <p>กำลังโหลด...</p>
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
