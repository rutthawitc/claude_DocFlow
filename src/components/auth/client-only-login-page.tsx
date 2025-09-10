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
    console.log('🔍 CLIENT LOGIN PAGE - Auth status:', status, 'Path:', pathname);
    console.log('🔍 CLIENT LOGIN PAGE - Session user roles:', session?.user?.pwa?.roles);
    console.log('🔍 CLIENT LOGIN PAGE - Session user BA:', session?.user?.pwa?.ba);
    console.log('🔍 CLIENT LOGIN PAGE - Redirect attempted:', redirectAttempted);
    
    // ถ้ามี session (ล็อกอินแล้ว) ให้เปลี่ยนเส้นทางไปที่หน้าที่เหมาะสม
    if (session && !redirectAttempted) {
      console.log('✅ CLIENT LOGIN PAGE - User is logged in, determining redirect destination');
      setRedirectAttempted(true);
      
      // Get user roles from session
      const userRoles = session.user?.pwa?.roles || [];
      const userBA = session.user?.pwa?.ba;
      
      console.log('🎯 CLIENT LOGIN PAGE - User roles:', userRoles);
      console.log('🎯 CLIENT LOGIN PAGE - User BA:', userBA);
      
      // Determine redirect destination based on user role
      let redirectUrl = '/documents'; // Default fallback
      
      // Priority order: admin > district_manager > branch users (including managers)
      if (userRoles.includes('admin')) {
        redirectUrl = '/documents';
        console.log('🚀 CLIENT LOGIN PAGE - Redirecting admin to documents overview');
      } else if (userRoles.includes('district_manager')) {
        redirectUrl = '/documents';
        console.log('🚀 CLIENT LOGIN PAGE - Redirecting district manager to documents overview');
      } else if ((userRoles.includes('branch_user') || userRoles.includes('branch_manager')) && userBA) {
        // All branch users (including branch managers) go to their specific branch
        redirectUrl = `/documents/branch/${userBA}`;
        console.log('🚀 CLIENT LOGIN PAGE - Redirecting branch user/manager to their branch:', redirectUrl);
      } else {
        // Default for other roles (uploader, etc.)
        console.log('🚀 CLIENT LOGIN PAGE - Redirecting to default documents page');
      }
      
      console.log('🎯 CLIENT LOGIN PAGE - Final redirect URL:', redirectUrl);
      window.location.href = redirectUrl;
    } else if (status === 'unauthenticated') {
      console.log('❌ CLIENT LOGIN PAGE - User is not authenticated');
    } else if (session && redirectAttempted) {
      console.log('⏭️ CLIENT LOGIN PAGE - Session exists but redirect already attempted');
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
  const error = searchParams.get('error');

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
        
        {/* Authentication error messages */}
        {error && (
          <div className="rounded-md bg-red-50 p-4 border border-red-200">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
              <div className="text-sm text-red-800">
                <p className="font-medium">เข้าสู่ระบบไม่สำเร็จ</p>
                <p>
                  {error === 'CredentialsSignin' 
                    ? 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบและลองอีกครั้ง' 
                    : 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองอีกครั้ง'
                  }
                </p>
              </div>
            </div>
          </div>
        )}
        
        <LoginFormServer />
      </div>
    </div>
  );
}