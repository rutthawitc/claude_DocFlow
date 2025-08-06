// src/components/auth/client-only-login-page.tsx
"use client";

import { useState, useEffect } from "react";
import { LoginFormServer } from "@/components/auth/login-form-server";
import { useSession } from "next-auth/react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { AlertCircle, Clock } from "lucide-react";

export default function ClientOnlyLoginPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [redirectAttempted, setRedirectAttempted] = useState(false);
  
  useEffect(() => {
    console.log('Current auth status:', status, 'Path:', pathname);
    console.log('Session data:', JSON.stringify(session));
    
    // ถ้ามี session (ล็อกอินแล้ว) ให้เปลี่ยนเส้นทางไปที่ documents
    if (session && !redirectAttempted) {
      console.log('User is logged in, redirecting to documents');
      setRedirectAttempted(true);
      window.location.href = '/documents';
    } else if (status === 'unauthenticated') {
      console.log('User is not authenticated');
    }
  }, [session, status, router, pathname, redirectAttempted]);

  // Show loading state while session is being checked
  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8 text-center">
          <p>กำลังตรวจสอบสถานะการเข้าสู่ระบบ...</p>
        </div>
      </div>
    );
  }

  // Get search params - safe since this is client-only
  const expired = searchParams.get('expired');
  const idle = searchParams.get('idle');

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